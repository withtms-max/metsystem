import { Ionicons } from '@expo/vector-icons';
import { currentMonthKey, type PipelineCardWithCustomer } from '@metsystem/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { useDailyCounts } from '@/hooks/use-daily-counts';
import { usePipeline } from '@/hooks/use-pipeline';
import { GradeColor, Palette, Radius, Shadow } from '@/constants/theme';
import { ProfileSheet } from '@/components/profile-sheet';

function formatToday(): string {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { counts } = useDailyCounts();
  const { byStage } = usePipeline(currentMonthKey());
  const [profileOpen, setProfileOpen] = useState(false);

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
            <Text style={styles.greeting}>안녕하세요, {userName}님</Text>
            <Text style={styles.subGreeting}>{formatToday()}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => setProfileOpen(true)}>
              <Text style={styles.avatarBtnText}>{userName.slice(0, 1)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ProfileSheet visible={profileOpen} onClose={() => setProfileOpen(false)} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 오늘의 미팅 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>오늘의 미팅</Text>
            <Text style={styles.cardCount}>
              {todayMeetings.length}건 예정 · 목표 {meetingsGoal}건 / 완료 {meetingsDone}건
            </Text>
          </View>

          {todayMeetings.length === 0 ? (
            <View style={styles.emptyInline}>
              <Text style={styles.emptyText}>오늘 예정된 미팅이 없어요</Text>
              <Text style={styles.emptyHint}>생명수에서 미팅을 추가해보세요</Text>
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
            <Text style={styles.cardFooterText}>전체 일정 보기</Text>
            <Ionicons name="chevron-forward" size={14} color={Palette.textSub} />
          </TouchableOpacity>
        </View>

        {/* 오늘의 활동 현황 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>오늘의 활동 현황</Text>
            <Text style={styles.cardMeta}>업데이트 {timeNow()}</Text>
          </View>

          <ActivityRow
            icon="call-outline"
            label="전화 (TA)"
            value={taDone}
            goal={taGoal}
            color={Palette.blue}
          />
          <ActivityRow
            icon="people-outline"
            label="미팅"
            value={meetingsDone}
            goal={meetingsGoal}
            color={Palette.primary}
          />
        </View>

        {/* 이번 달 목표 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>이번 달 목표</Text>
            <Text style={styles.cardMeta}>업데이트 {timeNow()}</Text>
          </View>

          <View style={styles.targetRow}>
            <Text style={styles.targetLabel}>미팅 목표</Text>
            <Text style={styles.targetValue}>
              <Text style={styles.targetBig}>{monthlyMeetingDone}</Text> / {monthlyMeetingGoal}건
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${monthProgress}%` }]} />
          </View>
          <Text style={styles.progressPercent}>{Math.round(monthProgress)}%</Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(tabs)/pipeline')}>
            <Text style={styles.primaryBtnText}>성과 보드 보기</Text>
          </TouchableOpacity>
        </View>

        {/* 빠른 메뉴 — 4 columns */}
        <View style={styles.quickGrid}>
          <QuickItem
            icon="person-add-outline"
            label="고객 추가"
            onPress={() => router.push('/customer/new')}
          />
          <QuickItem
            icon="people-outline"
            label="내 고객"
            onPress={() => router.push('/(tabs)/customers')}
          />
          <QuickItem
            icon="document-text-outline"
            label="업무 기록"
            onPress={() => router.push('/(tabs)/pipeline')}
          />
          <QuickItem icon="notifications-outline" label="알림" onPress={() => {}} />
        </View>

        {/* 업무 알림 */}
        <TouchableOpacity style={styles.noticeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>업무 알림</Text>
            <Text style={styles.noticeSub}>
              {counts.contract > 0
                ? `오늘 계약 ${counts.contract}건 성사 — 축하해요!`
                : '새로운 공지사항이 없어요'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
        </TouchableOpacity>

        <View style={{ height: 24 }} />
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

  // Header
  headerWrap: { backgroundColor: Palette.graphite },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  greeting: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  subGreeting: { color: '#CBD5E1', fontSize: 12, marginTop: 4 },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
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

  scroll: { padding: 16, paddingTop: 16 },

  // Cards
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 12,
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Palette.textMain },
  cardCount: { fontSize: 12, color: Palette.textSub, fontWeight: '500' },
  cardMeta: { fontSize: 11, color: Palette.textMuted },

  // Meetings
  meetingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  meetingDivider: { borderTopWidth: 1, borderTopColor: Palette.border },
  meetingTime: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textMain,
    width: 48,
  },
  meetingTitle: { fontSize: 14, fontWeight: '600', color: Palette.textMain },
  meetingSub: { fontSize: 12, color: Palette.textSub, marginTop: 2 },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Palette.primarySoft,
  },
  statusChipText: { fontSize: 11, fontWeight: '600', color: Palette.primaryDeep },

  emptyInline: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { color: Palette.textSub, fontSize: 13, fontWeight: '500' },
  emptyHint: { color: Palette.textMuted, fontSize: 11, marginTop: 4 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  cardFooterText: { fontSize: 13, color: Palette.textSub, fontWeight: '500' },

  // Activity
  activityRow: { marginBottom: 14 },
  activityLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  activityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activityLabel: { flex: 1, fontSize: 13, color: Palette.textMain, fontWeight: '500' },
  activityValue: { fontSize: 15, fontWeight: '700', color: Palette.textMain },
  activityGoal: { fontSize: 12, color: Palette.textMuted, fontWeight: '400' },

  progressBar: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Palette.primary, borderRadius: Radius.pill },
  progressPercent: {
    textAlign: 'right',
    marginTop: 6,
    fontSize: 12,
    color: Palette.textSub,
    fontWeight: '500',
  },

  // Target
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  targetLabel: { fontSize: 13, color: Palette.textSub, fontWeight: '500' },
  targetValue: { fontSize: 13, color: Palette.textSub },
  targetBig: { fontSize: 20, fontWeight: '700', color: Palette.textMain },

  primaryBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  // Quick grid
  quickGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickItem: {
    flex: 1,
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
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
    marginBottom: 8,
  },
  quickLabel: { fontSize: 11, fontWeight: '600', color: Palette.textMain },

  // Notice
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    gap: 12,
    ...Shadow.card,
  },
  noticeTitle: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
  noticeSub: { fontSize: 12, color: Palette.textSub, marginTop: 4 },
});

// Suppress unused — kept for future use
void GradeColor;
