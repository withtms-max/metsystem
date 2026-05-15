import { Ionicons } from '@expo/vector-icons';
import type { CustomerGrade } from '@metsystem/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCustomers } from '@/hooks/use-customers';

const GRADES: ('전체' | CustomerGrade)[] = ['전체', 'A', 'B', 'C', 'D'];
const GRADE_COLOR: Record<CustomerGrade, string> = {
  A: '#EF4444',
  B: '#F59E0B',
  C: '#3B82F6',
  D: '#94A3B8',
};

function formatActivity(dateStr: string): string {
  const updated = new Date(dateStr).getTime();
  const diffDays = Math.floor((Date.now() - updated) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
  return `${Math.floor(diffDays / 365)}년 전`;
}

export default function CustomersScreen() {
  const router = useRouter();
  const [selectedGrade, setSelectedGrade] = useState<(typeof GRADES)[number]>('전체');
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [search, setSearch] = useState('');

  const filters = useMemo(
    () => ({
      grade: selectedGrade === '전체' ? undefined : selectedGrade,
      regionTag: selectedRegion === '전체' ? undefined : selectedRegion,
      search: search.trim() || undefined,
    }),
    [selectedGrade, selectedRegion, search],
  );

  const { customers, isLoading, error } = useCustomers(filters);

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => c.region_tag && set.add(c.region_tag));
    return ['전체', ...Array.from(set).sort()];
  }, [customers]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 내 고객</Text>
        <Text style={styles.headerSub}>총 {customers.length}명</Text>
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

      {regionOptions.length > 1 && (
        <View style={styles.filterRow}>
          {regionOptions.map((r) => (
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
      )}

      {error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyText}>{error.message}</Text>
          <Text style={styles.emptyHint}>Supabase 연결 또는 환경변수 확인이 필요해요</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : customers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>👋</Text>
          <Text style={styles.emptyText}>아직 등록된 고객이 없어요</Text>
          <Text style={styles.emptyHint}>오른쪽 아래 + 버튼으로 첫 고객을 등록해보세요</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.customerCard}
              onPress={() => router.push({ pathname: '/customer/[id]', params: { id: item.id } })}>
              <View
                style={[styles.gradeCircle, { backgroundColor: GRADE_COLOR[item.grade] }]}>
                <Text style={styles.gradeCircleText}>{item.grade}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.customerNameRow}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.customerActivity}>{formatActivity(item.updated_at)}</Text>
                </View>
                {item.company && <Text style={styles.customerCompany}>{item.company}</Text>}
                <View style={styles.customerMeta}>
                  {item.region_tag && (
                    <Text style={styles.customerRegion}>📍 {item.region_tag}</Text>
                  )}
                  {item.memo && (
                    <Text style={styles.customerMemo} numberOfLines={1}>
                      {item.memo}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/customer/new')}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    padding: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
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

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#475569', textAlign: 'center' },
  emptyHint: { fontSize: 13, color: '#94A3B8', marginTop: 8, textAlign: 'center' },

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
