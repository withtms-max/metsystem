/**
 * 한국어 자연어 → 날짜 + 라벨 파싱.
 * 외부 라이브러리 없이 정규식 기반.
 *
 * 지원 입력:
 *  - "오늘 / 내일 / 모레 / 글피"
 *  - "이번주 X요일 / 다음주 X요일 / 다다음주 X요일"
 *  - "5/20 / 5월 20일 / 20일"
 *  - 나머지 단어 → label
 */

export interface ParsedNaturalDate {
  /** YYYY-MM-DD */
  date: string | null;
  /** 날짜 키워드 제외한 나머지 텍스트 */
  label: string;
  /** 디버그용 매칭된 패턴 */
  matched?: string;
}

const WEEKDAY_KO: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/**
 * X요일이 이번주 / 다음주 / 다다음주 에 해당하는 ISO 날짜 반환.
 * weekOffset: 0 = 이번주, 1 = 다음주, 2 = 다다음주
 * 한국 관례: 주의 시작은 월요일.
 */
function weekdayToIso(weekday: number, weekOffset: number, today: Date): string {
  const today0 = startOfDay(today);
  const todayWeekday = today0.getDay(); // 0=일, 1=월, ...
  // 이번주 월요일까지 거리
  const mondayOffset = todayWeekday === 0 ? -6 : 1 - todayWeekday;
  const thisMonday = new Date(today0);
  thisMonday.setDate(today0.getDate() + mondayOffset);
  // 목표 주의 월요일
  const targetMonday = new Date(thisMonday);
  targetMonday.setDate(thisMonday.getDate() + weekOffset * 7);
  // 그 주에서 목표 요일 (일은 +6, 월은 0, ...)
  const dayOffsetFromMon = weekday === 0 ? 6 : weekday - 1;
  const target = new Date(targetMonday);
  target.setDate(targetMonday.getDate() + dayOffsetFromMon);
  return toIso(target);
}

export function parseNaturalDate(input: string, today: Date = new Date()): ParsedNaturalDate {
  let text = input.trim();
  if (!text) return { date: null, label: '' };

  // 1) 절대 날짜 — "5/20" / "5월 20일" / "20일"
  let m = text.match(/(\d{1,2})\s*[\/월]\s*(\d{1,2})\s*일?/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let year = today.getFullYear();
      const candidate = new Date(year, month - 1, day);
      // 과거 날짜면 다음 해로
      if (candidate < startOfDay(today)) year += 1;
      const iso = toIso(new Date(year, month - 1, day));
      const label = text.replace(m[0], '').trim();
      return { date: iso, label, matched: '월/일' };
    }
  }

  // 2) "다다음주 / 다음주 / 이번주 X요일"
  m = text.match(/(다다음주|다음주|이번주)\s*([일월화수목금토])요일/);
  if (m && m[1] && m[2]) {
    const offset = m[1] === '다다음주' ? 2 : m[1] === '다음주' ? 1 : 0;
    const wd = WEEKDAY_KO[m[2]];
    if (wd !== undefined) {
      const iso = weekdayToIso(wd, offset, today);
      const label = text.replace(m[0], '').trim();
      return { date: iso, label, matched: `${m[1]} ${m[2]}요일` };
    }
  }

  // 3) 단순 키워드 — 오늘 / 내일 / 모레 / 글피
  const KEYWORDS: Array<[RegExp, number]> = [
    [/오늘/, 0],
    [/내일/, 1],
    [/모레/, 2],
    [/글피/, 3],
  ];
  for (const [re, days] of KEYWORDS) {
    if (re.test(text)) {
      const d = startOfDay(today);
      d.setDate(d.getDate() + days);
      const label = text.replace(re, '').trim();
      return { date: toIso(d), label, matched: re.source };
    }
  }

  // 4) "다다음주 / 다음주 / 이번주" 만 있으면 해당 주의 월요일
  m = text.match(/(다다음주|다음주|이번주)/);
  if (m) {
    const offset = m[1] === '다다음주' ? 2 : m[1] === '다음주' ? 1 : 0;
    const iso = weekdayToIso(1, offset, today); // 월요일
    const label = text.replace(m[0], '').trim();
    return { date: iso, label, matched: `${m[1]} (월요일 기본)` };
  }

  // 5) 매칭 실패
  return { date: null, label: text };
}

/**
 * 파싱 결과를 사람이 읽을 형태로 포맷.
 */
export function formatParsedDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})`;
}
