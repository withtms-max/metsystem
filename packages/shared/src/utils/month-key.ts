/**
 * 칸반보드 월 키 헬퍼 ('2026-05' 포맷).
 * 영업맨 칸반보드는 월 단위로 파티션됨.
 */

export function currentMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) throw new Error(`Invalid month key: ${monthKey}`);

  const date = new Date(year, month - 1 + delta, 1);
  return currentMonthKey(date);
}

export function formatMonthKeyKorean(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${year}년 ${Number(month)}월`;
}
