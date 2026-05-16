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
      className="text-[13px] font-semibold text-[var(--text-500)] hover:text-[var(--text-900)] px-3 py-2 rounded-lg hover:bg-[var(--line)] transition">
      로그아웃
    </button>
  );
}
