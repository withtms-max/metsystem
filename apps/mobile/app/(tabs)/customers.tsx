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
import { GradeColor, Palette, Radius, Shadow } from '@/constants/theme';

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
    const url = `${window.location.protocol}//${window.location.hostname}:3000/templates/MET_고객관리_통합양식.xlsx`;
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MET_고객관리_통합양식.xlsx';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.headerInner}>
          <View>
            <Text style={styles.headerTitle}>고객</Text>
            <Text style={styles.headerSub}>총 {customers.length}명</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleDownloadTemplate}>
              <Ionicons name="document-outline" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleExportMyData}>
              <Ionicons name="download-outline" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/customer/new')}>
              <Ionicons name="add" size={18} color={Palette.graphite} />
              <Text style={styles.addBtnText}>고객 추가</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Palette.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="이름 또는 회사 검색"
            placeholderTextColor={Palette.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </SafeAreaView>

      <View style={styles.filterRow}>
        {GRADES.map((g) => (
          <TouchableOpacity
            key={g}
            onPress={() => setSelectedGrade(g)}
            style={[styles.chip, selectedGrade === g && styles.chipActive]}>
            <Text style={[styles.chipText, selectedGrade === g && styles.chipTextActive]}>
              {g === '전체' ? g : `${g}등급`}
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
                {r === '전체' ? '전체' : `📍 ${r}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.listLabel}>전체 {customers.length}</Text>

      {error ? (
        <View style={styles.empty}>
          <Ionicons name="warning-outline" size={48} color={Palette.orange} />
          <Text style={styles.emptyText}>{error.message}</Text>
          <Text style={styles.emptyHint}>Supabase 연결 또는 환경변수 확인 필요</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={Palette.primary} />
        </View>
      ) : customers.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={48} color={Palette.textMuted} />
          <Text style={styles.emptyText}>아직 등록된 고객이 없어요</Text>
          <Text style={styles.emptyHint}>우측 상단 + 버튼으로 첫 고객을 등록해보세요</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <CustomerCard customer={item} onPress={() => router.push({ pathname: '/customer/[id]', params: { id: item.id } })} />}
        />
      )}
    </View>
  );
}

function CustomerCard({ customer, onPress }: { customer: Customer; onPress: () => void }) {
  const grade = GradeColor[customer.grade];

  return (
    <TouchableOpacity style={styles.customerCard} onPress={onPress}>
      <View style={styles.customerAvatar}>
        <Text style={styles.customerAvatarText}>
          {(customer.company ?? customer.name).slice(0, 1)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.customerHeadRow}>
          <Text style={styles.customerCompany} numberOfLines={1}>
            {customer.company ?? customer.name}
          </Text>
          <Text style={styles.customerActivity}>{formatActivity(customer.updated_at)}</Text>
        </View>
        <Text style={styles.customerContact}>
          담당자: {customer.name}
          {customer.job_title ? ` ${customer.job_title}` : ''}
        </Text>
        <View style={styles.customerMeta}>
          <View style={[styles.gradeChip, { backgroundColor: grade.bg }]}>
            <View style={[styles.gradeDot, { backgroundColor: grade.dot }]} />
            <Text style={[styles.gradeChipText, { color: grade.fg }]}>
              {customer.grade}등급
            </Text>
          </View>
          {customer.region_tag && (
            <Text style={styles.metaSep}>·</Text>
          )}
          {customer.region_tag && (
            <Text style={styles.regionText}>📍 {customer.region_tag}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.moreBtn} hitSlop={8}>
        <Ionicons name="ellipsis-vertical" size={16} color={Palette.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },

  // Header
  headerWrap: { backgroundColor: Palette.graphite, paddingBottom: 16 },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: '#CBD5E1', marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: Palette.graphite },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#FFFFFF' },

  // Filters
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Palette.card,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  chipActive: { backgroundColor: Palette.graphite, borderColor: Palette.graphite },
  chipActiveAlt: { backgroundColor: Palette.primary, borderColor: Palette.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: Palette.textSub },
  chipTextActive: { color: '#FFFFFF' },

  listLabel: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    fontSize: 12,
    color: Palette.textSub,
    fontWeight: '600',
  },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 24 },
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
    ...Shadow.card,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerAvatarText: { color: Palette.primaryDeep, fontWeight: '700', fontSize: 16 },

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
  metaSep: { color: Palette.textMuted, fontSize: 11 },
  regionText: { fontSize: 11, color: Palette.textSub, fontWeight: '500' },

  moreBtn: { padding: 4 },

  // Empty
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14, fontWeight: '600', color: Palette.textMain, marginTop: 16 },
  emptyHint: { fontSize: 12, color: Palette.textSub, marginTop: 6, textAlign: 'center' },
});
