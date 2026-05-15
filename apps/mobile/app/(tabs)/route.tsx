import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const REGIONS = [
  { name: '판교', count: 12, emoji: '🏢' },
  { name: '강남', count: 8, emoji: '🏙️' },
  { name: '분당', count: 15, emoji: '🌳' },
  { name: '서초', count: 5, emoji: '🏛️' },
  { name: '여의도', count: 3, emoji: '🌉' },
  { name: '광화문', count: 4, emoji: '🏯' },
];

const NEARBY = [
  { id: '1', name: '김철수 대표', grade: 'A', company: '한빛산업', distance: '0.3km', memo: '가지급금 상담중' },
  { id: '2', name: '최영준 부장', grade: 'B', company: '롯데케미칼', distance: '0.8km', memo: '관심 있음, 자료 요청' },
  { id: '3', name: '윤서연 부장', grade: 'A', company: '서연인베스트', distance: '1.2km', memo: '2차 제안서 전달' },
];

const GRADE_COLOR: Record<string, string> = { A: '#EF4444', B: '#F59E0B', C: '#3B82F6', D: '#94A3B8' };

export default function RouteScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📍 동선 영업</Text>
          <Text style={styles.headerSub}>지역 선택하면 근처 고객이 떠요</Text>
        </View>

        {/* 지오펜싱 알림 카드 */}
        <View style={styles.geoCard}>
          <Text style={styles.geoEmoji}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.geoTitle}>판교역 반경 3km 안에 있어요!</Text>
            <Text style={styles.geoSub}>A/B급 고객 3명 발견 — 커피 한 잔 어때요?</Text>
          </View>
          <TouchableOpacity style={styles.geoBtn}>
            <Text style={styles.geoBtnText}>보기</Text>
          </TouchableOpacity>
        </View>

        {/* 지역 그리드 */}
        <Text style={styles.sectionTitle}>지역별 고객</Text>
        <View style={styles.regionGrid}>
          {REGIONS.map((r) => (
            <TouchableOpacity key={r.name} style={styles.regionCard}>
              <Text style={styles.regionEmoji}>{r.emoji}</Text>
              <Text style={styles.regionName}>{r.name}</Text>
              <Text style={styles.regionCount}>{r.count}명</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 현재 위치 근처 고객 */}
        <Text style={styles.sectionTitle}>🔥 지금 근처 (판교)</Text>
        {NEARBY.map((c) => (
          <TouchableOpacity key={c.id} style={styles.nearbyCard}>
            <View style={[styles.gradeBadge, { backgroundColor: GRADE_COLOR[c.grade] }]}>
              <Text style={styles.gradeBadgeText}>{c.grade}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nearbyRow}>
                <Text style={styles.nearbyName}>{c.name}</Text>
                <Text style={styles.nearbyDist}>📏 {c.distance}</Text>
              </View>
              <Text style={styles.nearbyCompany}>{c.company}</Text>
              <Text style={styles.nearbyMemo} numberOfLines={1}>
                {c.memo}
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.actionBtn, styles.callBtn]}>
                <Text style={styles.actionText}>📞</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.kakaoBtn]}>
                <Text style={styles.actionText}>💬</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scroll: { padding: 16 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },

  geoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  geoEmoji: { fontSize: 28, marginRight: 12 },
  geoTitle: { fontWeight: '700', color: '#1E40AF', fontSize: 14 },
  geoSub: { fontSize: 12, color: '#1E40AF', marginTop: 2 },
  geoBtn: { backgroundColor: '#2563EB', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  geoBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 8, marginBottom: 10 },

  regionGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 8 },
  regionCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    margin: '1%',
    alignItems: 'center',
  },
  regionEmoji: { fontSize: 28 },
  regionName: { fontWeight: '700', color: '#0F172A', marginTop: 4 },
  regionCount: { fontSize: 12, color: '#64748B', marginTop: 2 },

  nearbyCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    alignItems: 'center',
  },
  gradeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  gradeBadgeText: { color: '#FFFFFF', fontWeight: '800' },
  nearbyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nearbyName: { fontWeight: '700', color: '#0F172A', fontSize: 14 },
  nearbyDist: { fontSize: 11, color: '#10B981', fontWeight: '700' },
  nearbyCompany: { fontSize: 12, color: '#64748B', marginTop: 2 },
  nearbyMemo: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  actions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  callBtn: { backgroundColor: '#10B981' },
  kakaoBtn: { backgroundColor: '#FEE500' },
  actionText: { fontSize: 16 },
});
