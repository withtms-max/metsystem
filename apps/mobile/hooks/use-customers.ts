import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  type CustomerFilters,
  type CustomerInsert,
  type CustomerUpdate,
  type Customer,
} from '@metsystem/shared';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useCustomers(filters: CustomerFilters = {}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const filterKey = JSON.stringify(filters);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await listCustomers(supabase, JSON.parse(filterKey));
      setCustomers(list);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('알 수 없는 오류'));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (input: CustomerInsert) => {
      const c = await createCustomer(supabase, input);
      await reload();
      return c;
    },
    [reload],
  );

  const update = useCallback(
    async (id: string, patch: CustomerUpdate) => {
      const c = await updateCustomer(supabase, id, patch);
      await reload();
      return c;
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteCustomer(supabase, id);
      await reload();
    },
    [reload],
  );

  return { customers, isLoading, error, reload, create, update, remove };
}
