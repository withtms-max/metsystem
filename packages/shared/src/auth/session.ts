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

export async function completeOnboarding(
  supabase: MetSupabaseClient,
  authUserId: string,
  email: string | null,
  input: OnboardingInput,
): Promise<User> {
  let organizationId: string | null = null;

  if (input.role === 'salesperson') {
    if (!input.inviteCode) throw new Error('초대 코드가 필요해요');
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id')
      .eq('invite_code', input.inviteCode.toUpperCase())
      .maybeSingle();
    if (orgErr) throw orgErr;
    if (!org) throw new Error('유효하지 않은 초대 코드예요');
    organizationId = (org as { id: string }).id;
  } else {
    if (!input.organizationName) throw new Error('센터명을 입력해주세요');
    const inviteCode = generateInviteCode();
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        name: input.organizationName,
        industry: input.industry ?? null,
        invite_code: inviteCode,
      } as any)
      .select('id')
      .single();
    if (orgErr) throw orgErr;
    organizationId = (org as { id: string }).id;
  }

  const { data: profile, error: userErr } = await supabase
    .from('users')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      id: authUserId,
      organization_id: organizationId,
      role: input.role,
      name: input.name,
      phone: input.phone ?? null,
      email,
    } as any)
    .select('*')
    .single();

  if (userErr) throw userErr;
  return profile as User;
}

function generateInviteCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
