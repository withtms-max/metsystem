'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeOnboarding } from '@metsystem/shared';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const INDUSTRIES = ['보험 GA', '부동산', '자동차', '제약', 'B2B 영업', '기타'];

function extractErrorMessage(e: unknown): string {
  if (!e) return '알 수 없는 오류';
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null) {
    const o = e as { message?: string; details?: string; hint?: string; code?: string };
    if (o.message) {
      const parts = [o.message];
      if (o.code) parts.push(`(${o.code})`);
      if (o.hint) parts.push(`hint: ${o.hint}`);
      return parts.join(' ');
    }
    try { return JSON.stringify(e); } catch { return String(e); }
  }
  return String(e);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('보험 GA');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !orgName.trim()) {
      setError('이름이랑 센터명 둘 다 적어주세요');
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      await completeOnboarding(supabase, user.id, user.email ?? null, {
        name: name.trim(),
        role: 'manager',
        organizationName: orgName.trim(),
        industry,
      });
      router.refresh();
      router.push('/');
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <div className="flex-1 min-h-8" />

      <main className="w-full max-w-[420px] mx-auto px-6 pb-12">
        <div className="mb-10">
          <div className="text-[13px] font-semibold text-[var(--brand)] mb-2">센터 만들기</div>
          <h1 className="text-[28px] leading-[1.3] font-bold text-[var(--text-900)] tracking-tight">
            우리 센터,<br />여기서 시작해볼게요
          </h1>
          <p className="mt-3 text-[15px] text-[var(--text-500)]">
            만들면 팀원 부를 6자리 코드 바로 나와요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="이름">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="박센터장"
              className="toss-input"
            />
          </Field>

          <Field label="센터 이름">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="강남센터"
              className="toss-input"
            />
          </Field>

          <Field label="업종">
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setIndustry(i)}
                  className={`h-10 px-4 rounded-full text-[13px] font-semibold transition ${
                    industry === i
                      ? 'bg-[var(--brand)] text-white'
                      : 'bg-[var(--line)] text-[var(--text-700)] hover:bg-[var(--line-strong)]'
                  }`}>
                  {i}
                </button>
              ))}
            </div>
          </Field>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-[#FEF2F2] text-[14px] text-[var(--danger)] font-medium">
              {error}
            </div>
          )}

          <div className="pt-3">
            <button type="submit" disabled={loading} className="toss-btn-primary">
              {loading ? '잠깐만요...' : '센터 만들기'}
            </button>
          </div>
        </form>
      </main>

      <div className="flex-1 min-h-8" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-[var(--text-700)] mb-2">{label}</label>
      {children}
    </div>
  );
}
