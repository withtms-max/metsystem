import type { Customer } from '@metsystem/shared';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { GradeColor, Palette } from '@/constants/theme';
import { useKakaoMaps } from '@/hooks/use-kakao-map';

export type PinKind = 'work' | 'home' | 'contract';

/** 핀 한 개 = (고객, 주소 종류, 좌표) */
export interface CustomerPin {
  customer: Customer;
  kind: PinKind;
  lat: number;
  lng: number;
}

interface Props {
  customers: Customer[];
  onPinPress: (pin: CustomerPin) => void;
  center?: { lat: number; lng: number };
  /** 사용자 현재 위치 — 표시되면 파란 점 마커 */
  userLocation?: { lat: number; lng: number } | null;
}

const SEOUL_CITY_HALL = { lat: 37.5666103, lng: 126.9783882 };

const KIND_EMOJI: Record<PinKind, string> = {
  work: '🏢',
  home: '🏠',
  contract: '📝',
};

/** 한 고객의 등록된 주소 갯수만큼 핀으로 펼침 */
export function explodeCustomerPins(customers: Customer[]): CustomerPin[] {
  const pins: CustomerPin[] = [];
  for (const c of customers) {
    if (c.latitude != null && c.longitude != null) {
      pins.push({ customer: c, kind: 'work', lat: c.latitude, lng: c.longitude });
    }
    if (c.home_latitude != null && c.home_longitude != null) {
      pins.push({
        customer: c,
        kind: 'home',
        lat: c.home_latitude,
        lng: c.home_longitude,
      });
    }
    if (c.contract_latitude != null && c.contract_longitude != null) {
      pins.push({
        customer: c,
        kind: 'contract',
        lat: c.contract_latitude,
        lng: c.contract_longitude,
      });
    }
  }
  return pins;
}

/**
 * 카카오 맵에 고객 다중 핀 표시.
 * - 등급별 컬러 + 주소 종류별 이모지 라벨
 * - 핀 클릭 → onPinPress(pin)
 */
export function CustomerMap({ customers, onPinPress, center, userLocation }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { maps, ready, error } = useKakaoMaps();
  const markersRef = useRef<{ marker: { setMap: (m: unknown) => void } }[]>([]);

  const pins = explodeCustomerPins(customers);

  useEffect(() => {
    if (!ready || !maps || !containerRef.current) return;

    const initialCenter = center
      ? new maps.LatLng(center.lat, center.lng)
      : pins.length > 0
        ? new maps.LatLng(pins[0].lat, pins[0].lng)
        : new maps.LatLng(SEOUL_CITY_HALL.lat, SEOUL_CITY_HALL.lng);

    const map = new maps.Map(containerRef.current, {
      center: initialCenter,
      level: pins.length > 0 ? 7 : 10,
    });

    markersRef.current.forEach((m) => m.marker.setMap(null));
    markersRef.current = [];

    // 등급 색 + 종류 이모지 박힌 SVG 마커
    const makeMarkerSvg = (color: string, emoji: string) =>
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
          <path d="M18 0C8.1 0 0 8.1 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.1 27.9 0 18 0z" fill="${color}"/>
          <circle cx="18" cy="18" r="11" fill="white"/>
          <text x="18" y="23" text-anchor="middle" font-size="14" font-family="Arial,sans-serif">${emoji}</text>
        </svg>`,
      )}`;

    // 사용자 위치 — 파란 점
    if (userLocation) {
      const userImage = new maps.MarkerImage(
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="9" fill="#3182F6" fill-opacity="0.25"/>
            <circle cx="10" cy="10" r="6" fill="#3182F6" stroke="white" stroke-width="2"/>
          </svg>`,
        )}`,
        new maps.Size(20, 20),
        { offset: new maps.Point(10, 10) },
      );
      const userMarker = new maps.Marker({
        position: new maps.LatLng(userLocation.lat, userLocation.lng),
        map,
        image: userImage,
        title: '내 위치',
      });
      markersRef.current.push({ marker: userMarker });
    }

    pins.forEach((pin) => {
      const dotColor = GradeColor[pin.customer.grade].dot;
      const image = new maps.MarkerImage(
        makeMarkerSvg(dotColor, KIND_EMOJI[pin.kind]),
        new maps.Size(36, 44),
        { offset: new maps.Point(18, 44) },
      );
      const marker = new maps.Marker({
        position: new maps.LatLng(pin.lat, pin.lng),
        map,
        image,
        title: `${pin.customer.company ?? pin.customer.name} · ${kindLabel(pin.kind)}`,
      });
      maps.event.addListener(marker, 'click', () => onPinPress(pin));
      markersRef.current.push({ marker });
    });

    return () => {
      markersRef.current.forEach((m) => m.marker.setMap(null));
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, maps, pins.length, center?.lat, center?.lng, userLocation?.lat, userLocation?.lng]);

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
      {pins.length === 0 && (
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

export function kindLabel(kind: PinKind): string {
  return kind === 'work' ? '직장' : kind === 'home' ? '자택' : '계약 장소';
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
