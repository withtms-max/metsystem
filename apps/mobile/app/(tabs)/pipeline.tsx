import { currentMonthKey, formatMonthKeyKorean, shiftMonthKey, type PipelineStage } from '@metsystem/shared';
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

const STAGES: { key: PipelineStage; label: string; color: string; emoji: string }[] = [
  { key: 'ta_target', label: 'TA 대상', color: '#94A3B8', emoji: '📞' },
  { key: 'ta_done', label: 'TA 완료', color: '#3B82F6', emoji: '✅' },
  { key: 'meeting_scheduled', label: '미팅 예정', color: '#F59E0B', emoji: '📅' },
  { key: 'meeting_done', label: '미팅 완료', color: '#8B5CF6', emoji: '🤝' },
  { key: 'contract', label: '계약', color: '#10B981', emoji: '🎉' },
  { key: 'on_hold', label: '보류', color: '#EF4444', emoji: '⏸️' },
];

const GRADE_COLOR = { A: '#EF4444', B: '#F59E0B', C: '#3B82F6', D: '#94A3B8' };

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📋 이달의 생명수</Text>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => setMonthKey(shiftMonthKey(monthKey, -1))}>
              <Text style={styles.monthArrow}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.headerSub}>{formatMonthKeyKorean(monthKey)}</Text>
            <TouchableOpacity onPress={() => setMonthKey(shiftMonthKey(monthKey, 1))}>
              <Text style={styles.monthArrow}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyText}>{error.message}</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              TA 대상 <Text style={styles.summaryStrong}>{taTargetCount}</Text> · 미팅 예정{' '}
              <Text style={styles.summaryStrong}>{meetingScheduledCount}</Text> · 계약{' '}
              <Text style={[styles.summaryStrong, { color: '#10B981' }]}>{contractCount}</Text>
              {cards.length === 0 && (
                <Text style={styles.summaryHint}>  · 카드를 추가해보세요</Text>
              )}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kanbanScroll}>
            {STAGES.map((stage) => {
              const stageCards = byStage(stage.key);
              const next = NEXT_STAGE[stage.key];
              return (
                <View key={stage.key} style={styles.column}>
                  <View style={[styles.columnHeader, { backgroundColor: stage.color }]}>
                    <Text style={styles.columnHeaderText}>
                      {stage.emoji} {stage.label}
                    </Text>
                    <Text style={styles.columnCount}>{stageCards.length}</Text>
                  </View>

                  <ScrollView style={styles.columnBody}>
                    {stageCards.map((card) => (
                      <TouchableOpacity
                        key={card.id}
                        style={styles.card}
                        onPress={() =>
                          card.customer &&
                          router.push({
                            pathname: '/customer/[id]',
                            params: { id: card.customer.id },
                          })
                        }>
                        <View style={styles.cardRow}>
                          {card.customer && (
                            <View
                              style={[
                                styles.gradeBadge,
                                { backgroundColor: GRADE_COLOR[card.customer.grade] },
                              ]}>
                              <Text style={styles.gradeText}>{card.customer.grade}</Text>
                            </View>
                          )}
                          <Text style={styles.cardName} numberOfLines={1}>
                            {card.customer?.name ?? '(삭제된 고객)'}
                          </Text>
                        </View>
                        {card.customer?.region_tag && (
                          <Text style={styles.cardRegion}>📍 {card.customer.region_tag}</Text>
                        )}
                        {(card.note || card.customer?.memo) && (
                          <Text style={styles.cardMemo} numberOfLines={2}>
                            {card.note ?? card.customer?.memo}
                          </Text>
                        )}
                        {next && (
                          <TouchableOpacity
                            style={styles.moveBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              void move(card.id, next);
                            }}>
                            <Text style={styles.moveBtnText}>
                              {STAGES.find((s) => s.key === next)?.label} →
                            </Text>
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    ))}
                    {stageCards.length === 0 && (
                      <Text style={styles.emptyStage}>비어있음</Text>
                    )}
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  monthArrow: { fontSize: 14, color: '#64748B', paddingHorizontal: 4 },
  headerSub: { fontSize: 13, color: '#64748B' },

  summary: { paddingHorizontal: 16, paddingBottom: 12 },
  summaryText: { color: '#475569', fontSize: 14 },
  summaryStrong: { fontWeight: '700', color: '#0F172A' },
  summaryHint: { color: '#94A3B8' },

  kanbanScroll: { flex: 1, paddingHorizontal: 8 },
  column: { width: 240, marginHorizontal: 4 },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  columnHeaderText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  columnCount: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  columnBody: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 8,
    minHeight: 200,
  },

  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#CBD5E1',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  gradeBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  gradeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 11 },
  cardName: { fontWeight: '700', color: '#0F172A', flex: 1 },
  cardRegion: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  cardMemo: { fontSize: 12, color: '#475569', marginBottom: 6 },

  moveBtn: {
    backgroundColor: '#E0F2FE',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 4,
    alignItems: 'center',
  },
  moveBtnText: { fontSize: 11, fontWeight: '700', color: '#0369A1' },

  emptyStage: { color: '#CBD5E1', fontSize: 12, textAlign: 'center', paddingVertical: 20 },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#475569', textAlign: 'center' },
});
