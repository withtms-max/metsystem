-- 팀 시책 (캠페인) — 보험·영업 도메인 "5/1~5/6 신규 계약 5건" 같은 기간+목표 패치.
--
-- team_events 테이블을 확장 (RLS 무변화 — manager only insert 그대로):
--   start_date    시책 시작일
--   end_date      시책 종료일
--   target_value  목표치 (예: 5)
--   target_metric 목표 지표 (contracts | meetings | ta_calls | amount_won | custom)
--
-- event_type 컬럼은 text 라서 'campaign' 값 그대로 저장 가능 (enum 변경 불필요).

ALTER TABLE team_events
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS target_value integer,
  ADD COLUMN IF NOT EXISTS target_metric text;

COMMENT ON COLUMN team_events.start_date IS '시책 시작일 (event_type=campaign 일 때만 사용)';
COMMENT ON COLUMN team_events.end_date IS '시책 종료일';
COMMENT ON COLUMN team_events.target_value IS '시책 목표 수치 — 예: 신규 계약 5건';
COMMENT ON COLUMN team_events.target_metric IS '목표 지표: contracts/meetings/ta_calls/amount_won/custom';

CREATE INDEX IF NOT EXISTS idx_team_events_campaign_range
  ON team_events (organization_id, start_date, end_date)
  WHERE event_type = 'campaign';
