import { Ionicons } from '@expo/vector-icons';
import {
  currentMonthKey,
  formatMonthKeyKorean,
  shiftMonthKey,
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

export default function PipelineScreen() {
  const router = useRouter();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const { byStage, cards, isLoading, error, move } = usePipeline(monthKey);

  const taTargetCount = byStage('ta_target').length;
  const meetingScheduledCount = byStage('meeting_scheduled').length;
  const contractCount = byStage('contract').length;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>이달의 생명수</Text>
          </View>

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

          {/* KPI 한 줄 */}
          <View style={styles.kpiRow}>
            <KpiCell label="TA 대상" value={taTargetCount} />
            <View style={styles.kpiSep} />
            <KpiCell label="미팅 예정" value={meetingScheduledCount} />
            <View style={styles.kpiSep} />
            <KpiCell label="계약" value={contractCount} accent={Palette.green} />
            <View style={styles.kpiSep} />
            <KpiCell label="전체" value={cards.length} />
          </View>

          {/* 스와이프 TA 진입 */}
          {taTargetCount > 0 && (
            <TouchableOpacity
              style={styles.swipeBtn}
              onPress={() => router.push('/swipe-ta')}
              activeOpacity={0.9}>
              <View style={styles.swipeBtnIcon}>
                <Ionicons name="call" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.swipeBtnText}>스와이프 TA 시작하기</Text>
                <Text style={styles.swipeBtnSub}>
                  TA 대상 {taTargetCount}명 · 60초 타이머 + 1분 스크립트
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {error ? (
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
            고객 상세에서 '생명수에 추가' 눌러 카드를 채워보세요
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kanbanContent}>
          {STAGES.map((stage) => {
            const style = StageStyle[stage.key];
            const stageCards = byStage(stage.key);
            const next = NEXT_STAGE[stage.key];
            return (
              <View key={stage.key} style={styles.column}>
                <View style={styles.columnHeader}>
                  <View style={styles.columnTitleRow}>
                    <View style={[styles.columnDot, { backgroundColor: style.accent }]} />
                    <Text style={styles.columnTitle}>{style.label}</Text>
                  </View>
                  <Text style={styles.columnCount}>{stageCards.length}</Text>
                </View>

                <ScrollView style={styles.columnBody} showsVerticalScrollIndicator={false}>
                  {stageCards.map((card) => {
                    const c = card.customer;
                    if (!c) return null;
                    const grade = GradeColor[c.grade];
                    return (
                      <TouchableOpacity
                        key={card.id}
                        style={styles.kanbanCard}
                        activeOpacity={0.85}
                        onPress={() =>
                          router.push({
                            pathname: '/customer/[id]',
                            params: { id: c.id },
                          })
                        }>
                        <View style={styles.kanbanCardHead}>
                          <Text style={styles.kanbanCustomer} numberOfLines={1}>
                            {c.company ?? c.name}
                          </Text>
                          <View style={[styles.gradePill, { backgroundColor: grade.bg }]}>
                            <Text style={[styles.gradePillText, { color: grade.fg }]}>
                              {c.grade}
                            </Text>
                          </View>
                        </View>
                        {c.company && (
                          <Text style={styles.kanbanContact} numberOfLines={1}>
                            {c.name}
                            {c.job_title ? ` · ${c.job_title}` : ''}
                          </Text>
                        )}
                        {(card.note || c.memo) && (
                          <Text style={styles.kanbanMemo} numberOfLines={2}>
                            {card.note ?? c.memo}
                          </Text>
                        )}
                        {c.region_tag && (
                          <View style={styles.kanbanFooter}>
                            <Ionicons
                              name="location-outline"
                              size={11}
                              color={Palette.textMuted}
                            />
                            <Text style={styles.kanbanRegion}>{c.region_tag}</Text>
                          </View>
                        )}
                        {next && (
                          <TouchableOpacity
                            style={styles.moveBtn}
                            activeOpacity={0.7}
                            onPress={(e) => {
                              e.stopPropagation();
                              void move(card.id, next);
                            }}>
                            <Text style={styles.moveBtnText}>
                              {StageStyle[next].label}로 이동
                            </Text>
                            <Ionicons
                              name="arrow-forward"
                              size={11}
                              color={Palette.primary}
                            />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {stageCards.length === 0 && (
                    <View style={styles.emptyColumn}>
                      <Text style={styles.emptyColumnText}>비어있음</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
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

  // Kanban
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
