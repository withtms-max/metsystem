import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCustomers } from '@/hooks/use-customers';
import { GradeColor, Palette, Radius } from '@/constants/theme';
import type { Customer } from '@metsystem/shared';

export default function RouteScreen() {
  const router = useRouter();
  const { customers, isLoading } = useCustomers();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // 지역별 고객 집계
  const regionGroups = useMemo(() => {
    const map = new Map<string, Customer[]>();
    customers.forEach((c) => {
      if (!c.region_tag) return;
      const arr = map.get(c.region_tag) ?? [];
      arr.push(c);
      map.set(c.region_tag, arr);
    });
    return Array.from(map.entries())
      .map(([region, list]) => ({ region, customers: list }))
      .sort((a, b) => b.customers.length - a.customers.length);
  }, [customers]);

  // 선택된 지역의 고객 (A·B 우선)
  const nearbyCustomers = useMemo(() => {
    if (!selectedRegion) return [];
    const group = regionGroups.find((g) => g.region === selectedRegion);
    if (!group) return [];
    const gradeOrder: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    return [...group.customers].sort(
      (a, b) => (gradeOrder[a.grade] ?? 9) - (gradeOrder[b.grade] ?? 9),
    );
  }, [selectedRegion, regionGroups]);

  const topRegion = regionGroups[0];
  const highGradeNearby = topRegion?.customers.filter((c) => c.grade === 'A' || c.grade === 'B') ?? [];

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Palette.primary} />
      </View>
    );
  }

  if (regionGroups.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>동선</Text>
            <Text style={styles.headerSub}>지역 태그가 있는 고객이 없어요</Text>
          </View>
        </SafeAreaView>
        <View style={styles.empty}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="location-outline" size={28} color={Palette.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>아직 지역 정보가 없어요</Text>
          <Text style={styles.emptySub}>
            고객 등록 시 주소를 적으면 지역이 자동 태깅돼요
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>동선</Text>
          <Text style={styles.headerSub}>지역 선택하면 근처 고객이 보여요</Text>

          {/* 지오펜싱 알림 (Top 지역 + A/B급) */}
          {topRegion && highGradeNearby.length > 0 && (
            <TouchableOpacity
              style={styles.banner}
              activeOpacity={0.9}
              onPress={() => setSelectedRegion(topRegion.region)}>
              <View style={styles.bannerIcon}>
                <Ionicons name="navigate" size={16} color={Palette.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>
                  {topRegion.region} 쪽에 A·B급 {highGradeNearby.length}명 있어요
                </Text>
                <Text style={styles.bannerSub}>커피 한 잔 어때요?</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Palette.primary} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <FlatList
        data={
          selectedRegion
            ? nearbyCustomers
            : []
        }
        ListHeaderComponent={
          <View style={styles.regionSection}>
            <Text style={styles.sectionLabel}>지역별 고객</Text>
            <View style={styles.regionGrid}>
              <RegionCard
                region="전체"
                count={customers.length}
                selected={selectedRegion === null}
                onPress={() => setSelectedRegion(null)}
              />
              {regionGroups.map((g) => (
                <RegionCard
                  key={g.region}
                  region={g.region}
                  count={g.customers.length}
                  selected={selectedRegion === g.region}
                  onPress={() => setSelectedRegion(g.region)}
                />
              ))}
            </View>

            {selectedRegion && (
              <View style={styles.nearSection}>
                <View style={styles.nearHeader}>
                  <Ionicons name="flame" size={14} color={Palette.orange} />
                  <Text style={styles.nearLabel}>{selectedRegion} 근처</Text>
                  <Text style={styles.nearCount}>{nearbyCustomers.length}명</Text>
                </View>
              </View>
            )}
          </View>
        }
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <NearbyCard
            customer={item}
            onPress={() =>
              router.push({ pathname: '/customer/[id]', params: { id: item.id } })
            }
          />
        )}
        ListEmptyComponent={
          selectedRegion ? (
            <Text style={styles.emptyInline}>{selectedRegion} 지역에 고객이 없어요</Text>
          ) : (
            <Text style={styles.emptyInline}>지역을 선택하면 근처 고객이 보여요</Text>
          )
        }
      />
    </View>
  );
}

function RegionCard({
  region,
  count,
  selected,
  onPress,
}: {
  region: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.regionCard, selected && styles.regionCardActive]}
      onPress={onPress}
      activeOpacity={0.8}>
      <Text style={[styles.regionName, selected && styles.regionNameActive]}>{region}</Text>
      <Text style={[styles.regionCount, selected && styles.regionCountActive]}>
        {count}명
      </Text>
    </TouchableOpacity>
  );
}

function NearbyCard({ customer, onPress }: { customer: Customer; onPress: () => void }) {
  const grade = GradeColor[customer.grade];
  const initial = (customer.company ?? customer.name).slice(0, 1);

  const handleCall = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (customer.phone) Linking.openURL(`tel:${customer.phone}`).catch(() => {});
  };

  return (
    <TouchableOpacity style={styles.nearbyCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.nearbyAvatar, { backgroundColor: grade.bg }]}>
        <Text style={[styles.nearbyAvatarText, { color: grade.fg }]}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.nearbyRow}>
          <Text style={styles.nearbyName}>{customer.company ?? customer.name}</Text>
        </View>
        <Text style={styles.nearbyContact}>
          {customer.name}
          {customer.job_title ? ` · ${customer.job_title}` : ''}
        </Text>
        <View style={styles.nearbyMeta}>
          <View style={[styles.gradeChip, { backgroundColor: grade.bg }]}>
            <View style={[styles.gradeDot, { backgroundColor: grade.dot }]} />
            <Text style={[styles.gradeChipText, { color: grade.fg }]}>
              {customer.grade}등급
            </Text>
          </View>
          {customer.memo && (
            <Text style={styles.nearbyMemo} numberOfLines={1}>
              {customer.memo}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.callBtn, !customer.phone && styles.callBtnDisabled]}
        onPress={handleCall}
        disabled={!customer.phone}
        hitSlop={6}>
        <Ionicons name="call" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },

  // Header
  header: {
    backgroundColor: Palette.card,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: Palette.textSub, marginTop: 2 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primarySoft,
    padding: 12,
    borderRadius: Radius.md,
    gap: 10,
    marginTop: 12,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: { fontSize: 13, fontWeight: '700', color: Palette.primaryDeep },
  bannerSub: { fontSize: 11, color: Palette.primary, marginTop: 2 },

  // Region grid
  regionSection: { padding: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textMain,
    marginBottom: 10,
  },
  regionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  regionCard: {
    flexBasis: '48%',
    backgroundColor: Palette.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  regionCardActive: {
    backgroundColor: Palette.textMain,
    borderColor: Palette.textMain,
  },
  regionName: { fontSize: 14, fontWeight: '600', color: Palette.textMain },
  regionNameActive: { color: '#FFFFFF' },
  regionCount: { fontSize: 12, fontWeight: '600', color: Palette.textMuted },
  regionCountActive: { color: 'rgba(255,255,255,0.7)' },

  // Nearby section header
  nearSection: { marginTop: 24 },
  nearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  nearLabel: { fontSize: 13, fontWeight: '700', color: Palette.textMain, flex: 1 },
  nearCount: { fontSize: 12, color: Palette.textMuted, fontWeight: '600' },

  // List
  list: { paddingBottom: 24 },

  nearbyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 12,
  },
  nearbyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nearbyAvatarText: { fontWeight: '700', fontSize: 16 },
  nearbyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nearbyName: { fontSize: 14, fontWeight: '700', color: Palette.textMain },
  nearbyContact: { fontSize: 12, color: Palette.textSub, marginTop: 2 },
  nearbyMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },

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
  nearbyMemo: { fontSize: 11, color: Palette.textMuted, flex: 1 },

  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtnDisabled: { backgroundColor: Palette.borderStrong },

  emptyInline: {
    color: Palette.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 32,
  },

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
