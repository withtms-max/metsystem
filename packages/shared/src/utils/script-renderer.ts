import type { CustomerGrade } from '../types/database';
import type { MessageTemplate, ScriptContext } from '../types/templates';

const DEFAULT_TITLE_BY_GRADE: Record<CustomerGrade, string> = {
  A: '대표님',
  B: '대표님',
  C: '대표님',
  D: '대표님',
};

/**
 * 템플릿 본문의 {{var}} 자리를 ctx 값으로 치환.
 * 값이 없으면 빈 문자열 (자연스러운 문장 유지).
 */
export function renderScript(template: string, ctx: ScriptContext): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = (ctx as unknown as Record<string, unknown>)[key];
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

export interface PickTemplateInput {
  grade: CustomerGrade;
  lastMeetingDays: number | null;
  templates: MessageTemplate[];
  category?: string;
}

/**
 * 상황별 + 등급별 우선순위로 템플릿 한 개 선택.
 * 같은 카테고리에 여러 variant가 있으면 무작위 (식상함 방지).
 *
 * 우선순위:
 *  1. lastMeetingDays >= 180 → 'long_untouched' (등급 무관)
 *  2. 등급 매칭 + 'nearby_visit'
 *  3. 등급 매칭 fallback
 *  4. 'cold_call' (등급/상황 무관)
 */
export function pickTemplate(input: PickTemplateInput): MessageTemplate | null {
  const category = input.category ?? 'ta_script';
  const pool = input.templates.filter(
    (t) => t.is_active && t.category === category,
  );

  if (pool.length === 0) return null;

  // 1순위: 장기 미터치
  if (input.lastMeetingDays !== null && input.lastMeetingDays >= 180) {
    const longUntouched = pool.filter((t) => t.situation === 'long_untouched');
    if (longUntouched.length > 0) return pickRandom(longUntouched);
  }

  // 2순위: 등급 + nearby_visit
  const exactMatch = pool.filter(
    (t) => t.target_grade === input.grade && t.situation === 'nearby_visit',
  );
  if (exactMatch.length > 0) return pickRandom(exactMatch);

  // 3순위: 등급만 매칭
  const gradeMatch = pool.filter((t) => t.target_grade === input.grade);
  if (gradeMatch.length > 0) return pickRandom(gradeMatch);

  // 4순위: cold_call (등급 무관)
  const coldCall = pool.filter((t) => t.situation === 'cold_call');
  if (coldCall.length > 0) return pickRandom(coldCall);

  // 마지막: 아무거나
  return pickRandom(pool);
}

function pickRandom<T>(arr: T[]): T {
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx]!;
}

/**
 * 등급/관계에 맞는 호칭 선택. 영업맨이 본인 스타일로 메모에 적어둘 수도 있음.
 */
export function inferTitle(grade: CustomerGrade, customMemo?: string | null): string {
  if (customMemo?.includes('형님') || customMemo?.includes('형')) return '형님';
  if (customMemo?.includes('누님')) return '누님';
  return DEFAULT_TITLE_BY_GRADE[grade];
}
