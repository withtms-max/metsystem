/**
 * 캘린더 월 그리드 생성 — 일요일 시작 6주(42칸) 고정.
 * 각 셀: { date: 'YYYY-MM-DD', inMonth: boolean, day: number, weekday: 0-6 }
 */

export interface MonthGridCell {
  date: string; // YYYY-MM-DD
  day: number; // 1-31
  weekday: number; // 0(일) - 6(토)
  inMonth: boolean;
  isToday: boolean;
}

export function buildMonthGrid(monthKey: string): MonthGridCell[][] {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return [];

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 이번 달 1일 요일
  const first = new Date(year, month - 1, 1);
  const firstWeekday = first.getDay(); // 0 = 일

  // 그리드 시작일: 1일이 속한 주의 일요일
  const start = new Date(first);
  start.setDate(start.getDate() - firstWeekday);

  const grid: MonthGridCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: MonthGridCell[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + w * 7 + d);
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      row.push({
        date: key,
        day: cur.getDate(),
        weekday: cur.getDay(),
        inMonth: cur.getMonth() === month - 1,
        isToday: key === todayKey,
      });
    }
    grid.push(row);
  }
  return grid;
}

export const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;
