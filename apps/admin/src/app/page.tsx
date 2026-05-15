export default function Home() {
  const team = [
    { name: '김영업', ta: 12, meeting: 3, contract: 1, streak: 5 },
    { name: '이수영', ta: 8, meeting: 2, contract: 0, streak: 2 },
    { name: '박지훈', ta: 15, meeting: 4, contract: 2, streak: 7 },
    { name: '정민호', ta: 3, meeting: 0, contract: 0, streak: 0 },
    { name: '최서연', ta: 10, meeting: 3, contract: 1, streak: 4 },
  ];

  const totalTa = team.reduce((s, m) => s + m.ta, 0);
  const totalMeeting = team.reduce((s, m) => s + m.meeting, 0);
  const totalContract = team.reduce((s, m) => s + m.contract, 0);
  const taGoal = 50;
  const meetingGoal = 15;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">M</div>
            <div>
              <div className="font-bold text-slate-900">MET System</div>
              <div className="text-xs text-slate-500">강남센터 · 센터장 모드</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">박센터장님</span>
            <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-sm">박</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">팀 활동 대시보드</h1>
            <p className="text-sm text-slate-500 mt-1">2026년 5월 15일 (금) · 통계 데이터만 표시 (고객 정보 접근 불가)</p>
          </div>
          <div className="flex gap-2 bg-white rounded-xl p-1 border border-slate-200">
            <button className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-blue-600 text-white">오늘</button>
            <button className="px-4 py-1.5 text-sm font-semibold rounded-lg text-slate-600">이번주</button>
            <button className="px-4 py-1.5 text-sm font-semibold rounded-lg text-slate-600">이번달</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl">📞</div>
              <div className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700">TA</div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{totalTa}<span className="text-base text-slate-400 font-medium"> / {taGoal}</span></div>
            <div className="text-sm text-slate-500 mt-1">전화 활동</div>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, (totalTa / taGoal) * 100)}%` }} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl">🤝</div>
              <div className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">미팅</div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{totalMeeting}<span className="text-base text-slate-400 font-medium"> / {meetingGoal}</span></div>
            <div className="text-sm text-slate-500 mt-1">대면 미팅</div>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (totalMeeting / meetingGoal) * 100)}%` }} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl">🎉</div>
              <div className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700">계약</div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{totalContract}</div>
            <div className="text-sm text-slate-500 mt-1">오늘 성사된 계약</div>
            <div className="mt-3 text-xs text-emerald-600 font-semibold">↑ 어제 대비 +2건</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">👥 팀원별 활동</h2>
            <span className="text-xs text-slate-500">⚠️ 통계만 표시 · 고객명/연락처 접근 불가</span>
          </div>
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
              {team.map((m) => (
                <tr key={m.name} className="border-t border-slate-100">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">{m.name[0]}</div>
                      <span className="font-semibold text-slate-900">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700">{m.ta}건</td>
                  <td className="px-6 py-4 font-semibold text-slate-700">{m.meeting}건</td>
                  <td className="px-6 py-4 font-semibold text-slate-700">{m.contract}건</td>
                  <td className="px-6 py-4">
                    {m.streak > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">🔥 {m.streak}일</span>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {m.ta + m.meeting >= 10 ? (
                      <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">활발</span>
                    ) : m.ta + m.meeting >= 5 ? (
                      <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">보통</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold">⚠️ 부진</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>⚠️ 주의:</strong> 정민호 사원이 3일간 활동이 없어요. 한번 챙겨보시는 게 어떨까요?
          </p>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          MET System · 영업맨의 프라이버시는 DB 레벨에서 보호됩니다 (Supabase RLS)
        </div>
      </main>
    </div>
  );
}
