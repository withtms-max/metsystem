/**
 * 홈 — 비서형 타임라인 구조
 *
 * 1. 헤더 (인사·날짜·아바타)
 * 2. (관리자) 가입신청 배너 — 있을 때만
 * 3. 주간 정리 카드 — 자동 노출
 * 4. 오늘 일정 (시간순 타임라인)
 * 5. 내일 미리보기 (있을 때만)
 * 6. 이번 주 미리보기 (있을 때만)
 * 7. 빠른 액션 3개
 */

import { Ionicons } from '@expo/vector-icons';
import {
  eventTimeOf,
  getTimelineBuckets,
  type CalendarEvent,
  type TimelineBuckets,
} from '@metsystem/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { showNotification } from '@/lib/web-notifications';
import { usePendingRequests } from '@/hooks/use-pending-requests';
import { Palette, Radius, Shadow } from '@/constants/theme';
import { ProfileSheet } from '@/components/profile-sheet';
import { WeeklyCheckinCard } from '@/components/weekly-checkin-card';

function formatToday(): string {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
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

function iconForKind(kind: string): keyof typeof Ionicons.glyphMap {
  if (kind === 'ta_call') return 'call';
  if (kind === 'meeting') return 'people';
  if (kind === 'contract') return 'trophy';
  if (kind === 'memo') return 'document-text';
  if (kind === 'message') return 'chatbubble';
  if (kind === 'birthday') return 'gift';
  if (kind === 'anniversary') return 'heart';
  if (kind === 'contract_anniversary') return 'ribbon';
  if (kind === 'next_action') return 'flag';
  if (kind === 'team_event') return 'people-circle';
  if (kind === 'holiday') return 'calendar';
  if (kind === 'golden_time') return 'star';
  return 'ellipse';
}

function colorForKind(kind: string): string {
  if (kind === 'ta_call') return Palette.blue;
  if (kind === 'meeting') return Palette.green;
  if (kind === 'contract') return Palette.orange;
  if (kind === 'birthday' || kind === 'anniversary') return '#EC4899';
  if (kind === 'next_action') return Palette.primary;
  if (kind === 'team_event') return '#8B5CF6';
  if (kind === 'holiday') return Palette.red;
  return Palette.textSub;
}

export default function HomeScreen() {
  const router = useRouter();
  const { authUser, profile } = useAuth();
  const { count: pendingCount, refresh: refreshPending } = usePendingRequests();
  const [profileOpen, setProfileOpen] = useState(false);
  const [timeline, setTimeline] = useState<TimelineBuckets>({
    today: [],
    tomorrow: [],
    thisWeek: [],
  });

  const userName = profile?.name ?? '영업맨';

  const reloadTimeline = useCallback(async () => {
    if (!authUser) return;
    try {
      const buckets = await getTimelineBuckets(supabase, authUser.id);
      setTimeline(buckets);

      // 브라우저 알림 — 오늘 일정 있으면 안내 (24h dedup)
      if (buckets.today.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const first = buckets.today[0];
        showNotification(`오늘 일정 ${buckets.today.length}건`, {
          body: first.label,
          dedupKey: `today-events-${today}`,
        });
      }
    } catch (e) {
      console.warn('[home timeline] failed', e);
    }
  }, [authUser]);

  useEffect(() => {
    void reloadTimeline();
  }, [reloadTimeline]);

  useFocusEffect(
    useCallback(() => {
      void reloadTimeline();
      void refreshPending();
    }, [reloadTimeline, refreshPending]),
  );

  return (
    <View style={styles.container}>
      {/* 헤더 */}
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
        {/* (관리자) 가입 신청 배너 — 있을 때만 */}
        {pendingCount > 0 && (
          <TouchableOpacity
            style={styles.pendingBanner}
            onPress={() => router.push('/(tabs)/team' as never)}
            activeOpacity={0.85}>
            <View style={styles.pendingIcon}>
              <Ionicons name="person-add" size={13} color="#FFFFFF" />
            </View>
            <Text style={styles.pendingText}>
              팀 가입 신청 {pendingCount}건 · 승인하러 가기
            </Text>
            <Ionicons name="chevron-forward" size={14} color={Palette.red} />
          </TouchableOpacity>
        )}

        {/* 주간 정리 */}
        <WeeklyCheckinCard onChanged={reloadTimeline} />

        {/* ============================================ */}
        {/* 오늘 일정 — 메인 카드                         */}
        {/* ============================================ */}
        <View style={styles.todayCard}>
          <View style={styles.todayHead}>
            <View>
              <Text style={styles.todayTitle}>오늘 일정</Text>
              <Text style={styles.todaySub}>{formatToday()}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/pipeline' as never)}
              hitSlop={6}>
              <Ionicons name="calendar" size={18} color={Palette.primary} />
            </TouchableOpacity>
          </View>

          {timeline.today.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>오늘 잡힌 일정이 없어요</Text>
              <Text style={styles.emptySub}>
                고객 등록·다음 액션·기념일이 등록되면 여기에 자동으로 모여요
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/customer/new' as never)}>
                <Ionicons name="add" size={14} color={Palette.primary} />
                <Text style={styles.emptyBtnText}>고객 추가</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timeline}>
              {timeline.today.map((e, i) => (
                <TimelineRow
                  key={i}
                  event={e}
                  onPress={() => {
                    const id = e.meta?.customer_id;
                    if (id && typeof id === 'string') {
                      router.push({ pathname: '/customer/[id]', params: { id } });
                    }
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* ============================================ */}
        {/* 내일 미리보기                                 */}
        {/* ============================================ */}
        {timeline.tomorrow.length > 0 && (
          <View style={styles.previewCard}>
            <View style={styles.previewHead}>
              <Text style={styles.previewTitle}>내일</Text>
              <Text style={styles.previewSub}>
                {(() => {
                  const t = new Date();
                  t.setDate(t.getDate() + 1);
                  return formatDateLabel(t.toISOString().slice(0, 10));
                })()}
              </Text>
            </View>
            {timeline.tomorrow.slice(0, 3).map((e, i) => (
              <PreviewRow key={i} event={e} />
            ))}
            {timeline.tomorrow.length > 3 && (
              <Text style={styles.previewMore}>+{timeline.tomorrow.length - 3}건 더</Text>
            )}
          </View>
        )}

        {/* ============================================ */}
        {/* 이번 주 미리보기                              */}
        {/* ============================================ */}
        {timeline.thisWeek.length > 0 && (
          <View style={styles.previewCard}>
            <View style={styles.previewHead}>
              <Text style={styles.previewTitle}>이번 주</Text>
              <Text style={styles.previewSub}>{timeline.thisWeek.length}건</Text>
            </View>
            {timeline.thisWeek.slice(0, 5).map((e, i) => (
              <PreviewRow key={i} event={e} showDate />
            ))}
            {timeline.thisWeek.length > 5 && (
              <Text style={styles.previewMore}>+{timeline.thisWeek.length - 5}건 더</Text>
            )}
          </View>
        )}

        {/* 빠른 액션 */}
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

function TimelineRow({
  event,
  onPress,
}: {
  event: CalendarEvent;
  onPress: () => void;
}) {
  const time = eventTimeOf(event);
  const color = colorForKind(event.kind);
  return (
    <TouchableOpacity
      style={styles.tlRow}
      onPress={onPress}
      activeOpacity={0.7}>
      <Text style={styles.tlTime}>{time ?? '하루'}</Text>
      <View style={[styles.tlDot, { backgroundColor: color }]} />
      <View style={[styles.tlIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={iconForKind(event.kind)} size={12} color={color} />
      </View>
      <Text style={styles.tlLabel} numberOfLines={1}>
        {event.label}
      </Text>
    </TouchableOpacity>
  );
}

function PreviewRow({ event, showDate }: { event: CalendarEvent; showDate?: boolean }) {
  const time = eventTimeOf(event);
  const color = colorForKind(event.kind);
  return (
    <View style={styles.pvRow}>
      <View style={[styles.pvDot, { backgroundColor: color }]} />
      <Text style={styles.pvLabel} numberOfLines={1}>
        {event.label}
      </Text>
      <Text style={styles.pvTime}>
        {showDate ? formatDateLabel(event.date) : time ?? '하루'}
      </Text>
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

  scroll: { paddingHorizontal: 16, paddingBottom: 32 },

  // === Pending banner (manager) ===
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Radius.md,
    marginBottom: 10,
  },
  pendingIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingText: { flex: 1, fontSize: 12, fontWeight: '700', color: Palette.red },

  // === Today card ===
  todayCard: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 12,
    ...Shadow.card,
  },
  todayHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  todayTitle: { fontSize: 16, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.3 },
  todaySub: { fontSize: 11, color: Palette.textSub, marginTop: 2 },

  // === Empty state ===
  empty: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyTitle: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
  emptySub: {
    fontSize: 11,
    color: Palette.textSub,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Palette.primarySoft,
    borderRadius: Radius.pill,
    marginTop: 6,
  },
  emptyBtnText: { fontSize: 12, color: Palette.primaryDeep, fontWeight: '700' },

  // === Timeline rows ===
  timeline: { gap: 2 },
  tlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  tlTime: {
    width: 44,
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textSub,
  },
  tlDot: { width: 4, height: 4, borderRadius: 2 },
  tlIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tlLabel: { flex: 1, fontSize: 13, color: Palette.textMain, fontWeight: '500' },

  // === Preview cards ===
  previewCard: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 12,
    ...Shadow.card,
  },
  previewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  previewTitle: { fontSize: 14, fontWeight: '700', color: Palette.textMain },
  previewSub: { fontSize: 11, color: Palette.textMuted },
  pvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  pvDot: { width: 6, height: 6, borderRadius: 3 },
  pvLabel: { flex: 1, fontSize: 12, color: Palette.textMain },
  pvTime: { fontSize: 10, color: Palette.textMuted, fontWeight: '600' },
  previewMore: {
    fontSize: 10,
    color: Palette.textMuted,
    textAlign: 'right',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // === Quick actions ===
  quickRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
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
