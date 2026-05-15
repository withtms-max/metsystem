import type { MetSupabaseClient } from '../supabase/client';
import type { MessageTemplate } from '../types/templates';

export async function listTaScripts(
  supabase: MetSupabaseClient,
): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('category', 'ta_script')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as MessageTemplate[];
}

export async function listKakaoTemplates(
  supabase: MetSupabaseClient,
): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('category', 'kakao_greeting')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as MessageTemplate[];
}
