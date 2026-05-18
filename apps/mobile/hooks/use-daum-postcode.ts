/**
 * Daum 우편번호 (Kakao Postcode) 동적 로더
 * - Web 전용 (Platform.OS === 'web')
 * - 네이티브는 추후 WebView 모달로 대응
 * - 무료, API 키 불필요
 *
 * 참고: https://postcode.map.daum.net/guide
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const SCRIPT_SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
const SCRIPT_ID = 'daum-postcode-script';

export interface DaumPostcodeResult {
  /** 도로명 주소 (예: "경기 성남시 분당구 판교로 235") */
  roadAddress: string;
  /** 지번 주소 (예: "경기 성남시 분당구 삼평동 681") */
  jibunAddress: string;
  /** 시·도 (예: "경기") */
  sido: string;
  /** 시·군·구 (예: "성남시 분당구") */
  sigungu: string;
  /** 법정동·읍·면 이름 (예: "삼평동") */
  bname: string;
  /** 우편번호 5자리 */
  zonecode: string;
  /** Daum 이 돌려준 원본 객체 (필요시 디버깅) */
  raw: Record<string, unknown>;
}

type DaumNamespace = {
  Postcode: new (options: {
    oncomplete: (data: Record<string, unknown>) => void;
    onclose?: () => void;
    width?: string | number;
    height?: string | number;
  }) => { open: () => void; embed: (el: HTMLElement) => void };
};

declare global {
  interface Window {
    daum?: DaumNamespace;
  }
}

function loadScript(): Promise<DaumNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Daum Postcode 는 웹에서만 동작해요'));
  }
  if (window.daum?.Postcode) {
    return Promise.resolve(window.daum);
  }

  return new Promise<DaumNamespace>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.daum?.Postcode) resolve(window.daum);
        else reject(new Error('Daum Postcode 로드 실패'));
      });
      existing.addEventListener('error', () => reject(new Error('Daum Postcode 스크립트 에러')));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.daum?.Postcode) resolve(window.daum);
      else reject(new Error('Daum Postcode 로드 실패'));
    };
    script.onerror = () => reject(new Error('Daum Postcode 스크립트 에러'));
    document.head.appendChild(script);
  });
}

export function useDaumPostcode() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (Platform.OS !== 'web') return;

    loadScript()
      .then(() => mountedRef.current && setReady(true))
      .catch((e) => mountedRef.current && setError(e instanceof Error ? e.message : '로드 실패'));

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const open = useCallback(
    (onComplete: (result: DaumPostcodeResult) => void) => {
      if (Platform.OS !== 'web') {
        setError('주소 검색은 웹 버전에서 가능해요 (모바일 앱은 곧 지원)');
        return;
      }
      setLoading(true);
      setError(null);

      loadScript()
        .then((daum) => {
          const postcode = new daum.Postcode({
            oncomplete: (data) => {
              const r = data as Record<string, string>;
              onComplete({
                roadAddress: r.roadAddress || r.address || '',
                jibunAddress: r.jibunAddress || r.autoJibunAddress || '',
                sido: r.sido || '',
                sigungu: r.sigungu || '',
                bname: r.bname || '',
                zonecode: r.zonecode || '',
                raw: data,
              });
              if (mountedRef.current) setLoading(false);
            },
            onclose: () => mountedRef.current && setLoading(false),
          });
          postcode.open();
        })
        .catch((e) => {
          if (mountedRef.current) {
            setLoading(false);
            setError(e instanceof Error ? e.message : '주소 검색 열기 실패');
          }
        });
    },
    [],
  );

  return { open, ready, loading, error };
}
