import { Ionicons } from '@expo/vector-icons';
import {
  formatDistance,
  haversineKm,
  type Customer,
  type CustomerGrade,
} from '@metsystem/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomerMap, explodeCustomerPins, type CustomerPin } from '@/components/customer-map';
import { CustomerMapSheet } from '@/components/customer-map-sheet';
import { useCustomers } from '@/hooks/use-customers';
import { useUserLocation } from '@/hooks/use-user-location';
import { GradeColor, Palette, Radius } from '@/constants/theme';

/** 지오펜싱 반경 (km) — 이 안에 있으면 "근처" */
const GEOFENCE_RADIUS_KM = 3;

/**
 * 지도 탭 (구 "동선")
 *
 * 부동산 앱 스타일:
 *  · 지도 위 등급별 핀
 *  · 핀 클릭 → 슬라이드업 카드 (최근 활동·전화·길찾기·상세)
 *  · 상단 등급 필터 + 지역 칩
 *  · 지오펜싱 배너 — "근처에 N명 있어요"
 */
export default function MapScreen() {
  const router = useRouter();
  const { customers, isLoading, reload } = useCustomers();
  const { coords: myCoords, request: requestMyLocation, status: locationStatus } =
    useUserLocation();
  const [gradeFilter, setGradeFilter] = useState<CustomerGrade | null>(null);

  // 탭 진입 시마다 최신 고객 목록 다시 가져오기 (새로고침 불필요)
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<CustomerPin | null>(null);

  // 등급별 카운트
  const gradeCounts = useMemo(() => {
    const c: Record<CustomerGrade, number> = { A: 0, B: 0, C: 0, D: 0 };
    customers.forEach((cu) => {
      c[cu.grade] = (c[cu.grade] ?? 0) + 1;
    });
    return c;
  }, [customers]);

  // 지역별 그룹 (좌표 없는 고객 포함 — 지역 필터링용)
  const regionGroups = useMemo(() => {
    const map = new Map<string, Customer[]>();
    customers.forEach((c) => {
      if (!c.region_tag) return;
      const arr = map.get(c.region_tag) ?? [];
      arr.push(c);
      map.set(c.region_tag, arr);
    });
    return Array.from(map.entries())
      .map(([region, list]) => ({ region, count: list.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [customers]);

  // 필터 적용
  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (gradeFilter && c.grade !== gradeFilter) return false;
      if (regionFilter && c.region_tag !== regionFilter) return false;
      return true;
    });
  }, [customers, gradeFilter, regionFilter]);

  const pinCount = explodeCustomerPins(filtered).length;
  const pinnedCustomerCount = filtered.filter(
    (c) =>
      (c.latitude != null && c.longitude != null) ||
      (c.home_latitude != null && c.home_longitude != null) ||
      (c.contract_latitude != null && c.contract_longitude != null),
  ).length;
  const missingCoordsCount = filtered.length - pinnedCustomerCount;

  // 지오펜싱: 내 위치 기준 반경 내 핀 찾기
  const nearby = useMemo(() => {
    if (!myCoords) return [];
    const allPins = explodeCustomerPins(filtered);
    return allPins
      .map((p) => ({ pin: p, distKm: haversineKm(myCoords, { lat: p.lat, lng: p.lng }) }))
      .filter((x) => x.distKm <= GEOFENCE_RADIUS_KM)
      .sort((a, b) => a.distKm - b.distKm);
  }, [myCoords, filtered]);

  const topNearbyGrade = nearby.find((x) => ['A', 'B'].includes(x.pin.customer.grade));

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Palette.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Palette.card }}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>지도</Text>
              <Text style={styles.headerSub}>
                {pinnedCustomerCount}명 · {pinCount}개 핀
                {missingCoordsCount > 0 && ` · ${missingCoordsCount}명 주소 미등록`}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.refreshBtn, myCoords && styles.refreshBtnActive]}
              onPress={requestMyLocation}>
              <Ionicons
                name="locate"
                size={16}
                color={myCoords ? Palette.primary : Palette.textSub}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => {
                setGradeFilter(null);
                setRegionFilter(null);
              }}>
              <Ionicons name="refresh" size={16} color={Palette.textSub} />
            </TouchableOpacity>
          </View>

          {/* 지오펜싱 배너 */}
          {locationStatus === 'requesting' && (
            <View style={styles.geoBanner}>
              <Ionicons name="locate" size={14} color={Palette.textSub} />
              <Text style={styles.geoBannerText}>현재 위치 확인 중...</Text>
            </View>
          )}
          {locationStatus === 'denied' && (
            <View style={[styles.geoBanner, { backgroundColor: Palette.redBg }]}>
              <Ionicons name="alert-circle" size={14} color={Palette.red} />
              <Text style={[styles.geoBannerText, { color: Palette.red }]}>
                위치 권한 거부됨 — 주소창 좌측 자물쇠 → 위치 허용
              </Text>
            </View>
          )}
          {myCoords && nearby.length > 0 && (
            <View style={styles.geoBannerOk}>
              <Ionicons name="navigate" size={14} color={Palette.primary} />
              <Text style={styles.geoBannerOkText}>
                {GEOFENCE_RADIUS_KM}km 안에 {nearby.length}명 ·{' '}
                {topNearbyGrade
                  ? `${topNearbyGrade.pin.customer.company ?? topNearbyGrade.pin.customer.name} (${topNearbyGrade.pin.customer.grade}급) ${formatDistance(topNearbyGrade.distKm)}`
                  : `가장 가까운 ${formatDistance(nearby[0].distKm)}`}
              </Text>
            </View>
          )}
          {myCoords && nearby.length === 0 && (
            <View style={styles.geoBanner}>
              <Ionicons name="location-outline" size={14} color={Palette.textMuted} />
              <Text style={styles.geoBannerText}>
                {GEOFENCE_RADIUS_KM}km 안에 등록된 고객이 없어요
              </Text>
            </View>
          )}

          {/* 등급 필터 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}>
            <FilterChip
              label="전체"
              active={gradeFilter === null}
              onPress={() => setGradeFilter(null)}
              count={customers.length}
            />
            {(['A', 'B', 'C', 'D'] as CustomerGrade[]).map((g) => {
              const color = GradeColor[g];
              return (
                <FilterChip
                  key={g}
                  label={`${g}급`}
                  active={gradeFilter === g}
                  onPress={() => setGradeFilter(gradeFilter === g ? null : g)}
                  count={gradeCounts[g]}
                  color={color.dot}
                />
              );
            })}
          </ScrollView>

          {/* 지역 필터 */}
          {regionGroups.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}>
              {regionGroups.map((g) => (
                <FilterChip
                  key={g.region}
                  label={g.region}
                  active={regionFilter === g.region}
                  onPress={() => setRegionFilter(regionFilter === g.region ? null : g.region)}
                  count={g.count}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>

      {/* 지도 본체 — 내 위치 있으면 그쪽으로 중심 + 파란 점 */}
      <CustomerMap
        customers={filtered}
        onPinPress={(pin) => setSelectedPin(pin)}
        center={myCoords ? { lat: myCoords.lat, lng: myCoords.lng } : undefined}
        userLocation={myCoords ? { lat: myCoords.lat, lng: myCoords.lng } : null}
      />

      {/* 부동산식 슬라이드업 */}
      <CustomerMapSheet
        pin={selectedPin}
        onClose={() => setSelectedPin(null)}
        onOpenDetail={(id) => {
          setSelectedPin(null);
          router.push({ pathname: '/customer/[id]', params: { id } });
        }}
      />
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  count,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  count: number;
  color?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}>
      {color && <View style={[styles.chipDot, { backgroundColor: color }]} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label} {count}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.bg },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    gap: 8,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Palette.textMain, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: Palette.textSub, marginTop: 2 },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.grayBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  refreshBtnActive: { backgroundColor: Palette.primarySoft },

  geoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.grayBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    marginTop: 6,
  },
  geoBannerText: { fontSize: 12, color: Palette.textSub, fontWeight: '500', flex: 1 },
  geoBannerOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginTop: 6,
  },
  geoBannerOkText: { fontSize: 12, color: Palette.primaryDeep, fontWeight: '700', flex: 1 },

  chipRow: { gap: 6, paddingRight: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.grayBg,
  },
  chipActive: { backgroundColor: Palette.textMain },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12, fontWeight: '600', color: Palette.textSub },
  chipTextActive: { color: '#FFFFFF' },
});
