'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeOnboarding } from '@metsystem/shared';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const INDUSTRIES = ['보험 GA', '부동산', '자동차', '제약', 'B2B 영업', '기타'];

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
      setError('이름과 센터명을 입력해주세요');
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      setError(e instanceof Error ? e.message : '오류 발생');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">센터 만들기 🖥️</h1>
          <p className="text-sm text-slate-500 mt-1">새 조직을 만들고 팀원을 초대하세요</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="박센터장"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">센터(조직) 이름 *</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="강남센터"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">업종</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setIndustry(i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    industry === i
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}>
                  {i}
                </button>
              ))}
            </div>
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
            {loading ? '처리 중...' : '조직 만들기'}
          </button>

          <p className="text-xs text-slate-500 leading-relaxed">
            💡 조직 생성 후 초대 코드가 자동 발급돼요. 팀원에게 공유하면 그 코드로 모바일 앱에서
            가입할 수 있어요.
          </p>
        </form>
      </div>
    </div>
  );
}
