/**
 * 홈 — 간결한 비서 카드 구조
 *
 * 구조:
 *  1. 헤더 (인사 + 날짜 + 알림·프로필)
 *  2. HERO 카드 (오늘 가장 중요한 한 가지)
 *  3. 오늘 KPI 4칸 (통화·미팅·계약·신규)
 *  4. 이번 달 한 줄 진척
 *  5. 빠른 액션 3개
 */

import { Ionicons } from '@expo/vector-icons';
import {
  currentMonthKey,
  listStaleCustomers,
  listUpcomingActions,
  type Customer,
  type PipelineCardWithCustomer,
} from '@metsystem/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { showNotification } from '@/lib/web-notifications';
import { useDailyCounts } from '@/hooks/use-daily-counts';
import { usePendingRequests } from '@/hooks/use-pending-requests';
import { usePipeline } from '@/hooks/use-pipeline';
import { Palette, Radius, Shadow } from '@/constants/theme';
import { ProfileSheet } from '@/components/profile-sheet';
import { QuickMarkButton } from '@/components/quick-mark-button';
import { WeeklyCheckinCard } from '@/components/weekly-checkin-card';

function formatToday(): string {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

function greetByTime(name: string): string {
  const h = new Date().getHours();
  if (h < 6) return `${name}님, 아직이세요?`;
  if (h < 10) return `${name}님, 좋은 아침`;
  if (h < 14) return `${name}님, 오늘 화이팅`;
  if (h < 18) return `${name}님, 오후도 한 번 더`;
  if (h < 21) return `${name}님, 마무리 잘 챙겨요`;
  return `${name}님, 오늘 고생했어요`;
}

interface HeroCardData {
  kind: 'pending' | 'next_action' | 'stale' | 'upcoming' | 'empty';
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  body: string;
  cta: string;
  /** 챙김 버튼이 동작할 고객 ID (있을 때만 노출) */
  targetCustomerId?: string;
  onPress: () => void;
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { counts } = useDailyCounts();
  const { byStage } = usePipeline(currentMonthKey());
  const { count: pendingCount, refresh: refreshPending } = usePendingRequests();
  const [profileOpen, setProfileOpen] = useState(false);
  const [staleCustomers, setStaleCustomers] = useState<Customer[]>([]);
  const [upcomingActions, setUpcomingActions] = useState<Customer[]>([]);

  const userName = profile?.name ?? '영업맨';
  const meetingsDone = counts.meeting;
  const taDone = counts.ta;
  const contractDone = counts.contract;

  const monthlyMeetingGoal = 15;
  const monthlyMeetingDone = useMemo(
    () => byStage('meeting_done').length + byStage('contract').length,
    [byStage],
  );
  const monthProgress = Math.min(100, (monthlyMeetingDone / monthlyMeetingGoal) * 100);

  // 오늘의 미팅 (참고용)
  const todayMeetings: PipelineCardWithCustomer[] = byStage('meeting_scheduled').slice(0, 3);

  const reloadIntel = useCallback(async () => {
    try {
      const [stale, actions] = await Promise.all([
        listStaleCustomers(supabase, 90, ['A', 'B']),
        listUpcomingActions(supabase, 7),
      ]);
      setStaleCustomers(stale);
      setUpcomingActions(actions);

      // 브라우저 알림 (24시간 dedup)
      const today = new Date().toISOString().slice(0, 10);
      const todayActions = actions.filter((c) => c.next_action_date === today);
      if (todayActions.length > 0) {
        const first = todayActions[0];
        showNotification(`오늘 ${todayActions.length}건 액션 예정`, {
          body: `${first.name} · ${first.next_action_text ?? ''}`,
          dedupKey: `actions-today-${today}`,
        });
      }
    } catch (e) {
      console.warn('[home] intel fetch failed', e);
    }
  }, []);

  useEffect(() => {
    void reloadIntel();
  }, [reloadIntel]);

  useFocusEffect(
    useCallback(() => {
      void reloadIntel();
      void refreshPending();
    }, [reloadIntel, refreshPending]),
  );

  // HERO 카드 선택 — 우선순위
  const heroCard: HeroCardData = useMemo(() => {
    // 1순위: 가입 신청 대기 (관리자)
    if (pendingCount > 0) {
      return {
        kind: 'pending',
        icon: 'person-add',
        iconColor: Palette.red,
        iconBg: '#FEF2F2',
        title: `팀 가입 신청 ${pendingCount}건`,
        body: '관리자 승인을 기다리고 있어요',
        cta: '승인하러 가기',
        onPress: () => router.push('/(tabs)/team' as never),
      };
    }

    // 2순위: 오늘 액션
    const today = new Date().toISOString().slice(0, 10);
    const todayAction = upcomingActions.find((c) => c.next_action_date === today);
    if (todayAction) {
      return {
        kind: 'next_action',
        icon: 'flag',
        iconColor: Palette.primary,
        iconBg: Palette.primarySoft,
        title: todayAction.next_action_text ?? '오늘 액션',
        body: `${todayAction.company ?? todayAction.name} · 오늘 예정`,
        cta: '시작하기',
        targetCustomerId: todayAction.id,
        onPress: () =>
          router.push({ pathname: '/customer/[id]', params: { id: todayAction.id } }),
      };
    }

    // 3순위: 90일+ 무연락 (톤다운)
    if (staleCustomers.length > 0) {
      const first = staleCustomers[0];
      return {
        kind: 'stale',
        icon: 'leaf',
        iconColor: Palette.orange,
        iconBg: Palette.orangeBg,
        title: `${first.grade}급 ${first.name}님, 한 번 챙겨볼 시간`,
        body:
          staleCustomers.length > 1
            ? `오래 못 본 분 ${staleCustomers.length}명 (앱 기록 기준)`
            : '앱 기록 기준 · 이미 챙겼다면 ✓',
        cta: '연락하기',
        targetCustomerId: first.id,
        onPress: () =>
          router.push({ pathname: '/customer/[id]', params: { id: first.id } }),
      };
    }

    // 4순위: 이번 주 액션
    if (upcomingActions.length > 0) {
      const first = upcomingActions[0];
      return {
        kind: 'upcoming',
        icon: 'calendar',
        iconColor: Palette.green,
        iconBg: Palette.greenBg,
        title: first.next_action_text ?? '예정된 액션',
        body: `${first.next_action_date} · ${first.company ?? first.name}`,
        cta: '확인',
        targetCustomerId: first.id,
        onPress: () =>
          router.push({ pathname: '/customer/[id]', params: { id: first.id } }),
      };
    }

    // 5순위 (빈 상태): 새 고객 추가 유도
    return {
      kind: 'empty',
      icon: 'add-circle',
      iconColor: Palette.primary,
      iconBg: Palette.primarySoft,
      title: '오늘 누구를 챙길까요?',
      body: '고객을 등록하면 자동으로 챙겨드려요',
      cta: '고객 추가',
      onPress: () => router.push('/customer/new' as never),
    };
  }, [pendingCount, upcomingActions, staleCustomers, router]);

  return (
    <View style={styles.container}>
      {/* 헤더 — 인사 + 날짜 + 우측 아이콘 */}
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greetByTime(userName)}</Text>
            <Text style={styles.date}>{formatToday()}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} hitSlop={6}>
              <Ionicons name="notifications-outline" size={20} color={Palette.textMain} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => setProfileOpen(true)}
              activeOpacity={0.8}>
              <Text style={styles.avatarText}>{userName.slice(0, 1)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ProfileSheet visible={profileOpen} onClose={() => setProfileOpen(false)} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 주간 정리 — 월요일·7일 단위 자동 노출 */}
        <WeeklyCheckinCard onChanged={reloadIntel} />

        {/* ============================================ */}
        {/* HERO — 오늘 가장 중요한 한 가지              */}
        {/* ============================================ */}
        <View style={styles.hero}>
          <TouchableOpacity
            style={styles.heroMain}
            onPress={heroCard.onPress}
            activeOpacity={0.85}>
            <View style={[styles.heroIcon, { backgroundColor: heroCard.iconBg }]}>
              <Ionicons name={heroCard.icon} size={22} color={heroCard.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {heroCard.title}
              </Text>
              <Text style={styles.heroBody} numberOfLines={1}>
                {heroCard.body}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Palette.textMuted} />
          </TouchableOpacity>

          {/* HERO 액션 — 메인 CTA + 챙김 보조 (무연락·이번주 액션 일 때만) */}
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroCta} onPress={heroCard.onPress}>
              <Text style={styles.heroCtaText}>{heroCard.cta}</Text>
            </TouchableOpacity>
            {(heroCard.kind === 'stale' || heroCard.kind === 'upcoming') &&
              heroCard.targetCustomerId && (
                <QuickMarkButton
                  customerId={heroCard.targetCustomerId}
                  onMarked={reloadIntel}
                />
              )}
          </View>
        </View>

        {/* ============================================ */}
        {/* 오늘 KPI                                     */}
        {/* ============================================ */}
        <Text style={styles.sectionLabel}>오늘</Text>
        <View style={styles.kpiRow}>
          <KpiTile label="통화" value={taDone} color={Palette.blue} />
          <KpiTile label="미팅" value={meetingsDone} color={Palette.green} />
          <KpiTile label="계약" value={contractDone} color={Palette.orange} />
          <KpiTile label="예정" value={todayMeetings.length} color={Palette.textSub} />
        </View>

        {/* ============================================ */}
        {/* 이번 달 진척 — 단일 컴팩트 카드              */}
        {/* ============================================ */}
        <TouchableOpacity
          style={styles.monthCard}
          onPress={() => router.push('/(tabs)/pipeline' as never)}
          activeOpacity={0.85}>
          <View style={styles.monthRow}>
            <Text style={styles.monthLabel}>이번 달 미팅</Text>
            <Text style={styles.monthValue}>
              <Text style={styles.monthBig}>{monthlyMeetingDone}</Text>
              <Text style={styles.monthGoal}> / {monthlyMeetingGoal}</Text>
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${monthProgress}%` }]} />
          </View>
        </TouchableOpacity>

        {/* ============================================ */}
        {/* 빠른 액션 3개                                 */}
        {/* ============================================ */}
        <View style={styles.quickRow}>
          <QuickTile
            icon="person-add"
            label="고객 추가"
            onPress={() => router.push('/customer/new' as never)}
          />
          <QuickTile
            icon="folder"
            label="자료실"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={() => router.push('/resources' as any)}
          />
          <QuickTile
            icon="people-circle"
            label="팀"
            onPress={() => router.push('/(tabs)/team' as never)}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function KpiTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.kpiTile}>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function QuickTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickTile} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={20} color={Palette.primary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },

  // === Header ===
  headerWrap: { backgroundColor: Palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  greeting: { color: Palette.textMain, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  date: { color: Palette.textSub, fontSize: 12, marginTop: 3, fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // === Scroll body ===
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },

  // === HERO Card ===
  hero: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 20,
    ...Shadow.card,
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.textMain,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  heroBody: {
    fontSize: 12,
    color: Palette.textSub,
    marginTop: 3,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCta: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Palette.primary,
    borderRadius: Radius.pill,
    flex: 1,
    alignItems: 'center',
  },
  heroCtaText: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },

  // === Section label ===
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textSub,
    marginBottom: 8,
    marginLeft: 4,
  },

  // === KPI tiles ===
  kpiRow: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  kpiTile: {
    flex: 1,
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    ...Shadow.card,
  },
  kpiValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  kpiLabel: { fontSize: 11, color: Palette.textSub, marginTop: 3, fontWeight: '600' },

  // === Month progress ===
  monthCard: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    ...Shadow.card,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  monthLabel: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
  monthValue: { fontSize: 13, color: Palette.textSub },
  monthBig: { fontSize: 22, fontWeight: '800', color: Palette.textMain, letterSpacing: -0.5 },
  monthGoal: { fontSize: 13, color: Palette.textMuted, fontWeight: '500' },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.grayBg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Palette.primary,
    borderRadius: 3,
  },

  // === Quick actions ===
  quickRow: { flexDirection: 'row', gap: 6 },
  quickTile: {
    flex: 1,
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    ...Shadow.card,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickLabel: { fontSize: 12, fontWeight: '600', color: Palette.textMain },
});
