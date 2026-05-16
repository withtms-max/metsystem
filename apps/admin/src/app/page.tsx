import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SignOutButton from './_components/sign-out-button';
import InviteCodeCard from './_components/invite-code-card';
import ExportButton from './_components/export-button';
import BrandMark from './_components/brand-mark';

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

  const { data: { user } } = await supabase.auth.getUser();
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
    const find = (type: string) =>
      (rawStats ?? []).find(
        (s: { user_id: string; activity_type: string }) => s.user_id === m.id && s.activity_type === type,
      ) as { completed_count?: number } | undefined;
    return {
      user_id: m.id,
      salesperson_name: m.name,
      ta: find('ta_call')?.completed_count ?? 0,
      meeting: find('meeting')?.completed_count ?? 0,
      contract: find('contract')?.completed_count ?? 0,
      current_streak: m.current_streak,
    };
  });

  const totalTa = stats.reduce((s, m) => s + m.ta, 0);
  const totalMeeting = stats.reduce((s, m) => s + m.meeting, 0);
  const totalContract = stats.reduce((s, m) => s + m.contract, 0);
  const taGoal = stats.length * 10;
  const meetingGoal = stats.length * 3;
  const inactive = stats.filter((s) => s.ta + s.meeting === 0).map((s) => s.salesperson_name);

  const niceDate = new Date(today).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* 헤더 */}
      <header className="bg-[var(--bg-elev)] border-b border-[var(--line)]">
        <div className="max-w-[1080px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark size="sm" />
            <div className="hidden md:block pl-2 ml-1 border-l border-[var(--line-strong)]">
              <div className="text-[12px] text-[var(--text-500)] leading-tight">
                {org?.name ?? '센터 미지정'} · 센터장 모드
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[var(--text-700)] font-semibold">{me.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-[1080px] mx-auto px-8 py-10">
        {/* 타이틀 영역 */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[13px] font-semibold text-[var(--brand)] mb-2">{niceDate}</div>
            <h1 className="text-[32px] font-bold text-[var(--text-900)] tracking-tight leading-tight">
              오늘 우리 팀,<br />얼마나 움직였나요?
            </h1>
            <p className="text-[14px] text-[var(--text-500)] mt-3">
              누구한테 갔는지는 안 보여요. 얼마나 했는지만 봐요
            </p>
          </div>
          <ExportButton stats={stats} orgName={org?.name ?? 'org'} date={today} />
        </div>

        {/* 초대 코드 */}
        {org && <InviteCodeCard inviteCode={org.invite_code ?? ''} orgName={org.name} />}

        {/* KPI 카드 3개 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="TA(전화)" value={totalTa} goal={taGoal} accent="blue" />
          <StatCard label="미팅" value={totalMeeting} goal={meetingGoal} accent="green" />
          <StatCard label="계약" value={totalContract} accent="amber" />
        </div>

        {/* 팀원별 활동 */}
        <section className="bg-[var(--bg-elev)] rounded-2xl border border-[var(--line)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--line)] flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-[var(--text-900)]">팀원별 활동</h2>
              <p className="text-[12px] text-[var(--text-500)] mt-0.5">{stats.length}명 · 통계만 보여요</p>
            </div>
          </div>

          {stats.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--brand-soft)] flex items-center justify-center mb-4">
                <span className="text-[24px]">👋</span>
              </div>
              <p className="text-[15px] font-bold text-[var(--text-900)]">아직 아무도 없어요</p>
              <p className="text-[13px] text-[var(--text-500)] mt-2">
                위 코드 카톡으로 던져주세요. 들어오면 여기 뜹니다
              </p>
            </div>
          ) : (
            <ul>
              {stats.map((m) => {
                const total = m.ta + m.meeting;
                const tone =
                  total >= 10
                    ? { label: '활발', color: 'var(--success)', bg: '#E6F9F1' }
                    : total >= 5
                      ? { label: '보통', color: 'var(--brand)', bg: 'var(--brand-soft)' }
                      : total > 0
                        ? { label: '시작', color: 'var(--text-700)', bg: 'var(--line)' }
                        : { label: '부진', color: 'var(--danger)', bg: '#FEF2F2' };
                return (
                  <li key={m.user_id} className="flex items-center px-6 py-4 border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg)] transition">
                    <div className="w-10 h-10 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center font-bold text-[14px] shrink-0">
                      {m.salesperson_name[0]}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="text-[15px] font-bold text-[var(--text-900)]">{m.salesperson_name}</div>
                      {m.current_streak > 0 && (
                        <div className="text-[12px] text-[var(--warn)] font-semibold mt-0.5">
                          🔥 {m.current_streak}일 연속 달성
                        </div>
                      )}
                    </div>
                    <div className="hidden md:flex items-center gap-8 mr-6">
                      <MetricMini label="TA" value={m.ta} />
                      <MetricMini label="미팅" value={m.meeting} />
                      <MetricMini label="계약" value={m.contract} />
                    </div>
                    <span
                      className="shrink-0 inline-flex items-center h-7 px-3 rounded-full text-[12px] font-bold"
                      style={{ color: tone.color, backgroundColor: tone.bg }}>
                      {tone.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {inactive.length > 0 && (
          <div className="mt-6 p-5 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA]">
            <div className="text-[13px] font-bold text-[var(--warn)] mb-1">한번 찔러봐 주세요</div>
            <p className="text-[14px] text-[var(--text-700)] leading-relaxed">
              <span className="font-semibold">{inactive.join(', ')}</span> 오늘 조용해요. 무슨 일 있나요?
            </p>
          </div>
        )}

        <p className="mt-12 text-center text-[12px] text-[var(--text-400)]">
          고객 이름·연락처는 영업맨 본인만 봐요 · DB에서 막혀 있어요
        </p>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  goal,
  accent,
}: {
  label: string;
  value: number;
  goal?: number;
  accent: 'blue' | 'green' | 'amber';
}) {
  const color =
    accent === 'blue'
      ? { fg: 'var(--brand)', bg: 'var(--brand-soft)' }
      : accent === 'green'
        ? { fg: 'var(--success)', bg: '#E6F9F1' }
        : { fg: 'var(--warn)', bg: '#FFF4E5' };
  const pct = goal && goal > 0 ? Math.min(100, (value / goal) * 100) : null;

  return (
    <div className="bg-[var(--bg-elev)] rounded-2xl border border-[var(--line)] p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold text-[var(--text-700)]">{label}</span>
        <span
          className="text-[11px] font-bold px-2 py-1 rounded-md"
          style={{ color: color.fg, backgroundColor: color.bg }}>
          오늘
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[32px] font-extrabold text-[var(--text-900)] tabular-nums">{value}</span>
        {goal !== undefined && (
          <span className="text-[15px] text-[var(--text-400)] font-medium">/ {goal}건</span>
        )}
      </div>
      {pct !== null && (
        <div className="mt-4 h-1.5 bg-[var(--line)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color.fg }}
          />
        </div>
      )}
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="text-[11px] text-[var(--text-500)] font-semibold">{label}</div>
      <div className="text-[15px] font-bold text-[var(--text-900)] tabular-nums">{value}</div>
    </div>
  );
}
