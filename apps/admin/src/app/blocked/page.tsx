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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-6">📱</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          이 페이지는 센터장용이에요
        </h1>
        <p className="text-slate-600 mb-6 leading-relaxed">
          영업맨 계정으로 로그인하셨네요. 영업 기능은 모바일 앱(MET System)에서 사용할 수 있어요.
          관리자 웹은 센터장 권한으로만 접근 가능합니다.
        </p>
        <button
          onClick={handleSignOut}
          className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition">
          로그아웃
        </button>
      </div>
    </div>
  );
}
