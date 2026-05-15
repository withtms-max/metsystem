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
