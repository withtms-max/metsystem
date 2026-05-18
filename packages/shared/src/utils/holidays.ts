import data from '../data/kr-holidays.json';

export type HolidayType = 'national' | 'observed' | 'custom';

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: HolidayType;
}

const ALL_HOLIDAYS: Holiday[] = (data.holidays as Holiday[]) ?? [];

/**
 * 특정 월의 공휴일만 반환.
 * @param monthKey 'YYYY-MM' 형식
 */
export function getHolidaysInMonth(monthKey: string): Holiday[] {
  return ALL_HOLIDAYS.filter((h) => h.date.startsWith(monthKey + '-'));
}

/**
 * 특정 날짜가 공휴일인지 확인.
 */
export function getHolidayByDate(date: string): Holiday | null {
  return ALL_HOLIDAYS.find((h) => h.date === date) ?? null;
}

/**
 * 오늘 이후 가장 가까운 명절(설날/추석)을 반환. 이미 지났으면 다음 명절.
 * 명절 D-2 골든타임 자동 생성용.
 */
export function getUpcomingMajorHolidays(fromDate: Date = new Date(), limit = 4): Holiday[] {
  const todayKey = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`;
  return ALL_HOLIDAYS.filter(
    (h) => h.date >= todayKey && (h.name === '설날' || h.name === '추석'),
  ).slice(0, limit);
}

/**
 * 특정 날짜의 D-N 일자를 ISO 문자열로 반환.
 */
export function dateMinusDays(dateIso: string, daysBefore: number): string {
  const d = new Date(dateIso + 'T00:00:00');
  d.setDate(d.getDate() - daysBefore);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
