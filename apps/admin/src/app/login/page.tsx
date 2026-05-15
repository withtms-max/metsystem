'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요');
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: err } =
        mode === 'signin'
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({ email: email.trim(), password });

      if (err) {
        setError(translateError(err.message));
        return;
      }
      router.refresh();
      router.push('/');
    } catch (e) {
      setError(e instanceof Error ? translateError(e.message) : '오류 발생');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-blue-600 items-center justify-center text-white text-3xl font-bold mb-4">
            M
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MET System</h1>
          <p className="text-sm text-slate-500 mt-1">센터장 관리자 페이지</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex gap-2 bg-slate-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                mode === 'signin' ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}>
              로그인
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                mode === 'signup' ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}>
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition">
              {loading ? '처리 중...' : mode === 'signin' ? '로그인하기' : '가입하기'}
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center mt-4">
            {mode === 'signup'
              ? '가입 후 조직(센터) 생성 화면으로 이동해요'
              : '영업맨 앱은 모바일에서 별도 가입하세요'}
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          ⚠️ Supabase 환경변수 미설정 시 로그인 실패해요 (.env.local 입력 필요)
        </p>
      </div>
    </div>
  );
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 틀려요';
  if (msg.includes('User already registered')) return '이미 가입된 이메일이에요';
  if (msg.includes('rate limit')) return '잠시 후 다시 시도해주세요';
  if (msg.includes('Missing NEXT_PUBLIC_SUPABASE'))
    return '⚠️ Supabase 환경변수 미설정 — .env.local 확인';
  return msg;
}
