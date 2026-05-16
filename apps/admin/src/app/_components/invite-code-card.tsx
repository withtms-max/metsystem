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
      <div className="mb-6 p-5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA]">
        <div className="text-[13px] font-bold text-[var(--danger)] mb-1">코드가 비어있어요</div>
        <p className="text-[13px] text-[var(--text-700)] leading-relaxed">
          조직 만들 때 자동으로 생겼어야 하는데… organizations 테이블 한번 봐주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 p-6 rounded-2xl bg-[var(--brand)] text-white"
      style={{ boxShadow: '0 8px 24px rgba(49, 130, 246, 0.25)' }}>
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold opacity-80 mb-2">{orgName} 들어오는 코드</div>
          <div className="text-[36px] font-extrabold tracking-[0.2em] tabular-nums leading-none">
            {inviteCode}
          </div>
          <div className="text-[13px] mt-3 opacity-85 leading-relaxed">
            영업맨한테 카톡으로 던지면 됩니다. 6자리만 치면 들어와요
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 h-10 px-5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-[0.98] text-[13px] font-bold backdrop-blur transition">
          {copied ? '복사됐어요' : '복사'}
        </button>
      </div>
    </div>
  );
}
