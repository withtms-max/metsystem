'use client';

import { useState } from 'react';

interface Props {
  inviteCode: string;
  orgName: string;
}

export default function InviteCodeCard({ inviteCode, orgName }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inviteCode) {
    return (
      <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
        <p className="text-sm text-red-800">
          <strong>⚠️ 초대 코드 없음:</strong> 조직 생성 시 자동 발급되어야 하는데 비어있어요. Supabase
          users 테이블 또는 organizations 테이블을 확인해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
            팀원 초대 코드
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <div className="text-4xl font-extrabold tracking-widest">{inviteCode}</div>
            <div className="text-xs opacity-80">{orgName}</div>
          </div>
          <div className="text-xs mt-2 opacity-80">
            영업맨에게 이 코드를 알려주면 모바일 앱에서 가입할 수 있어요
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold backdrop-blur transition">
          {copied ? '✓ 복사됨' : '📋 복사'}
        </button>
      </div>
    </div>
  );
}
