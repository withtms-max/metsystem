import { getDailyCounts, type DailyCounts } from '@metsystem/shared';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

const ZERO: DailyCounts = { ta: 0, meeting: 0, contract: 0, memo: 0 };

export function useDailyCounts() {
  const { authUser } = useAuth();
  const [counts, setCounts] = useState<DailyCounts>(ZERO);
  const [isLoading, setIsLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  const reload = useCallback(async () => {
    if (!authUser) {
      setCounts(ZERO);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const c = await getDailyCounts(supabase, authUser.id, today);
      setCounts(c);
    } catch {
      setCounts(ZERO);
    } finally {
      setIsLoading(false);
    }
  }, [authUser, today]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { counts, isLoading, reload };
}
