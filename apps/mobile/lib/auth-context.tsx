import {
  completeOnboarding,
  deriveSessionState,
  INITIAL_SESSION_STATE,
  loadProfile,
  type OnboardingInput,
  type SessionState,
} from '@metsystem/shared';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

interface AuthContextValue extends SessionState {
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  finishOnboarding: (input: OnboardingInput) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(INITIAL_SESSION_STATE);

  const hydrate = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState({ ...INITIAL_SESSION_STATE, isLoading: false });
      return;
    }
    const profile = await loadProfile(supabase, session.user.id);
    setState(deriveSessionState(session, profile, false));
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      void hydrate(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrate(session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [hydrate]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const finishOnboarding = useCallback(async (input: OnboardingInput) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('로그인이 필요해요');
    const profile = await completeOnboarding(supabase, user.id, user.email ?? null, input);
    setState((prev) => deriveSessionState(prev.authUser ? { user: prev.authUser } as Session : null, profile, false));
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const profile = await loadProfile(supabase, data.session.user.id);
      setState(deriveSessionState(data.session, profile, false));
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        finishOnboarding,
        refreshProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
