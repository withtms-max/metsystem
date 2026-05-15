/**
 * CSV 빌더 — Excel에서 한글 깨지지 않게 UTF-8 BOM 자동 삽입.
 * .xlsx 라이브러리 없이도 Excel/Numbers/Google Sheets에서 깔끔하게 열림.
 */

const UTF8_BOM = '﻿';

export interface CsvColumn<T> {
  header: string;
  /** 행에서 셀 값 추출 (날짜 포맷팅 등 사용자 정의) */
  accessor: (row: T) => string | number | null | undefined;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(',');
  const bodyLines = rows.map((row) =>
    columns.map((c) => escapeCell(c.accessor(row))).join(','),
  );
  return UTF8_BOM + [headerLine, ...bodyLines].join('\r\n');
}

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // 쉼표, 따옴표, 줄바꿈이 들어있으면 따옴표로 감싸기 (CSV 표준)
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 브라우저에서 CSV를 파일로 다운로드.
 * (Expo 웹 + Next.js 둘 다 동일하게 작동)
 */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('downloadCsv는 브라우저 환경에서만 사용 가능해요');
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 'YYYY-MM-DD_HHmm' 포맷으로 현재 시각 반환 (파일명용) */
export function timestampForFilename(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}
