import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { useDailyCounts } from '@/hooks/use-daily-counts';

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { counts, isLoading } = useDailyCounts();

  const userName = profile?.name ?? '영업맨';
  const meetingsDone = counts.meeting;
  const meetingsGoal = 3;
  const taDone = counts.ta;
  const taGoal = 10;
  const streakDays = profile?.current_streak ?? 0;

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
            {streakDays > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 {streakDays}일 연속</Text>
              </View>
            )}
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
            {isLoading
              ? '집계 중...'
              : meetingsDone >= meetingsGoal
              ? `${meetingsDone}/${meetingsGoal} 오늘 목표 달성! 🎉`
              : `${meetingsDone}/${meetingsGoal} 완료! ${meetingsGoal - meetingsDone}명만 더 만나면 목표 달성!`}
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
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (taDone / taGoal) * 100)}%` },
              ]}
            />
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
                {
                  width: `${Math.min(100, (meetingsDone / meetingsGoal) * 100)}%`,
                  backgroundColor: '#10B981',
                },
              ]}
            />
          </View>

          {counts.contract > 0 && (
            <View style={styles.contractRow}>
              <Text style={styles.contractText}>🎉 오늘 계약 {counts.contract}건 성사!</Text>
            </View>
          )}
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/customer/new')}>
            <Text style={{ fontSize: 28 }}>👤</Text>
            <Text style={styles.quickActionText}>고객 추가</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/(tabs)/customers')}>
            <Text style={{ fontSize: 28 }}>📇</Text>
            <Text style={styles.quickActionText}>내 고객</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/(tabs)/pipeline')}>
            <Text style={{ fontSize: 28 }}>📋</Text>
            <Text style={styles.quickActionText}>생명수</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonTitle}>🚧 Coming Soon</Text>
          <Text style={styles.comingSoonText}>
            🎙️ 음성 일지 · 📇 명함 스캔 · 📞 스와이프 TA · ⏰ 골든타임 알림
          </Text>
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

  contractRow: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    alignItems: 'center',
  },
  contractText: { color: '#92400E', fontWeight: '700' },

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

  comingSoon: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderStyle: 'dashed',
  },
  comingSoonTitle: { color: '#1E40AF', fontWeight: '700', fontSize: 13 },
  comingSoonText: { color: '#3B82F6', fontSize: 12, marginTop: 4, lineHeight: 18 },
});
