'use client';

import { buildCsv, downloadCsv, timestampForFilename } from '@metsystem/shared';

interface TeamStatRow {
  salesperson_name: string;
  ta: number;
  meeting: number;
  contract: number;
  current_streak: number;
}

interface Props {
  stats: TeamStatRow[];
  orgName: string;
  date: string;
}

export default function ExportButton({ stats, orgName, date }: Props) {
  const handleExportStats = () => {
    if (stats.length === 0) {
      alert('내보낼 활동이 없어요');
      return;
    }
    const csv = buildCsv<TeamStatRow>(stats, [
      { header: '영업맨', accessor: (r) => r.salesperson_name },
      { header: 'TA(전화)', accessor: (r) => r.ta },
      { header: '미팅', accessor: (r) => r.meeting },
      { header: '계약', accessor: (r) => r.contract },
      { header: '스트릭(일)', accessor: (r) => r.current_streak },
      {
        header: '상태',
        accessor: (r) => {
          const sum = r.ta + r.meeting;
          if (sum >= 10) return '활발';
          if (sum >= 5) return '보통';
          if (sum > 0) return '시작';
          return '부진';
        },
      },
    ]);
    downloadCsv(`${orgName}_팀활동_${date}_${timestampForFilename()}.csv`, csv);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExportStats}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-bold transition">
        <DownloadIcon />
        팀 활동 CSV
      </button>
      <a
        href="/templates/MET_고객관리_통합양식.xlsx"
        download="MET_고객관리_통합양식.xlsx"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition">
        <DocIcon />
        빈 양식 (xlsx)
      </a>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M10 3a.75.75 0 01.75.75v6.69l1.97-1.97a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L6.22 9.53a.75.75 0 011.06-1.06l1.97 1.97V3.75A.75.75 0 0110 3z"
        clipRule="evenodd"
      />
      <path d="M3.5 13.75a.75.75 0 011.5 0v2.5a.75.75 0 00.75.75h8.5a.75.75 0 00.75-.75v-2.5a.75.75 0 011.5 0v2.5A2.25 2.25 0 0114.25 18.5h-8.5A2.25 2.25 0 013.5 16.25v-2.5z" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
