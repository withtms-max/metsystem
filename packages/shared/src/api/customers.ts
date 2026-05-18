import type { MetSupabaseClient } from '../supabase/client';
import type {
  Customer,
  CustomerGrade,
  CustomerInsert,
  CustomerUpdate,
} from '../types/database';

/**
 * NOTE: Supabase JS의 insert/update 제네릭 추론은 Database 타입의 정확한 형태에
 * 매우 민감함. Phase 1에서 `supabase gen types typescript`로 자동생성한 타입으로
 * 교체하면 캐스팅 없이 동작하게 됨. 지금은 명시적 캐스팅으로 안전하게 처리.
 */

export interface CustomerFilters {
  grade?: CustomerGrade;
  regionTag?: string;
  search?: string;
}

export async function listCustomers(
  supabase: MetSupabaseClient,
  filters: CustomerFilters = {},
): Promise<Customer[]> {
  let query = supabase.from('customers').select('*').order('updated_at', { ascending: false });

  if (filters.grade) query = query.eq('grade', filters.grade);
  if (filters.regionTag) query = query.eq('region_tag', filters.regionTag);
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Customer[];
}

export async function getCustomer(
  supabase: MetSupabaseClient,
  id: string,
): Promise<Customer | null> {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Customer | null;
}

export async function createCustomer(
  supabase: MetSupabaseClient,
  input: CustomerInsert,
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(input as any)
    .select('*')
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(
  supabase: MetSupabaseClient,
  id: string,
  patch: CustomerUpdate,
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ ...patch, updated_at: new Date().toISOString() } as any)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function deleteCustomer(
  supabase: MetSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}

/**
 * 무연락 N일 경과 고객 — 홈 화면 경고 배너용.
 * - last_contact_at NULL 인 고객도 포함 (한 번도 활동 없음)
 * - grades 인자로 등급 한정 가능 (기본: A·B)
 */
export async function listStaleCustomers(
  supabase: MetSupabaseClient,
  staleDays = 90,
  grades: CustomerGrade[] = ['A', 'B'],
): Promise<Customer[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleDays);
  const cutoffIso = cutoff.toISOString();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .in('grade', grades)
    .or(`last_contact_at.is.null,last_contact_at.lt.${cutoffIso}`)
    .order('grade', { ascending: true })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as Customer[];
}

/** 점진적 무연락 단계 — UX 강도 결정용 */
export type StaleLevel = 'fresh' | 'warning' | 'concerning' | 'critical';

export function staleLevelOf(customer: Customer): StaleLevel {
  const last = customer.last_contact_at;
  if (!last) {
    // 한 번도 활동 없는 신규 — 등록일 기준
    const createdMs = new Date(customer.created_at).getTime();
    const daysSinceCreated = (Date.now() - createdMs) / 86_400_000;
    if (daysSinceCreated < 30) return 'fresh';
    if (daysSinceCreated < 60) return 'warning';
    if (daysSinceCreated < 90) return 'concerning';
    return 'critical';
  }
  const daysSince = (Date.now() - new Date(last).getTime()) / 86_400_000;
  if (daysSince < 30) return 'fresh';
  if (daysSince < 60) return 'warning';
  if (daysSince < 90) return 'concerning';
  return 'critical';
}

export function daysSinceLastContact(customer: Customer): number {
  const baseMs = customer.last_contact_at
    ? new Date(customer.last_contact_at).getTime()
    : new Date(customer.created_at).getTime();
  return Math.floor((Date.now() - baseMs) / 86_400_000);
}

/**
 * 이번 주 안에 예정된 next_action 들 — 홈 화면에 "오늘 만날 사람"보다 액션 중심.
 */
export async function listUpcomingActions(
  supabase: MetSupabaseClient,
  daysAhead = 7,
): Promise<Customer[]> {
  const today = new Date();
  const end = new Date();
  end.setDate(end.getDate() + daysAhead);
  const todayStr = today.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .not('next_action_date', 'is', null)
    .gte('next_action_date', todayStr)
    .lte('next_action_date', endStr)
    .order('next_action_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Customer[];
}
