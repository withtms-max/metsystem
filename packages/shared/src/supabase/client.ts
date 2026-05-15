import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * 플랫폼 무관 Supabase 클라이언트 팩토리.
 * 모바일/웹에서 각각 환경변수와 storage 어댑터를 주입해 사용.
 */
export interface SupabaseClientOptions {
  url: string;
  anonKey: string;
  /** 모바일: AsyncStorage, 웹: undefined(기본 localStorage) */
  storage?: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  };
  /** 모바일에서는 false (URL 디텍션 불필요) */
  detectSessionInUrl?: boolean;
}

export function createSupabaseClient(
  options: SupabaseClientOptions,
): SupabaseClient<Database> {
  return createClient<Database>(options.url, options.anonKey, {
    auth: {
      storage: options.storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: options.detectSessionInUrl ?? true,
    },
  });
}

export type MetSupabaseClient = SupabaseClient<Database>;
