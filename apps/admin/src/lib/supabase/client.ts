'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@metsystem/shared';

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      '⚠️ Supabase 환경변수 미설정 — 프로젝트 루트의 .env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 입력해주세요.',
    );
  }

  return createBrowserClient<Database>(url, anonKey);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
