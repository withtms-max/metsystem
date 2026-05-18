/**
 * 사용자 현재 위치 — Web 브라우저 Geolocation API.
 *
 * V1: 포그라운드 한정 (앱 열려있을 때만).
 * V2 (네이티브 빌드 후): expo-location + expo-task-manager + 백그라운드 푸시
 *
 * 사용 패턴:
 *   const { coords, request, status } = useUserLocation();
 *   coords?.lat / coords?.lng 활용
 */

import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export interface UserCoords {
  lat: number;
  lng: number;
  /** 정확도 (m) */
  accuracy: number;
  /** 마지막 측정 시각 */
  at: number;
}

export function useUserLocation() {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      setError('현재 위치 사용 불가 (네이티브 빌드 후 지원)');
      return;
    }

    setStatus('requesting');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          at: Date.now(),
        });
        setStatus('granted');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setError('위치 권한이 거부됐어요. 브라우저 주소창 좌측 자물쇠 → 위치 허용');
        } else {
          setStatus('unavailable');
          setError(err.message || '위치를 가져올 수 없어요');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    );
  }, []);

  return { coords, status, error, request };
}
