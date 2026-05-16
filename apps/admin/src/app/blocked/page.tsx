'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function BlockedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[var(--bg)]">
      <div className="w-full max-w-[400px] text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--brand-soft)] flex items-center justify-center mb-6">
          <span className="text-[32px]">📱</span>
        </div>
        <h1 className="text-[24px] font-bold text-[var(--text-900)] tracking-tight leading-snug">
          여긴 센터장 자리예요
        </h1>
        <p className="mt-4 text-[15px] text-[var(--text-500)] leading-relaxed">
          영업맨은 폰 앱에서 일해요.<br />
          이 화면은 센터장만 들어올 수 있어요.
        </p>
        <button onClick={handleSignOut} className="toss-btn-primary mt-8">
          로그아웃
        </button>
      </div>
    </div>
  );
}
