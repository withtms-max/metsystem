/**
 * 오늘·내일·이번 주 일정 타임라인.
 *
 * listMonthlyEvents 를 활용해서 오늘과 그 다음 7일치 이벤트를 추출.
 * 홈 화면의 "비서" 카드용.
 */

import type { MetSupabaseClient } from '../supabase/client';
import { listMonthlyEvents, type CalendarEvent } from './calendar';

export interface TimelineBuckets {
  today: CalendarEvent[];
  tomorrow: CalendarEvent[];
  thisWeek: CalendarEvent[]; // 모레 ~ 이번 주 일요일
}

export async function getTimelineBuckets(
  supabase: MetSupabaseClient,
  userId: string,
): Promise<TimelineBuckets> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // 이번 주 일요일까지 (일요일 = 0)
  const daysUntilSunday = 7 - now.getDay();
  const sunday = new Date(now);
  sunday.setDate(sunday.getDate() + daysUntilSunday);
  const sundayStr = sunday.toISOString().slice(0, 10);

  // 다음 달도 포함될 수 있어서 한 달치만 가져옴 (성능 OK)
  const monthKey = today.slice(0, 7);
  const events = await listMonthlyEvents(supabase, userId, monthKey);

  // 다음 달까지 걸쳐있으면 다음 달도 가져오기
  let allEvents = events;
  if (sundayStr.slice(0, 7) !== monthKey) {
    const nextMonth = sundayStr.slice(0, 7);
    const nextMonthEvents = await listMonthlyEvents(supabase, userId, nextMonth);
    allEvents = [...events, ...nextMonthEvents];
  }

  const todayList: CalendarEvent[] = [];
  const tomorrowList: CalendarEvent[] = [];
  const weekList: CalendarEvent[] = [];

  for (const e of allEvents) {
    if (e.date === today) todayList.push(e);
    else if (e.date === tomorrowStr) tomorrowList.push(e);
    else if (e.date > tomorrowStr && e.date <= sundayStr) weekList.push(e);
  }

  // 시간순 정렬 (event_time 메타가 있으면 그걸로)
  const byTime = (a: CalendarEvent, b: CalendarEvent) => {
    const ta = (a.meta?.event_time as string) ?? '23:59';
    const tb = (b.meta?.event_time as string) ?? '23:59';
    return ta.localeCompare(tb);
  };
  todayList.sort(byTime);
  tomorrowList.sort(byTime);
  // weekList 는 날짜순
  weekList.sort((a, b) => a.date.localeCompare(b.date));

  return { today: todayList, tomorrow: tomorrowList, thisWeek: weekList };
}

/** 이벤트의 표시 시간 추출 (HH:MM) — 없으면 null */
export function eventTimeOf(event: CalendarEvent): string | null {
  const t = event.meta?.event_time as string | undefined;
  if (!t) return null;
  return t.slice(0, 5); // HH:MM
}
