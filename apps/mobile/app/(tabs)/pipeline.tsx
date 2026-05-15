import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Stage = 'ta_target' | 'ta_done' | 'meeting_scheduled' | 'meeting_done' | 'contract' | 'on_hold';

interface Card {
  id: string;
  name: string;
  grade: 'A' | 'B' | 'C' | 'D';
  memo: string;
  region: string;
}

const STAGES: { key: Stage; label: string; color: string; emoji: string }[] = [
  { key: 'ta_target', label: 'TA 대상', color: '#94A3B8', emoji: '📞' },
  { key: 'ta_done', label: 'TA 완료', color: '#3B82F6', emoji: '✅' },
  { key: 'meeting_scheduled', label: '미팅 예정', color: '#F59E0B', emoji: '📅' },
  { key: 'meeting_done', label: '미팅 완료', color: '#8B5CF6', emoji: '🤝' },
  { key: 'contract', label: '계약', color: '#10B981', emoji: '🎉' },
  { key: 'on_hold', label: '보류', color: '#EF4444', emoji: '⏸️' },
];

const MOCK_CARDS: Record<Stage, Card[]> = {
  ta_target: [
    { id: '1', name: '김철수 대표', grade: 'A', memo: '가지급금 상담중', region: '판교' },
    { id: '2', name: '이영희 부장', grade: 'B', memo: '재무설계 관심', region: '강남' },
    { id: '3', name: '박민수 이사', grade: 'A', memo: '추천받은 고객', region: '분당' },
  ],
  ta_done: [
    { id: '4', name: '정수영 사장', grade: 'A', memo: '다음주 미팅 약속', region: '여의도' },
    { id: '5', name: '최영준 부장', grade: 'B', memo: '관심 있음, 자료 요청', region: '판교' },
  ],
  meeting_scheduled: [
    { id: '6', name: '강태호 대표', grade: 'A', memo: '5/20 화요일 14시', region: '강남' },
  ],
  meeting_done: [
    { id: '7', name: '윤서연 부장', grade: 'A', memo: '2차 제안서 전달', region: '판교' },
    { id: '8', name: '한지민 이사', grade: 'B', memo: '검토 중', region: '서초' },
  ],
  contract: [{ id: '9', name: '서지훈 대표', grade: 'A', memo: '🎉 5/10 계약 성사!', region: '강남' }],
  on_hold: [{ id: '10', name: '오민호 부장', grade: 'C', memo: '예산 보류', region: '분당' }],
};

const GRADE_COLOR = { A: '#EF4444', B: '#F59E0B', C: '#3B82F6', D: '#94A3B8' };

export default function PipelineScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📋 이달의 생명수</Text>
          <Text style={styles.headerSub}>2026년 5월</Text>
        </View>
        <TouchableOpacity style={styles.swipeButton}>
          <Text style={styles.swipeButtonText}>📞 스와이프 TA</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          TA 대상 <Text style={styles.summaryStrong}>3</Text> · 미팅 예정{' '}
          <Text style={styles.summaryStrong}>1</Text> · 계약{' '}
          <Text style={[styles.summaryStrong, { color: '#10B981' }]}>1</Text>
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kanbanScroll}>
        {STAGES.map((stage) => (
          <View key={stage.key} style={styles.column}>
            <View style={[styles.columnHeader, { backgroundColor: stage.color }]}>
              <Text style={styles.columnHeaderText}>
                {stage.emoji} {stage.label}
              </Text>
              <Text style={styles.columnCount}>{MOCK_CARDS[stage.key].length}</Text>
            </View>

            <ScrollView style={styles.columnBody}>
              {MOCK_CARDS[stage.key].map((card) => (
                <TouchableOpacity key={card.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={[styles.gradeBadge, { backgroundColor: GRADE_COLOR[card.grade] }]}>
                      <Text style={styles.gradeText}>{card.grade}</Text>
                    </View>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {card.name}
                    </Text>
                  </View>
                  <Text style={styles.cardRegion}>📍 {card.region}</Text>
                  <Text style={styles.cardMemo} numberOfLines={2}>
                    {card.memo}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addCard}>
                <Text style={styles.addCardText}>+ 추가</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        ))}
      </ScrollView>
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
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  swipeButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  swipeButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  summary: { paddingHorizontal: 16, paddingBottom: 12 },
  summaryText: { color: '#475569', fontSize: 14 },
  summaryStrong: { fontWeight: '700', color: '#0F172A' },

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
  cardMemo: { fontSize: 12, color: '#475569' },

  addCard: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  addCardText: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
});
