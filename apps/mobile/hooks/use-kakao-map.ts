/**
 * Kakao Maps JavaScript SDK 동적 로더 (web 한정)
 *
 * 문서: https://apis.map.kakao.com/web/guide/
 * 키: EXPO_PUBLIC_KAKAO_JS_KEY (.env.local)
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const SCRIPT_ID = 'kakao-maps-script';

type KakaoMaps = {
  Map: new (container: HTMLElement, options: { center: unknown; level: number }) => unknown;
  LatLng: new (lat: number, lng: number) => unknown;
  Marker: new (options: {
    position: unknown;
    map?: unknown;
    image?: unknown;
    title?: string;
  }) => {
    setMap: (map: unknown | null) => void;
  };
  MarkerImage: new (
    src: string,
    size: unknown,
    options?: { offset?: unknown },
  ) => unknown;
  Size: new (w: number, h: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  event: {
    addListener: (target: unknown, type: string, handler: () => void) => void;
  };
  load?: (cb: () => void) => void;
};

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

function buildSrc(jsKey: string): string {
  return `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false`;
}

function loadKakaoMaps(jsKey: string): Promise<KakaoMaps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Kakao Map 은 웹에서만 동작'));
  }
  if (window.kakao?.maps?.Map) {
    return Promise.resolve(window.kakao.maps);
  }

  return new Promise((resolve, reject) => {
    const finalize = () => {
      if (!window.kakao?.maps?.load) {
        reject(new Error('Kakao SDK 로드 실패 (load 함수 없음)'));
        return;
      }
      window.kakao.maps.load(() => {
        if (window.kakao?.maps?.Map) resolve(window.kakao.maps);
        else reject(new Error('Kakao SDK 초기화 실패'));
      });
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.kakao?.maps?.load) finalize();
      else existing.addEventListener('load', finalize);
      existing.addEventListener('error', () => reject(new Error('Kakao SDK 스크립트 에러')));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = buildSrc(jsKey);
    script.async = true;
    script.onload = finalize;
    script.onerror = () => reject(new Error('Kakao SDK 스크립트 에러'));
    document.head.appendChild(script);
  });
}

export function useKakaoMaps() {
  const [maps, setMaps] = useState<KakaoMaps | null>(null);
  const [error, setError] = useState<string | null>(null);

  const jsKey = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '';

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!jsKey) {
      setError('EXPO_PUBLIC_KAKAO_JS_KEY 가 .env.local 에 없어요');
      return;
    }

    let cancelled = false;
    loadKakaoMaps(jsKey)
      .then((m) => !cancelled && setMaps(m))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : '로드 실패'));

    return () => {
      cancelled = true;
    };
  }, [jsKey]);

  return { maps, error, ready: !!maps };
}

export type { KakaoMaps };
