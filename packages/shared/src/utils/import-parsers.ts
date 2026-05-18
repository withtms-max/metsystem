/**
 * 일괄 가져오기 파서 — CSV / vCard 지원.
 *
 * 지원 소스:
 *  · 챙김 자체 양식 (CSV/Excel — 양식 정해진 컬럼명)
 *  · 리멤버 export (Excel/CSV — 한글 컬럼명)
 *  · 네이버 주소록 (vCard .vcf)
 *  · 폰 연락처 (vCard .vcf)
 *  · 구글 연락처 (CSV — 영문 컬럼명)
 */

import type { CustomerGrade } from '../types/database';

export interface ImportedCustomer {
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  address: string | null;
  memo: string | null;
  birthday: string | null;
  /** 추정 등급 (없으면 D) */
  grade: CustomerGrade;
}

/** 한국어 또는 영어 컬럼명 → 표준 필드 매핑 */
const FIELD_MAP: Record<string, keyof ImportedCustomer> = {
  // 이름
  '이름': 'name',
  '성명': 'name',
  'name': 'name',
  'first name': 'name',
  // 전화
  '휴대전화': 'phone',
  '휴대폰': 'phone',
  '전화번호': 'phone',
  '연락처': 'phone',
  '핸드폰': 'phone',
  'phone': 'phone',
  'mobile': 'phone',
  'cell': 'phone',
  // 이메일
  '이메일': 'email',
  '이멜': 'email',
  'email': 'email',
  'e-mail': 'email',
  // 회사
  '회사': 'company',
  '회사명': 'company',
  '소속': 'company',
  '기관': 'company',
  'company': 'company',
  'organization': 'company',
  // 직위·직함
  '직위': 'job_title',
  '직함': 'job_title',
  '직책': 'job_title',
  '직급': 'job_title',
  'title': 'job_title',
  'job title': 'job_title',
  'position': 'job_title',
  // 주소
  '주소': 'address',
  '회사주소': 'address',
  'address': 'address',
  // 생일
  '생일': 'birthday',
  '생년월일': 'birthday',
  'birthday': 'birthday',
  'birth': 'birthday',
  // 메모
  '메모': 'memo',
  '비고': 'memo',
  '특이사항': 'memo',
  'memo': 'memo',
  'notes': 'memo',
  'note': 'memo',
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[*_]/g, '');
}

function normalizePhone(p: string | null | undefined): string | null {
  if (!p) return null;
  // 숫자만 추출
  const digits = p.replace(/[^0-9]/g, '');
  if (digits.length === 10 && digits.startsWith('10'))
    return `0${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith('010'))
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return p.trim();
}

function normalizeBirthday(b: string | null | undefined): string | null {
  if (!b) return null;
  // YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD / YYMMDD / YYYYMMDD 다 처리
  const cleaned = b.trim().replace(/[./]/g, '-');
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned)) {
    const parts = cleaned.split('-');
    const y = parts[0] ?? '';
    const m = parts[1] ?? '';
    const d = parts[2] ?? '';
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6)}`;
  }
  if (/^\d{6}$/.test(cleaned)) {
    // YYMMDD — 1900/2000 추정
    const y = Number(cleaned.slice(0, 2));
    const century = y > 30 ? '19' : '20';
    return `${century}${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4)}`;
  }
  return null;
}

// ============================================
// CSV 파서
// ============================================

/**
 * 간단한 CSV 파서 — 따옴표 처리 포함.
 * 외부 라이브러리 X (PapaParse 등 무거움)
 */
export function parseCsv(text: string): string[][] {
  // BOM 제거
  const cleaned = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let cur: string[] = [];
  let val = '';
  let inQuote = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inQuote) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          val += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        val += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ',') {
        cur.push(val);
        val = '';
      } else if (ch === '\n') {
        cur.push(val);
        rows.push(cur);
        cur = [];
        val = '';
      } else if (ch === '\r') {
        // 무시
      } else {
        val += ch;
      }
    }
  }
  if (val.length > 0 || cur.length > 0) {
    cur.push(val);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export function parseCsvCustomers(text: string): ImportedCustomer[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headerRow = rows[0] ?? [];
  const headers = headerRow.map(normalizeHeader);
  const fieldByCol: (keyof ImportedCustomer | null)[] = headers.map(
    (h) => FIELD_MAP[h] ?? null,
  );

  const out: ImportedCustomer[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const rec: Partial<ImportedCustomer> = { grade: 'D' };
    for (let c = 0; c < row.length; c++) {
      const field = fieldByCol[c];
      if (!field) continue;
      const value = row[c]?.trim();
      if (!value) continue;
      if (field === 'phone') rec.phone = normalizePhone(value);
      else if (field === 'birthday') rec.birthday = normalizeBirthday(value);
      else if (field === 'grade')
        rec.grade = ['A', 'B', 'C', 'D'].includes(value)
          ? (value as CustomerGrade)
          : 'D';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else (rec as any)[field] = value;
    }
    if (rec.name) {
      out.push({
        name: rec.name,
        phone: rec.phone ?? null,
        email: rec.email ?? null,
        company: rec.company ?? null,
        job_title: rec.job_title ?? null,
        address: rec.address ?? null,
        memo: rec.memo ?? null,
        birthday: rec.birthday ?? null,
        grade: rec.grade ?? 'D',
      });
    }
  }
  return out;
}

// ============================================
// vCard 파서 (.vcf)
// ============================================

export function parseVcardCustomers(text: string): ImportedCustomer[] {
  const cards = text.split(/BEGIN:VCARD/i).slice(1); // 첫 빈 항목 제거
  const out: ImportedCustomer[] = [];

  for (const card of cards) {
    const body = card.split(/END:VCARD/i)[0] ?? '';
    const lines = body.split(/\r?\n/).filter(Boolean);
    let name = '';
    let phone: string | null = null;
    let email: string | null = null;
    let company: string | null = null;
    let job_title: string | null = null;
    let address: string | null = null;
    let memo: string | null = null;
    let birthday: string | null = null;

    for (const line of lines) {
      // 속성 이름은 ; 또는 : 까지
      const splitIdx = line.indexOf(':');
      if (splitIdx === -1) continue;
      const tagPart = line.slice(0, splitIdx).toUpperCase();
      const value = line.slice(splitIdx + 1).trim();
      const tag = tagPart.split(';')[0];

      if (tag === 'FN') name = decodeVcardValue(value);
      else if (tag === 'N' && !name) {
        const parts = value.split(';');
        name = decodeVcardValue([parts[1] ?? '', parts[0] ?? ''].join('').trim());
      } else if (tag === 'TEL' && !phone) {
        phone = normalizePhone(value);
      } else if (tag === 'EMAIL' && !email) {
        email = value;
      } else if (tag === 'ORG' && !company) {
        company = decodeVcardValue(value.split(';')[0] ?? value);
      } else if (tag === 'TITLE' && !job_title) {
        job_title = decodeVcardValue(value);
      } else if (tag === 'ADR' && !address) {
        // ADR;TYPE=WORK:;;도로명;도시;도/시;우편번호;국가
        const parts = value.split(';').filter(Boolean);
        address = decodeVcardValue(parts.join(' '));
      } else if (tag === 'NOTE' && !memo) {
        memo = decodeVcardValue(value);
      } else if (tag === 'BDAY' && !birthday) {
        birthday = normalizeBirthday(value);
      }
    }

    if (name.trim()) {
      out.push({
        name: name.trim(),
        phone,
        email,
        company,
        job_title,
        address,
        memo,
        birthday,
        grade: 'D',
      });
    }
  }

  return out;
}

/** vCard 값 디코딩 (QUOTED-PRINTABLE / escape 등) */
function decodeVcardValue(value: string): string {
  return value
    .replace(/\\n/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/=\r?\n/g, '')
    .trim();
}

// ============================================
// 통합 파서 — 파일 확장자 기반
// ============================================

export function detectAndParse(filename: string, text: string): ImportedCustomer[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.vcf') || /BEGIN:VCARD/i.test(text.slice(0, 200))) {
    return parseVcardCustomers(text);
  }
  // CSV (.csv, .txt 등) — 양식 신뢰
  return parseCsvCustomers(text);
}
