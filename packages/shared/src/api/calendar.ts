import type { MetSupabaseClient } from '../supabase/client';
import type { ActivityType, GoldenTimeRuleType, TeamEventType } from '../types/database';
import { getHolidaysInMonth } from '../utils/holidays';
import { listMonthlyTeamEvents, teamEventTypeLabel } from './team-events';

export type CalendarEventKind =
  | 'ta_call'
  | 'meeting'
  | 'memo'
  | 'message'
  | 'contract'
  | 'golden_time'
  | 'holiday'
  | 'team_event';

/** 일정 범위 — UI 토글 필터링용 */
export type CalendarScope = 'personal' | 'team' | 'holiday';

export interface CalendarEvent {
  /** YYYY-MM-DD */
  date: string;
  kind: CalendarEventKind;
  /** 짧은 한 줄 (예: '김철수 통화', '이영희 생일') */
  label: string;
  /** 어느 범주에 속하는지 — 필터링용 */
  scope: CalendarScope;
  /** 추가 메타 (rule_type, mood, team_event_type 등) */
  meta?: Record<string, string | number | null>;
}

/**
 * 한 달치 캘린더 이벤트 집계.
 * - activity_logs (이번 달 activity_date 범위)
 * - golden_time_rules (trigger_date in 이번 달 OR 매년 반복)
 */
export async function listMonthlyEvents(
  supabase: MetSupabaseClient,
  userId: string,
  monthKey: string, // 'YYYY-MM'
): Promise<CalendarEvent[]> {
  const [year, monthRaw] = monthKey.split('-');
  if (!year || !monthRaw) return [];
  const month = Number(monthRaw);
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEndDate = new Date(Number(year), month, 0); // last day of month
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(monthEndDate.getDate()).padStart(2, '0')}`;

  // 활동 로그
  const { data: activities, error: actErr } = await supabase
    .from('activity_logs')
    .select('id, activity_type, activity_date, customer_id, note, status, mood, customers(name, company)')
    .eq('user_id', userId)
    .gte('activity_date', monthStart)
    .lte('activity_date', monthEnd);

  if (actErr) console.warn('[calendar] activities err', actErr);

  // 골든타임 룰
  const { data: rules, error: ruleErr } = await supabase
    .from('golden_time_rules')
    .select('id, rule_type, trigger_date, customer_id, is_active, customers(name, company)')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (ruleErr) console.warn('[calendar] rules err', ruleErr);

  const events: CalendarEvent[] = [];

  // Supabase foreign key 조인은 항상 배열로 옴 — 첫 요소만 사용
  type RawCustomer = { name: string; company: string | null };
  type RawActivity = {
    activity_type: ActivityType;
    activity_date: string;
    status: string | null;
    mood: string | null;
    note: string | null;
    customers: RawCustomer | RawCustomer[] | null;
  };
  type RawRule = {
    rule_type: GoldenTimeRuleType;
    trigger_date: string | null;
    customers: RawCustomer | RawCustomer[] | null;
  };

  const pickCustomer = (c: RawCustomer | RawCustomer[] | null): RawCustomer | null => {
    if (!c) return null;
    return Array.isArray(c) ? c[0] ?? null : c;
  };

  for (const a of ((activities ?? []) as unknown as RawActivity[])) {
    const customer = pickCustomer(a.customers);
    const name = customer?.company ?? customer?.name ?? '고객';
    const typeLabel = activityTypeLabel(a.activity_type);
    events.push({
      date: a.activity_date,
      kind: a.activity_type,
      scope: 'personal',
      label: `${name} ${typeLabel}`,
      meta: { status: a.status, mood: a.mood, note: a.note },
    });
  }

  for (const r of ((rules ?? []) as unknown as RawRule[])) {
    if (!r.trigger_date) continue;
    // 매년 반복: 연도만 현재 월로 매핑
    const triggerDay = r.trigger_date.slice(5); // MM-DD
    const occursThisMonth = triggerDay.startsWith(`${String(month).padStart(2, '0')}-`);
    if (!occursThisMonth) continue;

    const customer = pickCustomer(r.customers);
    const name = customer?.company ?? customer?.name ?? '고객';
    events.push({
      date: `${year}-${triggerDay}`,
      kind: 'golden_time',
      scope: 'personal',
      label: `${name} ${ruleTypeLabel(r.rule_type)}`,
      meta: { rule_type: r.rule_type },
    });
  }

  // 한국 공휴일
  for (const h of getHolidaysInMonth(monthKey)) {
    events.push({
      date: h.date,
      kind: 'holiday',
      scope: 'holiday',
      label: h.name,
      meta: { holiday_type: h.type },
    });
  }

  // 팀 이벤트 (같은 조직 멤버 모두 RLS로 자동 접근)
  const teamEvents = await listMonthlyTeamEvents(supabase, monthKey);
  for (const te of teamEvents) {
    events.push({
      date: te.event_date,
      kind: 'team_event',
      scope: 'team',
      label: te.title,
      meta: {
        event_type: te.event_type,
        event_time: te.event_time,
        description: te.description,
        type_label: teamEventTypeLabel(te.event_type as TeamEventType),
      },
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

function activityTypeLabel(t: ActivityType): string {
  return (
    {
      ta_call: '통화',
      meeting: '미팅',
      memo: '메모',
      message: '메시지',
      contract: '계약',
    } as Record<ActivityType, string>
  )[t] ?? t;
}

function ruleTypeLabel(t: GoldenTimeRuleType): string {
  return (
    {
      contract_anniversary: '계약 기념일',
      birthday: '생일',
      holiday_greeting: '명절 안부',
      custom: '일정',
      follow_up: '팔로업',
    } as Record<GoldenTimeRuleType, string>
  )[t] ?? t;
}
