'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import BrandMark from '../_components/brand-mark';

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
      setError('이메일이랑 비밀번호 둘 다 적어주세요');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 넘게요');
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

  const handleKakao = async () => {
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (err) {
        if (err.message.includes('provider is not enabled')) {
          setError('카카오 로그인이 아직 설정되지 않았어요');
        } else {
          setError(err.message);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '카카오 로그인 실패');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {/* 상단 빈 공간 */}
      <div className="flex-1 min-h-12" />

      <main className="w-full max-w-[420px] mx-auto px-6 pb-12">
        {/* 헤드라인 */}
        <div className="mb-10">
          <BrandMark className="mb-7" />
          <h1 className="text-[28px] leading-[1.3] font-bold text-[var(--text-900)] tracking-tight">
            {mode === 'signin' ? (
              <>왔어요.<br />오늘도 한번 챙겨볼까요?</>
            ) : (
              <>잘 오셨어요.<br />같이 한번 정리해봐요</>
            )}
          </h1>
          <p className="mt-3 text-[15px] text-[var(--text-500)]">
            센터장 관리자 페이지
          </p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            autoComplete="email"
            className="toss-input"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="toss-input"
          />

          {error && (
            <div className="px-4 py-3 rounded-xl bg-[#FEF2F2] text-[14px] text-[var(--danger)] font-medium">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button type="submit" disabled={loading} className="toss-btn-primary">
              {loading ? '잠깐만요...' : mode === 'signin' ? '들어가기' : '계정 만들고 들어가기'}
            </button>
          </div>
        </form>

        {/* 모드 전환 */}
        <div className="mt-5 flex items-center justify-center gap-2 text-[14px]">
          <span className="text-[var(--text-500)]">
            {mode === 'signin' ? '아직 계정 없어요?' : '벌써 만들었어요?'}
          </span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
            className="font-semibold text-[var(--brand)] hover:underline">
            {mode === 'signin' ? '만들러 가기' : '로그인'}
          </button>
        </div>

        {/* 구분선 */}
        <div className="my-7 flex items-center gap-4">
          <div className="flex-1 h-px bg-[var(--line-strong)]" />
          <span className="text-[13px] text-[var(--text-400)]">간편 로그인</span>
          <div className="flex-1 h-px bg-[var(--line-strong)]" />
        </div>

        {/* 카카오 */}
        <button type="button" onClick={handleKakao} className="toss-btn-kakao">
          <KakaoIcon />
          카카오로 시작하기
        </button>

        <p className="mt-8 text-center text-[12px] text-[var(--text-400)] leading-relaxed">
          영업맨용 앱은 폰에서 따로 깔아요. 여긴 센터장만
        </p>
      </main>

      <div className="flex-1 min-h-8" />
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.87 5.32 4.7 6.74-.2.7-.74 2.56-.84 2.96-.13.5.18.5.39.36.16-.1 2.5-1.7 3.51-2.39.74.1 1.5.16 2.24.16 5.52 0 10-3.58 10-8s-4.48-7.83-10-7.83z"
        fill="#191919"
      />
    </svg>
  );
}


function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return '둘 중 하나가 틀렸어요';
  if (msg.includes('User already registered')) return '이 이메일로 벌써 가입했네요';
  if (msg.includes('rate limit')) return '너무 빨라요. 잠깐 쉬었다가 다시';
  if (msg.includes('Missing NEXT_PUBLIC_SUPABASE')) return '키가 안 꽂혀 있어요 (.env.local 확인)';
  return msg;
}
