import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Customer {
  id: string;
  name: string;
  grade: 'A' | 'B' | 'C' | 'D';
  company: string;
  region: string;
  lastActivity: string;
  memo: string;
}

const MOCK_CUSTOMERS: Customer[] = [
  { id: '1', name: '김철수 대표', grade: 'A', company: '한빛산업', region: '판교', lastActivity: '3일 전', memo: '가지급금 상담중' },
  { id: '2', name: '이영희 부장', grade: 'B', company: '삼성디스플레이', region: '강남', lastActivity: '1주 전', memo: '재무설계 관심' },
  { id: '3', name: '박민수 이사', grade: 'A', company: '신한금융투자', region: '분당', lastActivity: '오늘', memo: '추천 고객, 응대 中' },
  { id: '4', name: '정수영 사장', grade: 'A', company: '수영물산', region: '여의도', lastActivity: '2일 전', memo: '다음주 미팅 약속' },
  { id: '5', name: '최영준 부장', grade: 'B', company: '롯데케미칼', region: '판교', lastActivity: '5일 전', memo: '관심 있음, 자료 요청' },
  { id: '6', name: '강태호 대표', grade: 'A', company: '태호건설', region: '강남', lastActivity: '오늘', memo: '5/20 화 14시 미팅' },
  { id: '7', name: '한지민 이사', grade: 'B', company: '지민컨설팅', region: '서초', lastActivity: '4일 전', memo: '제안서 검토 중' },
  { id: '8', name: '오민호 부장', grade: 'C', company: '민호엔지니어링', region: '분당', lastActivity: '3주 전', memo: '예산 보류' },
  { id: '9', name: '서지훈 대표', grade: 'A', company: '지훈홀딩스', region: '강남', lastActivity: '5일 전', memo: '🎉 계약 완료' },
];

const GRADES = ['전체', 'A', 'B', 'C', 'D'] as const;
const REGIONS = ['전체', '판교', '강남', '분당', '서초', '여의도'];
const GRADE_COLOR = { A: '#EF4444', B: '#F59E0B', C: '#3B82F6', D: '#94A3B8' };

export default function CustomersScreen() {
  const [selectedGrade, setSelectedGrade] = useState<(typeof GRADES)[number]>('전체');
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [search, setSearch] = useState('');

  const filtered = MOCK_CUSTOMERS.filter((c) => {
    if (selectedGrade !== '전체' && c.grade !== selectedGrade) return false;
    if (selectedRegion !== '전체' && c.region !== selectedRegion) return false;
    if (search && !c.name.includes(search) && !c.company.includes(search)) return false;
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 내 고객</Text>
        <Text style={styles.headerSub}>총 {MOCK_CUSTOMERS.length}명</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="이름 또는 회사 검색"
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {GRADES.map((g) => (
          <TouchableOpacity
            key={g}
            onPress={() => setSelectedGrade(g)}
            style={[styles.chip, selectedGrade === g && styles.chipActive]}>
            <Text style={[styles.chipText, selectedGrade === g && styles.chipTextActive]}>
              {g === '전체' ? g : `${g}급`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filterRow}>
        {REGIONS.map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setSelectedRegion(r)}
            style={[styles.chip, selectedRegion === r && styles.chipActiveAlt]}>
            <Text style={[styles.chipText, selectedRegion === r && styles.chipTextActive]}>
              📍 {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.customerCard}>
            <View style={[styles.gradeCircle, { backgroundColor: GRADE_COLOR[item.grade] }]}>
              <Text style={styles.gradeCircleText}>{item.grade}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.customerNameRow}>
                <Text style={styles.customerName}>{item.name}</Text>
                <Text style={styles.customerActivity}>{item.lastActivity}</Text>
              </View>
              <Text style={styles.customerCompany}>{item.company}</Text>
              <View style={styles.customerMeta}>
                <Text style={styles.customerRegion}>📍 {item.region}</Text>
                <Text style={styles.customerMemo} numberOfLines={1}>
                  {item.memo}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { padding: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  headerSub: { fontSize: 13, color: '#64748B' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#0F172A' },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipActiveAlt: { backgroundColor: '#10B981', borderColor: '#10B981' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFFFFF' },

  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80 },
  customerCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    alignItems: 'center',
  },
  gradeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gradeCircleText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  customerNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customerName: { fontWeight: '700', fontSize: 15, color: '#0F172A' },
  customerActivity: { fontSize: 11, color: '#94A3B8' },
  customerCompany: { fontSize: 12, color: '#64748B', marginTop: 2 },
  customerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  customerRegion: { fontSize: 11, color: '#10B981', fontWeight: '600' },
  customerMemo: { fontSize: 11, color: '#94A3B8', flex: 1 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
