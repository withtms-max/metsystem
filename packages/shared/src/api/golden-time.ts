import type { MetSupabaseClient } from '../supabase/client';
import {
  dateMinusDays,
  getUpcomingMajorHolidays,
} from '../utils/holidays';

/**
 * 다가오는 설날/추석의 D-2 일자에 holiday_greeting 룰을 자동 생성.
 * 클라이언트가 캘린더 진입 시 호출 — idempotent.
 */
export async function ensureHolidayGreetings(
  supabase: MetSupabaseClient,
  userId: string,
  fromDate: Date = new Date(),
): Promise<number> {
  const upcoming = getUpcomingMajorHolidays(fromDate, 4);
  const dminus2Dates = upcoming.map((h) => dateMinusDays(h.date, 2));
  if (dminus2Dates.length === 0) return 0;

  const { data, error } = await supabase.rpc('ensure_holiday_greetings', {
    p_user_id: userId,
    p_dates: dminus2Dates,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (error) {
    console.warn('[ensureHolidayGreetings] failed', error);
    return 0;
  }
  return (data as number) ?? 0;
}

/**
 * 본인 모든 고객의 생일/계약일 룰을 일괄 동기화 (1회용 또는 마이그레이션 직후).
 */
export async function syncAllGoldenTimes(
  supabase: MetSupabaseClient,
  userId?: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('sync_all_golden_times', {
    p_user_id: userId ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (error) {
    console.warn('[syncAllGoldenTimes] failed', error);
    return 0;
  }
  return (data as number) ?? 0;
}
