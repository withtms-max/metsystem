/**
 * 팀 멤버십 — 다중 팀 지원 (V2).
 *
 * users.organization_id 는 "현재 활성 팀". organization_memberships 는 "내가 속한 모든 팀".
 * 모든 변경은 RPC 함수로만 (직접 INSERT/UPDATE 금지).
 */

import type { MetSupabaseClient } from '../supabase/client';
import type { JoinRequest, OrganizationMembership } from '../types/database';

// ============================================
// 내 팀 목록
// ============================================

export interface MyTeam {
  membership: OrganizationMembership;
  organization: {
    id: string;
    name: string;
    industry: string | null;
    invite_code: string | null;
  };
}

/** 내가 속한 모든 활성 팀 */
export async function listMyTeams(supabase: MetSupabaseClient): Promise<MyTeam[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('organization_memberships')
    .select(`
      id, user_id, organization_id, role, status, joined_at, left_at, invited_by, exit_reason,
      organizations(id, name, industry, invite_code)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true });

  if (error) {
    console.warn('[listMyTeams] failed', error);
    return [];
  }

  type Raw = OrganizationMembership & {
    organizations:
      | { id: string; name: string; industry: string | null; invite_code: string | null }
      | { id: string; name: string; industry: string | null; invite_code: string | null }[]
      | null;
  };

  return ((data ?? []) as unknown as Raw[])
    .map((r) => {
      const org = Array.isArray(r.organizations) ? r.organizations[0] : r.organizations;
      if (!org) return null;
      const { organizations: _omit, ...membership } = r;
      void _omit;
      return { membership: membership as OrganizationMembership, organization: org };
    })
    .filter((x): x is MyTeam => x !== null);
}

// ============================================
// 신청 보기 (영업맨 본인 + 관리자)
// ============================================

/** 내가 보낸 가입 신청들 */
export async function listMyJoinRequests(
  supabase: MetSupabaseClient,
): Promise<JoinRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('organization_join_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('requested_at', { ascending: false });

  if (error) {
    console.warn('[listMyJoinRequests] failed', error);
    return [];
  }
  return (data ?? []) as JoinRequest[];
}

export interface PendingRequestWithUser extends JoinRequest {
  user_name: string | null;
  user_email: string | null;
}

/** 내 조직의 pending 가입 신청들 (관리자용) */
export async function listPendingJoinRequests(
  supabase: MetSupabaseClient,
): Promise<PendingRequestWithUser[]> {
  const { data, error } = await supabase
    .from('organization_join_requests')
    .select('*, users(name, email)')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (error) {
    console.warn('[listPendingJoinRequests] failed', error);
    return [];
  }

  type Raw = JoinRequest & {
    users:
      | { name: string | null; email: string | null }
      | { name: string | null; email: string | null }[]
      | null;
  };

  return ((data ?? []) as unknown as Raw[]).map((r) => {
    const u = Array.isArray(r.users) ? r.users[0] : r.users;
    const { users: _omit, ...rest } = r;
    void _omit;
    return {
      ...(rest as JoinRequest),
      user_name: u?.name ?? null,
      user_email: u?.email ?? null,
    };
  });
}

// ============================================
// 팀원 목록 (관리자용)
// ============================================

export interface TeamMember {
  membership: OrganizationMembership;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: string;
  };
}

/** 현재 활성 조직의 모든 멤버 (관리자만 SELECT 가능 — RLS 적용) */
export async function listTeamMembers(
  supabase: MetSupabaseClient,
  organizationId: string,
): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('organization_memberships')
    .select('*, users(id, name, email, phone, role)')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true });

  if (error) {
    console.warn('[listTeamMembers] failed', error);
    return [];
  }

  type Raw = OrganizationMembership & {
    users:
      | { id: string; name: string | null; email: string | null; phone: string | null; role: string }
      | { id: string; name: string | null; email: string | null; phone: string | null; role: string }[]
      | null;
  };

  return ((data ?? []) as unknown as Raw[])
    .map((r) => {
      const u = Array.isArray(r.users) ? r.users[0] : r.users;
      if (!u) return null;
      const { users: _omit, ...membership } = r;
      void _omit;
      return { membership: membership as OrganizationMembership, user: u };
    })
    .filter((x): x is TeamMember => x !== null);
}

// ============================================
// RPC 호출 — 모든 쓰기 작업
// ============================================

/** 가입 신청 — 초대 코드로 요청 (관리자 승인 대기) */
export async function requestTeamJoin(
  supabase: MetSupabaseClient,
  inviteCode: string,
  message?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('request_team_join', {
    p_invite_code: inviteCode,
    p_message: message ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (error) throw error;
  return data as string;
}

export async function approveTeamJoin(
  supabase: MetSupabaseClient,
  requestId: string,
): Promise<void> {
  const { error } = await supabase.rpc('approve_team_join', {
    p_request_id: requestId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (error) throw error;
}

export async function rejectTeamJoin(
  supabase: MetSupabaseClient,
  requestId: string,
  reason?: string,
): Promise<void> {
  const { error } = await supabase.rpc('reject_team_join', {
    p_request_id: requestId,
    p_reason: reason ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (error) throw error;
}

export async function leaveTeam(
  supabase: MetSupabaseClient,
  organizationId: string,
  reason?: string,
): Promise<void> {
  const { error } = await supabase.rpc('leave_team', {
    p_organization_id: organizationId,
    p_reason: reason ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (error) throw error;
}

export async function removeTeamMember(
  supabase: MetSupabaseClient,
  userId: string,
  organizationId: string,
  reason?: string,
): Promise<void> {
  const { error } = await supabase.rpc('remove_team_member', {
    p_user_id: userId,
    p_organization_id: organizationId,
    p_reason: reason ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (error) throw error;
}

export async function switchActiveTeam(
  supabase: MetSupabaseClient,
  organizationId: string,
): Promise<void> {
  const { error } = await supabase.rpc('switch_active_team', {
    p_organization_id: organizationId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (error) throw error;
}
