/**
 * "강남3센터 고객관리 통합양식" 형식과 호환되는 CSV export.
 * 양식의 ① 내추럴마켓리스트 / ② 생명수 시트 컬럼 매핑.
 *
 * 영업맨이 export한 CSV를 양식 xlsx의 해당 시트에 붙여넣으면 그대로 사용 가능.
 */

import type { Customer, PipelineCardRow, CustomerRow } from '../types/database';
import { buildCsv, type CsvColumn } from './csv';

function ageFromBirthday(birthday: string | null | undefined): number | '' {
  if (!birthday) return '';
  const d = new Date(birthday);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function yearMonth(date: string | null | undefined): string {
  if (!date) return '';
  return date.slice(0, 7); // '1986-05'
}

/**
 * ① 내추럴마켓리스트 형식 (15 컬럼).
 * No, 이름, 연락처, 관계, 연령(만), 직업, 회사명, 회사위치, 거주지,
 * 생년월, 등급, 소개자, 최근연락일, 다음액션, 비고
 */
export function buildNaturalMarketCsv(customers: Customer[]): string {
  const columns: CsvColumn<Customer & { _idx: number }>[] = [
    { header: 'No.', accessor: (c) => c._idx + 1 },
    { header: '이름', accessor: (c) => c.name },
    { header: '연락처', accessor: (c) => c.phone },
    { header: '관계', accessor: () => '' }, // app엔 없음 — 비고에 적기
    { header: '연령(만)', accessor: (c) => ageFromBirthday(c.birthday) },
    { header: '직업', accessor: (c) => c.job_title },
    { header: '회사명', accessor: (c) => c.company },
    { header: '회사 위치(시/구)', accessor: (c) => c.region_tag },
    { header: '거주지(시/구)', accessor: (c) => c.address },
    { header: '생년월', accessor: (c) => yearMonth(c.birthday) },
    { header: '등급', accessor: (c) => c.grade },
    { header: '소개자', accessor: () => '' },
    { header: '최근 연락일', accessor: (c) => c.updated_at?.slice(0, 10) ?? '' },
    { header: '다음 액션', accessor: () => '' },
    { header: '비고', accessor: (c) => c.memo },
  ];
  const indexed = customers.map((c, _idx) => ({ ...c, _idx }));
  return buildCsv(indexed, columns);
}

/**
 * ② 생명수(월간가망) 형식 (16 컬럼).
 * pipeline_cards를 customer 정보와 함께 export.
 */
export interface PipelineExportRow {
  card: PipelineCardRow;
  customer: CustomerRow | null;
}

export function buildPipelineCsv(rows: PipelineExportRow[]): string {
  const stageToLabel: Record<string, string> = {
    ta_target: '예정',
    ta_done: 'TA완료',
    meeting_scheduled: '미팅예정',
    meeting_done: '미팅완료',
    contract: '계약',
    on_hold: '보류',
  };
  const columns: CsvColumn<PipelineExportRow & { _idx: number }>[] = [
    { header: 'No.', accessor: (r) => r._idx + 1 },
    { header: '구분', accessor: (r) => stageToLabel[r.card.stage] ?? r.card.stage },
    { header: '이름', accessor: (r) => r.customer?.name ?? '' },
    { header: '연락처', accessor: (r) => r.customer?.phone ?? '' },
    { header: '지역', accessor: (r) => r.customer?.region_tag ?? '' },
    {
      header: '관계/직업',
      accessor: (r) => r.customer?.job_title ?? '',
    },
    { header: '예상상품', accessor: () => '' },
    { header: '1차 시도', accessor: () => '' },
    { header: '결과', accessor: () => '' },
    { header: '2차 시도', accessor: () => '' },
    { header: '결과', accessor: () => '' },
    { header: '미팅 확정일', accessor: () => '' },
    { header: '결과(계약/거절/유보)', accessor: (r) => stageToLabel[r.card.stage] ?? '' },
    { header: '다음달 이월', accessor: () => '' },
    { header: '소개 발생', accessor: () => '' },
    { header: '비고', accessor: (r) => r.card.note ?? r.customer?.memo ?? '' },
  ];
  const indexed = rows.map((r, _idx) => ({ ...r, _idx }));
  return buildCsv(indexed, columns);
}
