import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const userName = '김영업';
  const meetingsDone = 2;
  const meetingsGoal = 3;
  const taDone = 7;
  const taGoal = 10;
  const streakDays = 5;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.greeting}>안녕하세요, {userName}님 👋</Text>
          <Text style={styles.subGreeting}>오늘도 화이팅이에요!</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🎯 오늘의 미팅</Text>
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {streakDays}일 연속</Text>
            </View>
          </View>

          <View style={styles.meetingBoxes}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.meetingBox,
                  i < meetingsDone ? styles.meetingBoxDone : styles.meetingBoxEmpty,
                ]}>
                {i < meetingsDone ? (
                  <Ionicons name="checkmark-circle" size={40} color="#FFFFFF" />
                ) : (
                  <Text style={styles.meetingBoxNumber}>{i + 1}</Text>
                )}
              </View>
            ))}
          </View>

          <Text style={styles.meetingStatus}>
            {meetingsDone}/{meetingsGoal} 완료!{' '}
            {meetingsDone < meetingsGoal
              ? `${meetingsGoal - meetingsDone}명만 더 만나면 오늘 목표 달성!`
              : '오늘 목표 달성! 🎉'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 오늘의 활동</Text>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>📞 TA (전화)</Text>
            <Text style={styles.statValue}>
              {taDone} <Text style={styles.statGoal}>/ {taGoal}</Text>
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(taDone / taGoal) * 100}%` }]} />
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>🤝 미팅</Text>
            <Text style={styles.statValue}>
              {meetingsDone} <Text style={styles.statGoal}>/ {meetingsGoal}</Text>
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(meetingsDone / meetingsGoal) * 100}%`, backgroundColor: '#10B981' },
              ]}
            />
          </View>
        </View>

        <View style={[styles.card, styles.goldenCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>⏰ 골든타임 알림</Text>
          </View>

          <View style={styles.goldenItem}>
            <View style={styles.goldenIcon}>
              <Text style={{ fontSize: 24 }}>🎂</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.goldenName}>김철수 대표님</Text>
              <Text style={styles.goldenSub}>계약 1주년까지 3일!</Text>
            </View>
            <TouchableOpacity style={styles.goldenBtn}>
              <Text style={styles.goldenBtnText}>연락하기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.goldenItem}>
            <View style={styles.goldenIcon}>
              <Text style={{ fontSize: 24 }}>🎉</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.goldenName}>이영희 부장님</Text>
              <Text style={styles.goldenSub}>생일이 내일이에요!</Text>
            </View>
            <TouchableOpacity style={styles.goldenBtn}>
              <Text style={styles.goldenBtnText}>안부톡</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionBtn}>
            <Text style={{ fontSize: 28 }}>🎙️</Text>
            <Text style={styles.quickActionText}>음성 일지</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionBtn}>
            <Text style={{ fontSize: 28 }}>📇</Text>
            <Text style={styles.quickActionText}>명함 스캔</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionBtn}>
            <Text style={{ fontSize: 28 }}>📞</Text>
            <Text style={styles.quickActionText}>스와이프 TA</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scroll: { padding: 16 },
  header: { marginBottom: 16, paddingHorizontal: 4 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  subGreeting: { fontSize: 14, color: '#64748B', marginTop: 4 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  streakBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: { color: '#D97706', fontWeight: '700', fontSize: 12 },

  meetingBoxes: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  meetingBox: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  meetingBoxDone: { backgroundColor: '#10B981' },
  meetingBoxEmpty: {
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  meetingBoxNumber: { fontSize: 28, fontWeight: '700', color: '#CBD5E1' },
  meetingStatus: { marginTop: 12, color: '#475569', fontWeight: '600', textAlign: 'center' },

  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  statLabel: { color: '#475569', fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  statGoal: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  progressBar: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2563EB' },

  goldenCard: { backgroundColor: '#FFFBEB', borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  goldenItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  goldenIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goldenName: { fontWeight: '700', color: '#0F172A', fontSize: 15 },
  goldenSub: { color: '#92400E', fontSize: 13, marginTop: 2 },
  goldenBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  goldenBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#FDE68A', marginVertical: 4 },

  quickActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  quickActionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  quickActionText: { marginTop: 6, fontWeight: '700', color: '#334155', fontSize: 12 },
});
