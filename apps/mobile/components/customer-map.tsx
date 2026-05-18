import type { Customer } from '@metsystem/shared';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { GradeColor, Palette } from '@/constants/theme';
import { useKakaoMaps } from '@/hooks/use-kakao-map';

interface Props {
  customers: Customer[];
  onPinPress: (customerId: string) => void;
  /** 초기 중심 좌표 (없으면 첫 고객 또는 서울 시청) */
  center?: { lat: number; lng: number };
}

const SEOUL_CITY_HALL = { lat: 37.5666103, lng: 126.9783882 };

/**
 * 카카오 맵에 고객 핀 표시.
 * - 등급별 컬러 마커 (A 빨강, B 주황, C 블루, D 그레이)
 * - 마커 클릭 → onPinPress(customerId)
 * - Web 전용 — 네이티브는 안내 텍스트
 */
export function CustomerMap({ customers, onPinPress, center }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { maps, ready, error } = useKakaoMaps();
  const markersRef = useRef<{ marker: { setMap: (m: unknown) => void } }[]>([]);

  // 좌표가 있는 고객만
  const pinned = customers.filter(
    (c): c is Customer & { latitude: number; longitude: number } =>
      c.latitude != null && c.longitude != null,
  );

  useEffect(() => {
    if (!ready || !maps || !containerRef.current) return;

    const initialCenter = center
      ? new maps.LatLng(center.lat, center.lng)
      : pinned.length > 0
        ? new maps.LatLng(pinned[0].latitude, pinned[0].longitude)
        : new maps.LatLng(SEOUL_CITY_HALL.lat, SEOUL_CITY_HALL.lng);

    const map = new maps.Map(containerRef.current, {
      center: initialCenter,
      level: pinned.length > 0 ? 7 : 10,
    });

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.marker.setMap(null));
    markersRef.current = [];

    // SVG 데이터 URI로 등급별 마커
    const makeMarkerSvg = (color: string) =>
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24c0-8.8-7.2-16-16-16z" fill="${color}"/>
          <circle cx="16" cy="16" r="6" fill="white"/>
        </svg>`,
      )}`;

    pinned.forEach((c) => {
      const dotColor = GradeColor[c.grade].dot;
      const image = new maps.MarkerImage(
        makeMarkerSvg(dotColor),
        new maps.Size(32, 40),
        { offset: new maps.Point(16, 40) },
      );
      const marker = new maps.Marker({
        position: new maps.LatLng(c.latitude, c.longitude),
        map,
        image,
        title: c.company ?? c.name,
      });
      maps.event.addListener(marker, 'click', () => onPinPress(c.id));
      markersRef.current.push({ marker });
    });

    return () => {
      markersRef.current.forEach((m) => m.marker.setMap(null));
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, maps, pinned.length, center?.lat, center?.lng]);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.nativeFallback}>
        <Text style={styles.nativeTitle}>📱 지도 보기는 곧 지원돼요</Text>
        <Text style={styles.nativeSub}>
          현재는 웹 버전에서만 지원합니다. 모바일 앱은 다음 업데이트에 포함됩니다.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorTitle}>지도 로드 실패</Text>
        <Text style={styles.errorMsg}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.loadingBox}>
        <Text style={styles.loadingText}>지도 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <div ref={containerRef} style={webMapStyle} />
      {pinned.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyTitle}>아직 좌표가 있는 고객이 없어요</Text>
          <Text style={styles.emptySub}>
            고객 등록 시 주소 검색을 사용하면 자동으로 지도에 표시돼요
          </Text>
        </View>
      )}
    </View>
  );
}

const webMapStyle = {
  width: '100%',
  height: '100%',
  minHeight: '400px',
} as const;

const styles = StyleSheet.create({
  wrap: { flex: 1, position: 'relative', backgroundColor: Palette.grayBg },
  nativeFallback: {
    flex: 1,
    backgroundColor: Palette.grayBg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  nativeTitle: { fontSize: 15, fontWeight: '700', color: Palette.textMain, marginBottom: 8 },
  nativeSub: {
    fontSize: 13,
    color: Palette.textSub,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    flex: 1,
    backgroundColor: Palette.redBg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: { fontSize: 14, fontWeight: '700', color: Palette.red, marginBottom: 6 },
  errorMsg: { fontSize: 12, color: Palette.red, textAlign: 'center' },
  loadingBox: {
    flex: 1,
    backgroundColor: Palette.grayBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: Palette.textMuted, fontSize: 13 },
  emptyOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: Palette.textMain, marginBottom: 4 },
  emptySub: { fontSize: 12, color: Palette.textSub, textAlign: 'center', lineHeight: 18 },
});
