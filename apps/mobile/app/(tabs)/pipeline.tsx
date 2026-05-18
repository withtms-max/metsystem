import { Ionicons } from '@expo/vector-icons';
import {
  currentMonthKey,
  formatMonthKeyKorean,
  shiftMonthKey,
  type PipelineCardWithCustomer,
  type PipelineStage,
} from '@metsystem/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePipeline } from '@/hooks/use-pipeline';
import { GradeColor, Palette, Radius, Shadow, StageStyle } from '@/constants/theme';
import { CalendarView } from '@/components/calendar-view';
import { InsightsView } from '@/components/insights-view';

const STAGES: { key: PipelineStage }[] = [
  { key: 'ta_target' },
  { key: 'ta_done' },
  { key: 'meeting_scheduled' },
  { key: 'meeting_done' },
  { key: 'contract' },
  { key: 'on_hold' },
];

const NEXT_STAGE: Record<PipelineStage, PipelineStage | null> = {
  ta_target: 'ta_done',
  ta_done: 'meeting_scheduled',
  meeting_scheduled: 'meeting_done',
  meeting_done: 'contract',
  contract: null,
  on_hold: 'ta_target',
};

type ViewMode = 'board' | 'calendar' | 'insights';

export default function PipelineScreen() {
  const router = useRouter();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const { byStage, cards, isLoading, error, move } = usePipeline(monthKey);

  const taTargetCount = byStage('ta_target').length;
  const meetingScheduledCount = byStage('meeting_scheduled').length;
  const contractCount = byStage('contract').length;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>이달의 영업판</Text>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewBtn, viewMode === 'board' && styles.viewBtnActive]}
                onPress={() => setViewMode('board')}
                activeOpacity={0.7}>
                <Ionicons
                  name="grid-outline"
                  size={14}
                  color={viewMode === 'board' ? Palette.textMain : Palette.textSub}
                />
                <Text
                  style={[styles.viewBtnText, viewMode === 'board' && styles.viewBtnTextActive]}>
                  보드
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewBtn, viewMode === 'calendar' && styles.viewBtnActive]}
                onPress={() => setViewMode('calendar')}
                activeOpacity={0.7}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={viewMode === 'calendar' ? Palette.textMain : Palette.textSub}
                />
                <Text
                  style={[
                    styles.viewBtnText,
                    viewMode === 'calendar' && styles.viewBtnTextActive,
                  ]}>
                  캘린더
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewBtn, viewMode === 'insights' && styles.viewBtnActive]}
                onPress={() => setViewMode('insights')}
                activeOpacity={0.7}>
                <Ionicons
                  name="analytics-outline"
                  size={14}
                  color={viewMode === 'insights' ? Palette.textMain : Palette.textSub}
                />
                <Text
                  style={[
                    styles.viewBtnText,
                    viewMode === 'insights' && styles.viewBtnTextActive,
                  ]}>
                  분석
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {viewMode === 'board' && (
            <View style={styles.monthRow}>
              <TouchableOpacity
                style={styles.monthBtn}
                onPress={() => setMonthKey(shiftMonthKey(monthKey, -1))}
                hitSlop={8}>
                <Ionicons name="chevron-back" size={16} color={Palette.textSub} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{formatMonthKeyKorean(monthKey)}</Text>
              <TouchableOpacity
                style={styles.monthBtn}
                onPress={() => setMonthKey(shiftMonthKey(monthKey, 1))}
                hitSlop={8}>
                <Ionicons name="chevron-forward" size={16} color={Palette.textSub} />
              </TouchableOpacity>
            </View>
          )}

          {/* KPI 한 줄 — 보드 모드에서만 */}
          {viewMode === 'board' && (
            <>
              <View style={styles.kpiRow}>
                <KpiCell label="콜 예정" value={taTargetCount} />
                <View style={styles.kpiSep} />
                <KpiCell label="미팅 예정" value={meetingScheduledCount} />
                <View style={styles.kpiSep} />
                <KpiCell label="계약" value={contractCount} accent={Palette.green} />
                <View style={styles.kpiSep} />
                <KpiCell label="전체" value={cards.length} />
              </View>

              {/* 빠른 콜 모드 진입 */}
              {taTargetCount > 0 && (
                <TouchableOpacity
                  style={styles.swipeBtn}
                  onPress={() => router.push('/swipe-ta')}
                  activeOpacity={0.9}>
                  <View style={styles.swipeBtnIcon}>
                    <Ionicons name="call" size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.swipeBtnText}>빠른 콜 모드 시작</Text>
                    <Text style={styles.swipeBtnSub}>
                      예정 {taTargetCount}명 · 60초 타이머 + 1분 멘트
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </SafeAreaView>

      {viewMode === 'calendar' ? (
        <ScrollView>
          <CalendarView monthKey={monthKey} onMonthChange={setMonthKey} />
        </ScrollView>
      ) : viewMode === 'insights' ? (
        <InsightsView monthKey={monthKey} />
      ) : error ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="alert-circle-outline" size={32} color={Palette.orange} />
          </View>
          <Text style={styles.emptyTitle}>불러올 수 없어요</Text>
          <Text style={styles.emptySub}>{error.message}</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={Palette.primary} />
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="albums-outline" size={28} color={Palette.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>이번 달은 비어있어요</Text>
          <Text style={styles.emptySub}>
            고객 상세에서 '영업판에 추가' 눌러 카드를 채워보세요
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.vListContent}>
          {STAGES.map((stage) => {
            const style = StageStyle[stage.key];
            const stageCards = byStage(stage.key);
            const next = NEXT_STAGE[stage.key];
            return (
              <PipelineSection
                key={stage.key}
                stageKey={stage.key}
                label={style.label}
                accent={style.accent}
                bg={style.bg}
                cards={stageCards}
                next={next}
                onPressCard={(id) =>
                  router.push({ pathname: '/customer/[id]', params: { id } })
                }
                onMove={(cardId) => {
                  if (next) void move(cardId, next);
                }}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/**
 * 세로형 영업판 섹션 — 단계별 행 형태로 카드 나열.
 * 카드는 가로형 한 줄 (이름·등급·메모·다음단계 이동).
 */
function PipelineSection({
  stageKey,
  label,
  accent,
  bg,
  cards,
  next,
  onPressCard,
  onMove,
}: {
  stageKey: PipelineStage;
  label: string;
  accent: string;
  bg: string;
  cards: PipelineCardWithCustomer[];
  next: PipelineStage | null;
  onPressCard: (customerId: string) => void;
  onMove: (cardId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(cards.length === 0);
  const isEmpty = cards.length === 0;
  void stageKey;

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHead}
        onPress={() => setCollapsed((v) => !v)}
        activeOpacity={0.75}>
        <View style={[styles.sectionDot, { backgroundColor: accent }]} />
        <Text style={styles.sectionTitle}>{label}</Text>
        <View style={[styles.sectionCount, { backgroundColor: bg }]}>
          <Text style={[styles.sectionCountText, { color: accent }]}>{cards.length}</Text>
        </View>
        {!isEmpty && (
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={16}
            color={Palette.textMuted}
          />
        )}
      </TouchableOpacity>

      {!collapsed && !isEmpty && (
        <View style={styles.sectionBody}>
          {cards.map((card) => {
            const c = card.customer;
            if (!c) return null;
            const grade = GradeColor[c.grade];
            return (
              <TouchableOpacity
                key={card.id}
                style={styles.sectionCard}
                activeOpacity={0.85}
                onPress={() => onPressCard(c.id)}>
                <View style={[styles.cardAvatar, { backgroundColor: grade.bg }]}>
                  <Text style={[styles.cardAvatarText, { color: grade.fg }]}>
                    {(c.company ?? c.name).slice(0, 1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeadRow}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {c.company ?? c.name}
                    </Text>
                    <View style={[styles.gradePill, { backgroundColor: grade.bg }]}>
                      <Text style={[styles.gradePillText, { color: grade.fg }]}>
                        {c.grade}
                      </Text>
                    </View>
                  </View>
                  {c.company && (
                    <Text style={styles.cardSub} numberOfLines={1}>
                      {c.name}
                      {c.job_title ? ` · ${c.job_title}` : ''}
                      {c.region_tag ? ` · ${c.region_tag}` : ''}
                    </Text>
                  )}
                  {(card.note || c.memo) && (
                    <Text style={styles.cardMemo} numberOfLines={1}>
                      {card.note ?? c.memo}
                    </Text>
                  )}
                </View>
                {next && (
                  <TouchableOpacity
                    style={styles.cardMoveBtn}
                    activeOpacity={0.7}
                    onPress={(e) => {
                      e.stopPropagation();
                      onMove(card.id);
                    }}
                    hitSlop={6}>
                    <Ionicons name="arrow-forward" size={14} color={Palette.primary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {collapsed && !isEmpty && (
        <Text style={styles.collapsedHint}>{cards.length}건 — 탭해서 펼치기</Text>
      )}
    </View>
  );
}

function KpiCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <View style={styles.kpiCell}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },

  // Header — 흰 배경 + 미세한 보더
  header: {
    backgroundColor: Palette.card,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.3 },

  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    padding: 3,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  viewBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#191F28',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  viewBtnText: { fontSize: 12, fontWeight: '600', color: Palette.textSub },
  viewBtnTextActive: { color: Palette.textMain, fontWeight: '700' },

  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  monthBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.grayBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabel: { color: Palette.textMain, fontSize: 15, fontWeight: '600' },

  // KPI Row
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.md,
    paddingVertical: 10,
    marginTop: 16,
  },
  kpiCell: { flex: 1, alignItems: 'center' },
  kpiSep: { width: 1, height: 24, backgroundColor: Palette.borderStrong, opacity: 0.6 },
  kpiLabel: { fontSize: 11, color: Palette.textSub, fontWeight: '500' },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.textMain,
    marginTop: 4,
    letterSpacing: -0.3,
  },

  // Swipe TA CTA
  swipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primary,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: Radius.md,
    gap: 12,
  },
  swipeBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  swipeBtnSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },

  // Vertical sections (new)
  vListContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 32 },
  section: { marginBottom: 8 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Palette.textMain },
  sectionCount: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCountText: { fontSize: 12, fontWeight: '800' },
  sectionBody: { marginTop: 6, gap: 6 },
  collapsedHint: {
    fontSize: 11,
    color: Palette.textMuted,
    paddingLeft: 28,
    paddingTop: 4,
    fontStyle: 'italic',
  },

  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  cardAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAvatarText: { fontSize: 15, fontWeight: '700' },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { flex: 1, fontSize: 14, fontWeight: '700', color: Palette.textMain },
  cardSub: { fontSize: 11, color: Palette.textSub, marginTop: 2 },
  cardMemo: { fontSize: 11, color: Palette.textMuted, marginTop: 2 },
  cardMoveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Kanban (legacy — kept for reference, no longer used)
  kanbanContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 24 },
  column: { width: 260, marginHorizontal: 4 },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Palette.card,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    borderBottomWidth: 0,
  },
  columnTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  columnDot: { width: 8, height: 8, borderRadius: 4 },
  columnTitle: { fontSize: 13, fontWeight: '600', color: Palette.textMain },
  columnCount: { fontSize: 13, fontWeight: '700', color: Palette.textMuted },

  columnBody: {
    backgroundColor: Palette.card,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 240,
    maxHeight: 520,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Palette.border,
  },

  kanbanCard: {
    backgroundColor: Palette.bg,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  kanbanCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  kanbanCustomer: { flex: 1, fontSize: 13, fontWeight: '700', color: Palette.textMain },
  gradePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.pill },
  gradePillText: { fontSize: 10, fontWeight: '700' },
  kanbanContact: { fontSize: 11, color: Palette.textSub, marginBottom: 4 },
  kanbanMemo: { fontSize: 12, color: Palette.textMain, lineHeight: 16, marginBottom: 6 },
  kanbanFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kanbanRegion: { fontSize: 11, color: Palette.textMuted, fontWeight: '500' },

  moveBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
    backgroundColor: Palette.primarySoft,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  moveBtnText: { fontSize: 11, fontWeight: '700', color: Palette.primary },

  emptyColumn: { paddingVertical: 32, alignItems: 'center' },
  emptyColumnText: { color: Palette.textMuted, fontSize: 11, fontWeight: '500' },

  // Empty state
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.grayBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.textMain,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: Palette.textSub,
    textAlign: 'center',
    lineHeight: 20,
  },
});

void Shadow;
