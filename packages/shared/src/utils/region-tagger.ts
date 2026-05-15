/**
 * 한국 주소 → 지역태그 자동 추출.
 * 명함 스캔 또는 수동 주소 입력 시 사용.
 */

const REGION_KEYWORDS: Record<string, string[]> = {
  판교: ['판교', '백현동', '삼평동', '운중동'],
  강남: ['강남', '역삼', '논현', '신사', '청담', '대치', '도곡'],
  서초: ['서초', '반포', '잠원', '방배', '양재'],
  분당: ['분당', '정자', '서현', '수내', '야탑'],
  여의도: ['여의도', '영등포'],
  광화문: ['광화문', '종로', '중구'],
  성수: ['성수', '뚝섬', '서울숲'],
  홍대: ['홍대', '합정', '상수', '망원'],
  잠실: ['잠실', '송파', '석촌'],
};

export function extractRegionTag(address: string | null | undefined): string | null {
  if (!address) return null;
  const normalized = address.replace(/\s+/g, '');

  for (const [tag, keywords] of Object.entries(REGION_KEYWORDS)) {
    if (keywords.some((kw) => normalized.includes(kw))) return tag;
  }
  return null;
}
