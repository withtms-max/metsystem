/**
 * 영업 인사이트 — 영업맨이 자기 성과를 한눈에.
 *
 * 모든 통계는 클라이언트가 호출하는 RLS 안전 쿼리로 집계.
 * 무거운 분석은 (LTV·코호트 등) 추후 Edge Function 으로 이관.
 */

import type { MetSupabaseClient } from '../supabase/client';
import type { ActivityType, CustomerGrade } from '../types/database';

export interface ActivityCount {
  type: ActivityType;
  count: number;
}

export interface GradeCount {
  grade: CustomerGrade;
  count: number;
}

export interface DailyCount {
  /** YYYY-MM-DD */
  date: string;
  count: number;
}

export interface MonthInsights {
  monthKey: string;
  /** activity_type 별 카운트 */
  activityCounts: ActivityCount[];
  /** 등급별 고객 분포 (전체) */
  gradeDistribution: GradeCount[];
  /** 일별 활동 카운트 */
  dailyCounts: DailyCount[];
  /** 신규 고객 수 */
  newCustomers: number;
  /** 계약 체결 수 */
  contracts: number;
  /** 평균 일일 통화 */
  avgDailyCalls: number;
  /** TA → 미팅 전환율 (%) */
  taToMeetingRate: number;
  /** 미팅 → 계약 전환율 (%) */
  meetingToContractRate: number;
  /** 다음 액션 등록 수 */
  scheduledActions: number;
  /** 무연락 90일 이상 A·B급 수 */
  staleHighGrade: number;
}

function monthRange(monthKey: string): { start: string; end: string } {
  const [yStr, mStr] = monthKey.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
  };
}

export async function computeMonthInsights(
  supabase: MetSupabaseClient,
  userId: string,
  monthKey: string,
): Promise<MonthInsights> {
  const { start, end } = monthRange(monthKey);

  // 1. activity_logs 모두 가져오기 (이번 달)
  const { data: acts, error: actErr } = await supabase
    .from('activity_logs')
    .select('id, activity_type, activity_date, status')
    .eq('user_id', userId)
    .gte('activity_date', start)
    .lte('activity_date', end);
  if (actErr) console.warn('[insights] activities', actErr);

  type RawAct = { activity_type: ActivityType; activity_date: string; status: string | null };
  const activities = (acts ?? []) as RawAct[];

  // 2. 활동 타입별 카운트
  const typeMap = new Map<ActivityType, number>();
  const daily = new Map<string, number>();
  for (const a of activities) {
    typeMap.set(a.activity_type, (typeMap.get(a.activity_type) ?? 0) + 1);
    daily.set(a.activity_date, (daily.get(a.activity_date) ?? 0) + 1);
  }
  const activityCounts: ActivityCount[] = (
    ['ta_call', 'meeting', 'memo', 'message', 'contract'] as ActivityType[]
  ).map((t) => ({ type: t, count: typeMap.get(t) ?? 0 }));

  const dailyCounts: DailyCount[] = Array.from(daily.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 3. 고객 등급 분포 (전체) + 90일 무연락 A·B
  const { data: custs, error: custErr } = await supabase
    .from('customers')
    .select('id, grade, created_at, last_contact_at')
    .eq('owner_id', userId);
  if (custErr) console.warn('[insights] customers', custErr);

  type RawCust = {
    grade: CustomerGrade;
    created_at: string;
    last_contact_at: string | null;
  };
  const customers = (custs ?? []) as RawCust[];

  const gradeMap = new Map<CustomerGrade, number>();
  let newCustomers = 0;
  let staleHigh = 0;
  const ninetyDaysAgo = Date.now() - 90 * 86_400_000;
  for (const c of customers) {
    gradeMap.set(c.grade, (gradeMap.get(c.grade) ?? 0) + 1);
    if (c.created_at.slice(0, 7) === monthKey) newCustomers++;
    if (c.grade === 'A' || c.grade === 'B') {
      const lastMs = c.last_contact_at
        ? new Date(c.last_contact_at).getTime()
        : new Date(c.created_at).getTime();
      if (lastMs < ninetyDaysAgo) staleHigh++;
    }
  }
  const gradeDistribution: GradeCount[] = (['A', 'B', 'C', 'D'] as CustomerGrade[]).map((g) => ({
    grade: g,
    count: gradeMap.get(g) ?? 0,
  }));

  // 4. 다음 액션 + 전환율
  const { data: nextActs } = await supabase
    .from('customers')
    .select('id, next_action_date')
    .eq('owner_id', userId)
    .not('next_action_date', 'is', null)
    .gte('next_action_date', start);

  const scheduledActions = nextActs?.length ?? 0;

  const taCount = typeMap.get('ta_call') ?? 0;
  const meetingCount = typeMap.get('meeting') ?? 0;
  const contractCount = typeMap.get('contract') ?? 0;

  const taToMeeting = taCount > 0 ? Math.round((meetingCount / taCount) * 100) : 0;
  const meetingToContract = meetingCount > 0 ? Math.round((contractCount / meetingCount) * 100) : 0;

  // 5. 평균 일일 통화 (이번 달 시작 ~ 오늘)
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStartMs = new Date(start).getTime();
  const todayMs = Math.min(new Date(todayStr).getTime(), new Date(end).getTime());
  const daysElapsed = Math.max(1, Math.floor((todayMs - monthStartMs) / 86_400_000) + 1);
  const avgDailyCalls = Math.round((taCount / daysElapsed) * 10) / 10;

  return {
    monthKey,
    activityCounts,
    gradeDistribution,
    dailyCounts,
    newCustomers,
    contracts: contractCount,
    avgDailyCalls,
    taToMeetingRate: taToMeeting,
    meetingToContractRate: meetingToContract,
    scheduledActions,
    staleHighGrade: staleHigh,
  };
}
