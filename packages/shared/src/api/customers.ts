import type { MetSupabaseClient } from '../supabase/client';
import type { Customer, CustomerGrade } from '../types/database';

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
  return data ?? [];
}

export async function getCustomer(
  supabase: MetSupabaseClient,
  id: string,
): Promise<Customer | null> {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createCustomer(
  supabase: MetSupabaseClient,
  input: Omit<Customer, 'id' | 'created_at' | 'updated_at'>,
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(
  supabase: MetSupabaseClient,
  id: string,
  patch: Partial<Customer>,
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCustomer(
  supabase: MetSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}
