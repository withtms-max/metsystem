import { Ionicons } from '@expo/vector-icons';
import {
  currentMonthKey,
  listStaleCustomers,
  listUpcomingActions,
  type Customer,
  type CustomerGrade,
  type PipelineCardWithCustomer,
} from '@metsystem/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useDailyCounts } from '@/hooks/use-daily-counts';
import { usePipeline } from '@/hooks/use-pipeline';
import { GradeColor, Palette, Radius, Shadow } from '@/constants/theme';
import { ProfileSheet } from '@/components/profile-sheet';

function formatToday(): string {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

function greetByTime(name: string): string {
  const h = new Date().getHours();
  if (h < 6) return `${name}님, 아직 안 주무세요?`;
  if (h < 10) return `${name}님, 오늘도 시작해볼까요`;
  if (h < 14) return `${name}님, 점심 챙기셨어요?`;
  if (h < 18) return `${name}님, 오후도 한 번 더`;
  if (h < 21) return `${name}님, 마무리 잘 챙겨요`;
  return `${name}님, 오늘 고생했어요`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { counts } = useDailyCounts();
  const { byStage } = usePipeline(currentMonthKey());
  const [profileOpen, setProfileOpen] = useState(false);
  const [staleCustomers, setStaleCustomers] = useState<Customer[]>([]);
  const [upcomingActions, setUpcomingActions] = useState<Customer[]>([]);
  const [gradeFocus, setGradeFocus] = useState<CustomerGrade | null>(null);

  const reloadIntel = useCallback(async () => {
    try {
      const grades = gradeFocus ? [gradeFocus] : (['A', 'B'] as CustomerGrade[]);
      const [stale, actions] = await Promise.all([
        listStaleCustomers(supabase, 90, grades),
        listUpcomingActions(supabase, 7),
      ]);
      setStaleCustomers(stale);
      setUpcomingActions(
        gradeFocus ? actions.filter((c) => c.grade === gradeFocus) : actions,
      );
    } catch (e) {
      console.warn('[home] intel fetch failed', e);
    }
  }, [gradeFocus]);

  useEffect(() => {
    void reloadIntel();
  }, [reloadIntel]);

  useFocusEffect(
    useCallback(() => {
      void reloadIntel();
    }, [reloadIntel]),
  );

  const userName = profile?.name ?? '영업맨';
  const meetingsDone = counts.meeting;
  const meetingsGoal = 3;
  const taDone = counts.ta;
  const taGoal = 10;

  const monthlyMeetingGoal = 15;
  const monthlyMeetingDone = useMemo(
    () => byStage('meeting_done').length + byStage('contract').length,
    [byStage],
  );
  const monthProgress = Math.min(100, (monthlyMeetingDone / monthlyMeetingGoal) * 100);

  // 오늘 만날 미팅 (meeting_scheduled 단계의 카드들)
  const todayMeetings: PipelineCardWithCustomer[] = byStage('meeting_scheduled').slice(0, 3);

  return (
    <View style={styles.container}>
      {/* Teal 헤더 */}
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.headerInner}>
          <View>
            <Text style={styles.greeting}>{greetByTime(userName)}</Text>
            <Text style={styles.subGreeting}>{formatToday()}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={20} color={Palette.textMain} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => setProfileOpen(true)}>
              <Text style={styles.avatarBtnText}>{userName.slice(0, 1)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ProfileSheet visible={profileOpen} onClose={() => setProfileOpen(false)} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 등급 포커스 칩 — 정보 과부하 방지 */}
        <View style={styles.focusRow}>
          <Text style={styles.focusLabel}>오늘 집중:</Text>
          <TouchableOpacity
            style={[styles.focusChip, gradeFocus === null && styles.focusChipActive]}
            onPress={() => setGradeFocus(null)}>
            <Text
              style={[
                styles.focusChipText,
                gradeFocus === null && styles.focusChipTextActive,
              ]}>
              전체
            </Text>
          </TouchableOpacity>
          {(['A', 'B', 'C', 'D'] as CustomerGrade[]).map((g) => {
            const color = GradeColor[g];
            const active = gradeFocus === g;
            return (
              <TouchableOpacity
                key={g}
                style={[
                  styles.focusChip,
                  active && { backgroundColor: color.bg, borderColor: color.dot },
                ]}
                onPress={() => setGradeFocus(active ? null : g)}>
                <View style={[styles.focusChipDot, { backgroundColor: color.dot }]} />
                <Text
                  style={[
                    styles.focusChipText,
                    active && { color: color.fg, fontWeight: '700' },
                  ]}>
                  {g}급
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 🎯 다음 7일 액션 — 까먹지 말기 */}
        {upcomingActions.length > 0 && (
          <TouchableOpacity
            style={styles.actionBanner}
            onPress={() =>
              router.push({
                pathname: '/customer/[id]',
                params: { id: upcomingActions[0].id },
              })
            }>
            <View style={styles.actionIcon}>
              <Ionicons name="flag" size={14} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>
                {upcomingActions[0].next_action_date} · {upcomingActions[0].name} ·{' '}
                {upcomingActions[0].next_action_text}
              </Text>
              {upcomingActions.length > 1 && (
                <Text style={styles.actionSub}>+{upcomingActions.length - 1}건 더</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={14} color={Palette.primary} />
          </TouchableOpacity>
        )}

        {/* ⏰ 90일 무연락 — A·B급 위주 */}
        {staleCustomers.length > 0 && (
          <TouchableOpacity
            style={styles.staleBanner}
            onPress={() =>
              router.push({
                pathname: '/customer/[id]',
                params: { id: staleCustomers[0].id },
              })
            }>
            <View style={[styles.actionIcon, { backgroundColor: Palette.orange }]}>
              <Ionicons name="time" size={14} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.staleTitle}>
                {staleCustomers.length}명 90일 이상 무연락 — {staleCustomers[0].grade}급{' '}
                {staleCustomers[0].name}
              </Text>
              <Text style={styles.staleSub}>이탈 전에 한 통 깔아볼까요?</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Palette.orange} />
          </TouchableOpacity>
        )}

        {/* 오늘의 미팅 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>오늘 만날 사람</Text>
            <Text style={styles.cardCount}>
              {meetingsDone}/{meetingsGoal} 완료 · 예정 {todayMeetings.length}건
            </Text>
          </View>

          {todayMeetings.length === 0 ? (
            <View style={styles.emptyInline}>
              <Text style={styles.emptyText}>오늘 잡힌 약속이 없네요</Text>
              <Text style={styles.emptyHint}>영업판에서 한 명 끌어와봐요</Text>
            </View>
          ) : (
            todayMeetings.map((m, i) => (
              <View key={m.id} style={[styles.meetingRow, i > 0 && styles.meetingDivider]}>
                <Text style={styles.meetingTime}>{['10:00', '14:00', '16:00'][i] ?? '—'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.meetingTitle}>{m.customer?.company ?? m.customer?.name ?? '—'}</Text>
                  <Text style={styles.meetingSub}>{m.customer?.name ?? ''} · {m.customer?.region_tag ?? ''}</Text>
                </View>
                <View style={styles.statusChip}>
                  <Text style={styles.statusChipText}>예정</Text>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.cardFooter}
            onPress={() => router.push('/(tabs)/pipeline')}>
            <Text style={styles.cardFooterText}>이번 달 전체 보기</Text>
            <Ionicons name="chevron-forward" size={14} color={Palette.textSub} />
          </TouchableOpacity>
        </View>

        {/* 오늘 얼마나 깠나 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>오늘 얼마나 움직였나요</Text>
            <Text style={styles.cardMeta}>{timeNow()} 기준</Text>
          </View>

          <ActivityRow
            icon="call-outline"
            label="TA 깐 횟수"
            value={taDone}
            goal={taGoal}
            color={Palette.blue}
          />
          <ActivityRow
            icon="people-outline"
            label="만난 사람"
            value={meetingsDone}
            goal={meetingsGoal}
            color={Palette.primary}
          />
        </View>

        {/* 이번 달 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>이번 달, 어디까지 왔나</Text>
            <Text style={styles.cardMeta}>{timeNow()} 기준</Text>
          </View>

          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>만나기로 한 사람</Text>
            <Text style={styles.targetValue}>
              <Text style={styles.targetBig}>{monthlyMeetingDone}</Text> / {monthlyMeetingGoal}명
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${monthProgress}%` }]} />
          </View>
          <Text style={styles.progressPercent}>{Math.round(monthProgress)}%</Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(tabs)/pipeline')}>
            <Text style={styles.primaryBtnText}>영업판 펼쳐보기</Text>
          </TouchableOpacity>
        </View>

        {/* 빠른 메뉴 — 4 columns */}
        <View style={styles.quickGrid}>
          <QuickItem
            icon="person-add-outline"
            label="명함 추가"
            onPress={() => router.push('/customer/new')}
          />
          <QuickItem
            icon="people-outline"
            label="내 고객"
            onPress={() => router.push('/(tabs)/customers')}
          />
          <QuickItem
            icon="document-text-outline"
            label="기록"
            onPress={() => router.push('/(tabs)/pipeline')}
          />
          <QuickItem icon="notifications-outline" label="알림" onPress={() => {}} />
        </View>

        {/* 알림 카드 */}
        <TouchableOpacity style={styles.noticeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>오늘 한 줄</Text>
            <Text style={styles.noticeSub}>
              {counts.contract > 0
                ? `계약 ${counts.contract}건 — 오늘 진짜 잘 하셨어요`
                : counts.meeting >= 3
                  ? '오늘 목표 다 챙겼어요. 수고했어요'
                  : counts.meeting > 0
                    ? '잘 가고 있어요. 한 명만 더!'
                    : '아직 조용해요. 한 통 깔아볼까요?'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

function timeNow(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function ActivityRow({
  icon,
  label,
  value,
  goal,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const percent = Math.min(100, (value / goal) * 100);
  return (
    <View style={styles.activityRow}>
      <View style={styles.activityLabelRow}>
        <View style={[styles.activityIcon, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
        <Text style={styles.activityLabel}>{label}</Text>
        <Text style={styles.activityValue}>
          {value} <Text style={styles.activityGoal}>/ {goal}</Text>
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function QuickItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickItem} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={20} color={Palette.primary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },

  // Header — Toss style light
  headerWrap: { backgroundColor: Palette.bg },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 8,
  },
  greeting: { color: Palette.textMain, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  subGreeting: { color: Palette.textSub, fontSize: 12, marginTop: 2, fontWeight: '500' },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  scroll: { padding: 12, paddingTop: 4 },

  // Cards — 컴팩트
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 8,
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.2 },
  cardCount: { fontSize: 11, color: Palette.textSub, fontWeight: '500' },
  cardMeta: { fontSize: 10, color: Palette.textMuted },

  // Meetings
  meetingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  meetingDivider: { borderTopWidth: 1, borderTopColor: Palette.border },
  meetingTime: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textMain,
    width: 42,
  },
  meetingTitle: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
  meetingSub: { fontSize: 11, color: Palette.textSub, marginTop: 1 },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Palette.primarySoft,
  },
  statusChipText: { fontSize: 10, fontWeight: '700', color: Palette.primaryDeep },

  emptyInline: { paddingVertical: 12, alignItems: 'center' },
  emptyText: { color: Palette.textSub, fontSize: 12, fontWeight: '500' },
  emptyHint: { color: Palette.textMuted, fontSize: 10, marginTop: 2 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  cardFooterText: { fontSize: 12, color: Palette.textSub, fontWeight: '500' },

  // Activity
  activityRow: { marginBottom: 8 },
  activityLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  activityIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
  },
  activityLabel: { flex: 1, fontSize: 12, color: Palette.textMain, fontWeight: '500' },
  activityValue: { fontSize: 14, fontWeight: '700', color: Palette.textMain },
  activityGoal: { fontSize: 11, color: Palette.textMuted, fontWeight: '400' },

  progressBar: {
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Palette.primary, borderRadius: Radius.pill },
  progressPercent: {
    textAlign: 'right',
    marginTop: 4,
    fontSize: 11,
    color: Palette.textSub,
    fontWeight: '500',
  },

  // Target
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  targetLabel: { fontSize: 12, color: Palette.textSub, fontWeight: '500' },
  targetValue: { fontSize: 12, color: Palette.textSub },
  targetBig: { fontSize: 18, fontWeight: '700', color: Palette.textMain },

  primaryBtn: {
    marginTop: 10,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },

  // Quick grid
  quickGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  quickItem: {
    flex: 1,
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    ...Shadow.card,
  },
  quickIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Palette.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickLabel: { fontSize: 10, fontWeight: '600', color: Palette.textMain },

  // Notice
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    padding: 12,
    gap: 10,
    ...Shadow.card,
  },
  noticeTitle: { fontSize: 12, fontWeight: '600', color: Palette.textMain },
  noticeSub: { fontSize: 11, color: Palette.textSub, marginTop: 2 },

  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primarySoft,
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 6,
    gap: 8,
  },
  actionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: { fontSize: 12, fontWeight: '700', color: Palette.primaryDeep },
  actionSub: { fontSize: 10, color: Palette.primary, marginTop: 2 },

  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 6,
    gap: 8,
  },
  staleTitle: { fontSize: 12, fontWeight: '700', color: Palette.orange },
  staleSub: { fontSize: 10, color: '#D97706', marginTop: 2 },

  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  focusLabel: { fontSize: 11, fontWeight: '700', color: Palette.textSub, marginRight: 4 },
  focusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  focusChipActive: { backgroundColor: Palette.textMain },
  focusChipDot: { width: 5, height: 5, borderRadius: 3 },
  focusChipText: { fontSize: 11, fontWeight: '600', color: Palette.textSub },
  focusChipTextActive: { color: '#FFFFFF' },
});

// Suppress unused — kept for future use
void GradeColor;
