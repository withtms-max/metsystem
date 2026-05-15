import { listTaScripts, type MessageTemplate } from '@metsystem/shared';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useTaScripts() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listTaScripts(supabase)
      .then((list) => {
        if (!cancelled) {
          setTemplates(list);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { templates, isLoading };
}
