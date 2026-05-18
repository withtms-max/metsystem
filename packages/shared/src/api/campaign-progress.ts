/**
 * 시책(캠페인) 진척률 계산.
 *
 * 시책은 team_events 에 저장돼 있고 (event_type='campaign'),
 * start_date / end_date / target_value / target_metric 컬럼 활용.
 *
 * 진척률은 activity_logs 를 기간 안에서 집계해서 산출.
 */

import type { MetSupabaseClient } from '../supabase/client';
import type { ActivityType, CampaignMetric, TeamEvent } from '../types/database';

export interface CampaignProgress {
  campaignId: string;
  /** 내 현재 진척 */
  myCurrent: number;
  /** 팀 전체 진척 */
  teamCurrent: number;
  /** 목표치 */
  target: number;
  /** 내 진척률 (0~100) */
  myPercent: number;
  /** 팀 진척률 (0~100) */
  teamPercent: number;
  /** 종료까지 남은 일 (음수면 종료) */
  daysLeft: number;
  /** 전체 기간 일수 */
  totalDays: number;
}

/** target_metric → activity_type 매핑 */
function metricToActivityType(metric: CampaignMetric): ActivityType | null {
  if (metric === 'contracts') return 'contract';
  if (metric === 'meetings') return 'meeting';
  if (metric === 'ta_calls') return 'ta_call';
  return null; // amount_won / custom 은 V2
}

export async function getCampaignProgress(
  supabase: MetSupabaseClient,
  campaign: TeamEvent,
  userId: string,
): Promise<CampaignProgress | null> {
  if (
    !campaign.start_date ||
    !campaign.end_date ||
    !campaign.target_value ||
    !campaign.target_metric
  ) {
    return null;
  }

  const activityType = metricToActivityType(campaign.target_metric);
  const target = campaign.target_value;

  // 기간 계산
  const startMs = new Date(campaign.start_date).getTime();
  const endMs = new Date(campaign.end_date).getTime();
  const todayStartMs = new Date(new Date().toISOString().slice(0, 10)).getTime();
  const totalDays = Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1);
  const daysLeft = Math.round((endMs - todayStartMs) / 86_400_000);

  let myCurrent = 0;
  let teamCurrent = 0;

  if (activityType) {
    // 본인 활동 카운트
    const { count: mineCount } = await supabase
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('activity_type', activityType)
      .eq('organization_id', campaign.organization_id)
      .gte('activity_date', campaign.start_date)
      .lte('activity_date', campaign.end_date);
    myCurrent = mineCount ?? 0;

    // 팀 전체 활동 카운트
    const { count: teamCount } = await supabase
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('activity_type', activityType)
      .eq('organization_id', campaign.organization_id)
      .gte('activity_date', campaign.start_date)
      .lte('activity_date', campaign.end_date);
    teamCurrent = teamCount ?? 0;
  }

  return {
    campaignId: campaign.id,
    myCurrent,
    teamCurrent,
    target,
    myPercent: target > 0 ? Math.min(100, Math.round((myCurrent / target) * 100)) : 0,
    teamPercent: target > 0 ? Math.min(100, Math.round((teamCurrent / target) * 100)) : 0,
    daysLeft,
    totalDays,
  };
}

/** 시책 KPI 메트릭 한국어 라벨 */
export function campaignMetricLabel(m: CampaignMetric): string {
  return (
    {
      contracts: '신규 계약',
      meetings: '미팅',
      ta_calls: '통화',
      amount_won: '거래 금액',
      custom: '수동 입력',
    } as Record<CampaignMetric, string>
  )[m] ?? m;
}

export function campaignMetricUnit(m: CampaignMetric): string {
  if (m === 'amount_won') return '원';
  return '건';
}

export const CAMPAIGN_METRICS: CampaignMetric[] = [
  'contracts',
  'meetings',
  'ta_calls',
];
