import type { MetSupabaseClient } from '../supabase/client';
import type {
  ActivityLog,
  ActivityLogInsert,
  ActivityType,
} from '../types/database';

export interface ActivityFilters {
  date?: string;
  customerId?: string;
  type?: ActivityType;
  limit?: number;
}

export async function listActivities(
  supabase: MetSupabaseClient,
  filters: ActivityFilters = {},
): Promise<ActivityLog[]> {
  let query = supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false });
  if (filters.date) query = query.eq('activity_date', filters.date);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.type) query = query.eq('activity_type', filters.type);
  if (filters.limit) query = query.limit(filters.limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ActivityLog[];
}

export async function logActivity(
  supabase: MetSupabaseClient,
  input: ActivityLogInsert,
): Promise<ActivityLog> {
  const { data, error } = await supabase
    .from('activity_logs')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(input as any)
    .select('*')
    .single();
  if (error) throw error;
  return data as ActivityLog;
}

export interface DailyCounts {
  ta: number;
  meeting: number;
  contract: number;
  memo: number;
}

export async function getDailyCounts(
  supabase: MetSupabaseClient,
  userId: string,
  date: string,
): Promise<DailyCounts> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('activity_type, status')
    .eq('user_id', userId)
    .eq('activity_date', date)
    .eq('status', 'completed');
  if (error) throw error;

  const counts: DailyCounts = { ta: 0, meeting: 0, contract: 0, memo: 0 };
  for (const row of (data ?? []) as { activity_type: ActivityType }[]) {
    if (row.activity_type === 'ta_call') counts.ta++;
    else if (row.activity_type === 'meeting') counts.meeting++;
    else if (row.activity_type === 'contract') counts.contract++;
    else if (row.activity_type === 'memo') counts.memo++;
  }
  return counts;
}
