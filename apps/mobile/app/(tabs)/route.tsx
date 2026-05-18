import { Ionicons } from '@expo/vector-icons';
import type { Customer, CustomerGrade } from '@metsystem/shared';
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
import { CustomerMap } from '@/components/customer-map';
import { CustomerMapSheet } from '@/components/customer-map-sheet';
import { useCustomers } from '@/hooks/use-customers';
import { GradeColor, Palette, Radius } from '@/constants/theme';

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
  const [gradeFilter, setGradeFilter] = useState<CustomerGrade | null>(null);

  // 탭 진입 시마다 최신 고객 목록 다시 가져오기 (새로고침 불필요)
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const pinnedCount = filtered.filter((c) => c.latitude != null && c.longitude != null).length;
  const missingCoordsCount = filtered.length - pinnedCount;
  const selected = selectedId ? customers.find((c) => c.id === selectedId) ?? null : null;

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
                {pinnedCount}명 표시 중
                {missingCoordsCount > 0 && ` · ${missingCoordsCount}명 주소 미등록`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => {
                setGradeFilter(null);
                setRegionFilter(null);
              }}>
              <Ionicons name="refresh" size={16} color={Palette.textSub} />
            </TouchableOpacity>
          </View>

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

      {/* 지도 본체 */}
      <CustomerMap customers={filtered} onPinPress={(id) => setSelectedId(id)} />

      {/* 부동산식 슬라이드업 */}
      <CustomerMapSheet
        customer={selected}
        onClose={() => setSelectedId(null)}
        onOpenDetail={(id) => {
          setSelectedId(null);
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
  },

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
