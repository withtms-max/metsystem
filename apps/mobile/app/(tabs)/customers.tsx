import { Ionicons } from '@expo/vector-icons';
import {
  buildNaturalMarketCsv,
  downloadCsv,
  timestampForFilename,
  type Customer,
  type CustomerGrade,
} from '@metsystem/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCustomers } from '@/hooks/use-customers';
import { GradeColor, Palette, Radius } from '@/constants/theme';

const GRADES: ('전체' | CustomerGrade)[] = ['전체', 'A', 'B', 'C', 'D'];

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

  const handleExportMyData = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('CSV', '현재 웹 브라우저에서만 지원돼요.');
      return;
    }
    if (customers.length === 0) {
      Alert.alert('알림', '내보낼 고객이 없어요');
      return;
    }
    downloadCsv(
      `내추럴마켓리스트_${timestampForFilename()}.csv`,
      buildNaturalMarketCsv(customers),
    );
  };

  const handleDownloadTemplate = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('빈 양식', '모바일 네이티브에서는 다음 업데이트에 지원 예정입니다.');
      return;
    }
    const url = `${window.location.protocol}//${window.location.hostname}:3000/templates/챙김_고객관리_통합양식.xlsx`;
    const link = document.createElement('a');
    link.href = url;
    link.download = '챙김_고객관리_통합양식.xlsx';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>고객</Text>
              <Text style={styles.headerSub}>총 {customers.length}명</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={handleDownloadTemplate} hitSlop={6}>
                <Ionicons name="document-text-outline" size={18} color={Palette.textMain} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handleExportMyData} hitSlop={6}>
                <Ionicons name="download-outline" size={18} color={Palette.textMain} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => router.push('/customer/new')}
                activeOpacity={0.85}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>고객 추가</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 검색 */}
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={Palette.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="이름 또는 회사 검색"
              placeholderTextColor={Palette.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={Palette.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* 등급 필터 */}
          <View style={styles.filterRow}>
            {GRADES.map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setSelectedGrade(g)}
                style={[styles.chip, selectedGrade === g && styles.chipActive]}
                activeOpacity={0.7}>
                <Text style={[styles.chipText, selectedGrade === g && styles.chipTextActive]}>
                  {g === '전체' ? g : `${g}등급`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 지역 필터 (있을 때만) */}
          {regionOptions.length > 1 && (
            <View style={[styles.filterRow, { marginTop: 8 }]}>
              {regionOptions.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setSelectedRegion(r)}
                  style={[styles.chip, selectedRegion === r && styles.chipActiveAlt]}
                  activeOpacity={0.7}>
                  <Text style={[styles.chipText, selectedRegion === r && styles.chipTextActive]}>
                    {r === '전체' ? '전체 지역' : r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </SafeAreaView>

      {error ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="alert-circle-outline" size={28} color={Palette.orange} />
          </View>
          <Text style={styles.emptyTitle}>불러올 수 없어요</Text>
          <Text style={styles.emptySub}>{error.message}</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={Palette.primary} />
        </View>
      ) : customers.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="people-outline" size={28} color={Palette.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>아직 등록된 고객이 없어요</Text>
          <Text style={styles.emptySub}>우측 상단 + 고객 추가로 시작해보세요</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <CustomerCard
              customer={item}
              onPress={() =>
                router.push({ pathname: '/customer/[id]', params: { id: item.id } })
              }
            />
          )}
        />
      )}
    </View>
  );
}

function CustomerCard({ customer, onPress }: { customer: Customer; onPress: () => void }) {
  const grade = GradeColor[customer.grade];
  const initial = (customer.company ?? customer.name).slice(0, 1);

  return (
    <TouchableOpacity style={styles.customerCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.customerAvatar, { backgroundColor: grade.bg }]}>
        <Text style={[styles.customerAvatarText, { color: grade.fg }]}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.customerHeadRow}>
          <Text style={styles.customerCompany} numberOfLines={1}>
            {customer.company ?? customer.name}
          </Text>
          <Text style={styles.customerActivity}>{formatActivity(customer.updated_at)}</Text>
        </View>
        <Text style={styles.customerContact} numberOfLines={1}>
          {customer.name}
          {customer.job_title ? ` · ${customer.job_title}` : ''}
        </Text>
        <View style={styles.customerMeta}>
          <View style={[styles.gradeChip, { backgroundColor: grade.bg }]}>
            <View style={[styles.gradeDot, { backgroundColor: grade.dot }]} />
            <Text style={[styles.gradeChipText, { color: grade.fg }]}>
              {customer.grade}등급
            </Text>
          </View>
          {customer.region_tag && (
            <View style={styles.regionChip}>
              <Ionicons name="location-outline" size={11} color={Palette.textSub} />
              <Text style={styles.regionText}>{customer.region_tag}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },

  // Header — Toss style 라이트 톤
  header: {
    backgroundColor: Palette.card,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: Palette.textSub, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.grayBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Radius.md,
    marginLeft: 2,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.grayBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Palette.textMain },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Palette.grayBg,
    borderRadius: Radius.pill,
  },
  chipActive: { backgroundColor: Palette.textMain },
  chipActiveAlt: { backgroundColor: Palette.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: Palette.textSub },
  chipTextActive: { color: '#FFFFFF' },

  // List
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  customerCard: {
    flexDirection: 'row',
    backgroundColor: Palette.card,
    padding: 14,
    borderRadius: Radius.lg,
    marginBottom: 8,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerAvatarText: { fontWeight: '700', fontSize: 17 },

  customerHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerCompany: { fontSize: 15, fontWeight: '700', color: Palette.textMain, flex: 1 },
  customerActivity: { fontSize: 11, color: Palette.textMuted, marginLeft: 8 },
  customerContact: { fontSize: 12, color: Palette.textSub, marginTop: 2 },
  customerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },

  gradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  gradeDot: { width: 6, height: 6, borderRadius: 3 },
  gradeChipText: { fontSize: 11, fontWeight: '600' },
  regionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
  },
  regionText: { fontSize: 11, color: Palette.textSub, fontWeight: '500' },

  // Empty
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
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Palette.textMain, marginBottom: 6 },
  emptySub: { fontSize: 13, color: Palette.textSub, textAlign: 'center', lineHeight: 20 },
});
