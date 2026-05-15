import {
  addPipelineCard,
  listPipelineCards,
  moveCardStage,
  removePipelineCard,
  type PipelineCardInsert,
  type PipelineCardWithCustomer,
  type PipelineStage,
} from '@metsystem/shared';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function usePipeline(monthKey: string) {
  const [cards, setCards] = useState<PipelineCardWithCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await listPipelineCards(supabase, monthKey);
      setCards(list);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('알 수 없는 오류'));
    } finally {
      setIsLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = useCallback(
    async (input: PipelineCardInsert) => {
      const c = await addPipelineCard(supabase, input);
      await reload();
      return c;
    },
    [reload],
  );

  const move = useCallback(
    async (cardId: string, stage: PipelineStage) => {
      await moveCardStage(supabase, cardId, stage);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (cardId: string) => {
      await removePipelineCard(supabase, cardId);
      await reload();
    },
    [reload],
  );

  const byStage = (stage: PipelineStage) => cards.filter((c) => c.stage === stage);

  return { cards, byStage, isLoading, error, reload, add, move, remove };
}
