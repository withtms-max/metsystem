import type { Session, User as AuthUser } from '@supabase/supabase-js';
import type { MetSupabaseClient } from '../supabase/client';
import type { User, UserRole } from '../types/database';

export interface SessionState {
  authUser: AuthUser | null;
  profile: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
}

export const INITIAL_SESSION_STATE: SessionState = {
  authUser: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  isOnboarded: false,
};

export async function loadProfile(
  supabase: MetSupabaseClient,
  authUserId: string,
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUserId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[auth] loadProfile error:', error);
    return null;
  }
  return (data ?? null) as User | null;
}

export function deriveSessionState(
  session: Session | null,
  profile: User | null,
  isLoading = false,
): SessionState {
  const authUser = session?.user ?? null;
  return {
    authUser,
    profile,
    isLoading,
    isAuthenticated: !!authUser,
    isOnboarded: !!profile && !!profile.role && !!profile.name,
  };
}

export interface OnboardingInput {
  name: string;
  role: UserRole;
  phone?: string;
  inviteCode?: string;
  organizationName?: string;
  industry?: string;
}

/**
 * 온보딩 완료 — SECURITY DEFINER RPC 함수 호출.
 * 이전: 직접 .insert() 호출 → RLS RETURNING 정책 충돌 (42501).
 * 현재: 서버 사이드 함수가 RLS 우회하며 organizations + users를 원자적으로 생성.
 */
export async function completeOnboarding(
  supabase: MetSupabaseClient,
  authUserId: string,
  email: string | null,
  input: OnboardingInput,
): Promise<User> {
  if (input.role === 'salesperson') {
    if (!input.inviteCode) throw new Error('초대 코드가 필요해요');

    const { error } = await supabase.rpc('join_organization_with_invite_code', {
      code: input.inviteCode.toUpperCase(),
      user_name: input.name,
      user_phone: input.phone ?? null,
      user_email: email,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (error) throw error;
  } else if (input.role === 'manager' || input.role === 'owner') {
    if (!input.organizationName) throw new Error('센터명을 입력해주세요');

    const { error } = await supabase.rpc('create_organization_with_owner', {
      org_name: input.organizationName,
      org_industry: input.industry ?? null,
      user_name: input.name,
      user_phone: input.phone ?? null,
      user_email: email,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (error) throw error;
  } else {
    throw new Error(`알 수 없는 역할: ${input.role}`);
  }

  // 함수 완료 후 새로 생성된 profile 가져오기
  const profile = await loadProfile(supabase, authUserId);
  if (!profile) throw new Error('가입 후 프로필을 찾을 수 없어요');
  return profile;
}
