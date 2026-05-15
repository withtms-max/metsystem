'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <button
      onClick={handleSignOut}
      className="text-xs text-slate-500 hover:text-slate-900 font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition">
      로그아웃
    </button>
  );
}
