/**
 * 업종 레지스트리 — 영업판 챙김
 *
 * 업종마다 영업 흐름이 달라서, 고객 등록 화면·핀 종류·기본 워크플로우가 바뀜.
 * 새 업종 추가 시 이 파일에만 추가하면 자동으로 회원가입·UI 에 반영됨.
 */

export type IndustryCode =
  | 'insurance'      // 보험 (생보·손보·GA)
  | 'real_estate'    // 부동산 (분양·매매·임대)
  | 'automotive'     // 자동차 (영업·중고차)
  | 'finance'        // 금융 (증권·자산관리)
  | 'b2b_sales'      // B2B 영업 (제조·솔루션·SaaS)
  | 'beauty_health'  // 뷰티·헬스 (병원·시술)
  | 'general';       // 일반 (그 외 모든 업종)

export interface IndustryDef {
  code: IndustryCode;
  label: string;
  emoji: string;
  /** 영업 특성 한 줄 설명 */
  desc: string;
  /** 활성화할 부가 주소 필드 */
  addressFields: ('home' | 'contract')[];
  /** 등급 라벨 (예: A-D vs 진성-잠재) */
  gradeStyle?: 'abcd' | 'hot_warm_cold';
}

export const INDUSTRIES: IndustryDef[] = [
  {
    code: 'insurance',
    label: '보험',
    emoji: '🏥',
    desc: '생보·손보·GA · 자택/계약 장소 중요',
    addressFields: ['home', 'contract'],
  },
  {
    code: 'real_estate',
    label: '부동산',
    emoji: '🏘️',
    desc: '분양·매매·임대 · 매물 위치 핵심',
    addressFields: [], // V2: 매물 주소 필드 추가 예정
  },
  {
    code: 'automotive',
    label: '자동차',
    emoji: '🚗',
    desc: '영업·중고차 · 차고지·매장 방문',
    addressFields: ['home'],
  },
  {
    code: 'finance',
    label: '금융',
    emoji: '💰',
    desc: '증권·자산관리 · 자택 방문 잦음',
    addressFields: ['home'],
  },
  {
    code: 'b2b_sales',
    label: 'B2B 영업',
    emoji: '🏢',
    desc: '제조·솔루션·SaaS · 직장 중심',
    addressFields: [],
  },
  {
    code: 'beauty_health',
    label: '뷰티·헬스',
    emoji: '💆',
    desc: '병원·시술 · 매장 방문',
    addressFields: [],
  },
  {
    code: 'general',
    label: '일반',
    emoji: '📋',
    desc: '그 외 모든 영업업종',
    addressFields: [],
  },
];

const FALLBACK: IndustryDef = {
  code: 'general',
  label: '일반',
  emoji: '📋',
  desc: '그 외 모든 영업업종',
  addressFields: [],
};

/** 업종 코드 → 정의 (없으면 general 폴백) */
export function getIndustry(code: string | null | undefined): IndustryDef {
  if (!code) return FALLBACK;
  return INDUSTRIES.find((i) => i.code === code) ?? FALLBACK;
}

/** 특정 부가 주소 필드를 노출해야 하는지 */
export function shouldShowAddressField(
  industryCode: string | null | undefined,
  field: 'home' | 'contract',
): boolean {
  return getIndustry(industryCode).addressFields.includes(field);
}
