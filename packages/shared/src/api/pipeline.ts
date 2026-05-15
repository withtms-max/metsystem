import type { MetSupabaseClient } from '../supabase/client';
import type {
  Customer,
  PipelineCard,
  PipelineCardInsert,
  PipelineStage,
} from '../types/database';

export interface PipelineCardWithCustomer extends PipelineCard {
  customer: Customer | null;
}

export async function listPipelineCards(
  supabase: MetSupabaseClient,
  monthKey: string,
): Promise<PipelineCardWithCustomer[]> {
  const { data, error } = await supabase
    .from('pipeline_cards')
    .select('*, customer:customers(*)')
    .eq('month_key', monthKey)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PipelineCardWithCustomer[];
}

export async function addPipelineCard(
  supabase: MetSupabaseClient,
  input: PipelineCardInsert,
): Promise<PipelineCard> {
  const { data, error } = await supabase
    .from('pipeline_cards')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(input as any)
    .select('*')
    .single();
  if (error) throw error;
  return data as PipelineCard;
}

export async function moveCardStage(
  supabase: MetSupabaseClient,
  cardId: string,
  stage: PipelineStage,
): Promise<PipelineCard> {
  const { data, error } = await supabase
    .from('pipeline_cards')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ stage, updated_at: new Date().toISOString() } as any)
    .eq('id', cardId)
    .select('*')
    .single();
  if (error) throw error;
  return data as PipelineCard;
}

export async function removePipelineCard(
  supabase: MetSupabaseClient,
  cardId: string,
): Promise<void> {
  const { error } = await supabase.from('pipeline_cards').delete().eq('id', cardId);
  if (error) throw error;
}
