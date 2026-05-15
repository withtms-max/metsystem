import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SignOutButton from './_components/sign-out-button';
import InviteCodeCard from './_components/invite-code-card';
import ExportButton from './_components/export-button';

interface TeamStat {
  user_id: string;
  salesperson_name: string;
  ta: number;
  meeting: number;
  contract: number;
  current_streak: number;
}

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) redirect('/onboarding');

  const me = profile as {
    id: string;
    name: string;
    role: string;
    organization_id: string | null;
    organizations: { id: string; name: string; invite_code: string | null; industry: string | null } | null;
  };

  const org = me.organizations;
  if (me.role === 'salesperson') redirect('/blocked');

  const today = new Date().toISOString().slice(0, 10);

  const { data: rawStats } = org
    ? await supabase
        .from('manager_activity_stats')
        .select('*')
        .eq('organization_id', org.id)
        .eq('activity_date', today)
    : { data: [] };

  const { data: members } = org
    ? await supabase
        .from('users')
        .select('id, name, current_streak')
        .eq('organization_id', org.id)
        .eq('role', 'salesperson')
        .eq('is_active', true)
    : { data: [] };

  const stats: TeamStat[] = (members ?? []).map((m: { id: string; name: string; current_streak: number }) => {
    const taRow = (rawStats ?? []).find(
      (s: { user_id: string; activity_type: string }) => s.user_id === m.id && s.activity_type === 'ta_call',
    );
    const meetingRow = (rawStats ?? []).find(
      (s: { user_id: string; activity_type: string }) => s.user_id === m.id && s.activity_type === 'meeting',
    );
    const contractRow = (rawStats ?? []).find(
      (s: { user_id: string; activity_type: string }) => s.user_id === m.id && s.activity_type === 'contract',
    );
    return {
      user_id: m.id,
      salesperson_name: m.name,
      ta: ((taRow as { completed_count?: number } | undefined)?.completed_count) ?? 0,
      meeting: ((meetingRow as { completed_count?: number } | undefined)?.completed_count) ?? 0,
      contract: ((contractRow as { completed_count?: number } | undefined)?.completed_count) ?? 0,
      current_streak: m.current_streak,
    };
  });

  const totalTa = stats.reduce((s, m) => s + m.ta, 0);
  const totalMeeting = stats.reduce((s, m) => s + m.meeting, 0);
  const totalContract = stats.reduce((s, m) => s + m.contract, 0);
  const taGoal = stats.length * 10;
  const meetingGoal = stats.length * 3;
  const inactive = stats.filter((s) => s.ta + s.meeting === 0).map((s) => s.salesperson_name);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              M
            </div>
            <div>
              <div className="font-bold text-slate-900">MET System</div>
              <div className="text-xs text-slate-500">
                {org?.name ?? '센터 정보 없음'} · {me.role === 'owner' ? '오너' : '센터장'} 모드
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{me.name}님</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">팀 활동 대시보드</h1>
            <p className="text-sm text-slate-500 mt-1">
              {today} · ⚠️ 통계 데이터만 표시 (고객 정보는 영업맨 본인만 접근)
            </p>
          </div>
          <ExportButton stats={stats} orgName={org?.name ?? 'org'} date={today} />
        </div>

        {org && <InviteCodeCard inviteCode={org.invite_code ?? ''} orgName={org.name} />}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard emoji="📞" label="TA" value={totalTa} goal={taGoal} color="blue" />
          <StatCard emoji="🤝" label="미팅" value={totalMeeting} goal={meetingGoal} color="emerald" />
          <StatCard emoji="🎉" label="계약" value={totalContract} color="amber" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">
              👥 팀원별 활동 ({stats.length}명)
            </h2>
            <span className="text-xs text-slate-500">
              ⚠️ 통계만 표시 · 고객명/연락처 접근 불가
            </span>
          </div>

          {stats.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl mb-3">👋</div>
              <p className="text-slate-600 font-semibold">아직 팀원이 없어요</p>
              <p className="text-sm text-slate-500 mt-2">
                위 초대 코드를 영업맨에게 공유하면 가입할 수 있어요
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-6 py-3">영업맨</th>
                  <th className="px-6 py-3">📞 TA</th>
                  <th className="px-6 py-3">🤝 미팅</th>
                  <th className="px-6 py-3">🎉 계약</th>
                  <th className="px-6 py-3">🔥 스트릭</th>
                  <th className="px-6 py-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((m) => (
                  <tr key={m.user_id} className="border-t border-slate-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                          {m.salesperson_name[0]}
                        </div>
                        <span className="font-semibold text-slate-900">{m.salesperson_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{m.ta}건</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{m.meeting}건</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{m.contract}건</td>
                    <td className="px-6 py-4">
                      {m.current_streak > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                          🔥 {m.current_streak}일
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {m.ta + m.meeting >= 10 ? (
                        <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                          활발
                        </span>
                      ) : m.ta + m.meeting >= 5 ? (
                        <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                          보통
                        </span>
                      ) : m.ta + m.meeting > 0 ? (
                        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                          시작
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold">
                          ⚠️ 부진
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {inactive.length > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>⚠️ 주의:</strong> {inactive.join(', ')} 사원이 오늘 활동이 없어요. 한번 챙겨보시는 건 어떨까요?
            </p>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-slate-400">
          MET System · 영업맨의 프라이버시는 DB 레벨에서 보호됩니다 (Supabase RLS)
        </div>
      </main>
    </div>
  );
}

function StatCard({
  emoji,
  label,
  value,
  goal,
  color,
}: {
  emoji: string;
  label: string;
  value: number;
  goal?: number;
  color: 'blue' | 'emerald' | 'amber';
}) {
  const ringColor =
    color === 'blue' ? 'bg-blue-50 text-blue-700' : color === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700';
  const barColor = color === 'blue' ? 'bg-blue-600' : color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500';

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <div className="text-3xl">{emoji}</div>
        <div className={`text-xs font-semibold px-2 py-1 rounded-full ${ringColor}`}>{label}</div>
      </div>
      <div className="text-3xl font-bold text-slate-900">
        {value}
        {goal !== undefined && (
          <span className="text-base text-slate-400 font-medium"> / {goal}</span>
        )}
      </div>
      {goal !== undefined && goal > 0 && (
        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full`}
            style={{ width: `${Math.min(100, (value / goal) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
