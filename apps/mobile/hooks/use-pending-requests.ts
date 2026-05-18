/**
 * 가입 신청 대기 수 — 관리자/오너용.
 *
 * 활성 팀의 pending 가입 신청 카운트를 폴링.
 * 사용처: 홈 배너, 팀 탭 배지, 브라우저 알림.
 */

import { listPendingJoinRequests } from '@metsystem/shared';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export function usePendingRequests() {
  const { profile, organization } = useAuth();
  const isManager = profile?.role === 'manager' || profile?.role === 'owner';
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isManager || !organization) {
      setCount(0);
      return;
    }
    setLoading(true);
    try {
      const list = await listPendingJoinRequests(supabase);
      setCount(list.length);
    } catch (e) {
      console.warn('[usePendingRequests] failed', e);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [isManager, organization]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { count, isManager, loading, refresh };
}
