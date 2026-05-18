/**
 * Kakao Local REST API — 주소 → 좌표 변환 (geocoding)
 *
 * 호출 제한: 무료 / 일 300,000 건 (앱당)
 * 문서: https://developers.kakao.com/docs/latest/ko/local/dev-guide#address-coord
 *
 * 보안:
 *  · REST 키는 클라이언트에 노출돼도 일단 동작은 하지만, 권장은 Edge Function 경유
 *  · 우리는 V1 에서 .env 의 KAKAO_REST_KEY 를 직접 호출 (개발 속도 우선)
 *  · 추후 supabase/functions/geocode/index.ts 로 이관 예정
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  /** 카카오가 인식한 정제 주소 */
  matchedAddress: string;
  /** 행정구역 (예: "성남시 분당구") */
  region2: string;
}

const KAKAO_GEOCODE_ENDPOINT = 'https://dapi.kakao.com/v2/local/search/address.json';

/**
 * 주소 문자열로 좌표 변환.
 * @param address  도로명 또는 지번 주소 (둘 다 가능)
 * @param restKey  Kakao REST API 키
 */
export async function geocodeAddress(
  address: string,
  restKey: string,
): Promise<GeocodeResult | null> {
  if (!address?.trim()) return null;
  if (!restKey) {
    console.warn('[kakao-geocode] REST 키 없음 — 좌표 변환 스킵');
    return null;
  }

  const url = `${KAKAO_GEOCODE_ENDPOINT}?query=${encodeURIComponent(address.trim())}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${restKey}` },
    });
    if (!res.ok) {
      console.warn('[kakao-geocode] HTTP', res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as {
      documents: Array<{
        x: string; // longitude
        y: string; // latitude
        address_name: string;
        address?: { region_2depth_name: string };
        road_address?: { region_2depth_name: string };
      }>;
    };
    const doc = data.documents?.[0];
    if (!doc) return null;
    return {
      latitude: Number(doc.y),
      longitude: Number(doc.x),
      matchedAddress: doc.address_name,
      region2: doc.road_address?.region_2depth_name ?? doc.address?.region_2depth_name ?? '',
    };
  } catch (e) {
    console.warn('[kakao-geocode] 호출 실패', e);
    return null;
  }
}

/**
 * Daum Postcode 결과의 jibun/road 주소 + 시군구를 받아서 좌표만 채워주는 헬퍼.
 * 도로명 우선 → 실패시 지번으로 폴백.
 */
export async function geocodePostcodeResult(
  result: { roadAddress: string; jibunAddress: string },
  restKey: string,
): Promise<GeocodeResult | null> {
  const road = await geocodeAddress(result.roadAddress, restKey);
  if (road) return road;
  return geocodeAddress(result.jibunAddress, restKey);
}
