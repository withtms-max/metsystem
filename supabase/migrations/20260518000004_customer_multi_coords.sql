-- 다중 주소 좌표 — 자택·계약 장소도 지도 핀으로 표시
--
-- 기존:
--   customers.latitude / longitude  → 직장(대표) 좌표
-- 추가:
--   customers.home_latitude / home_longitude         → 자택 좌표
--   customers.contract_latitude / contract_longitude → 계약 장소 좌표

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS home_latitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS home_longitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS contract_latitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS contract_longitude numeric(10, 7);

COMMENT ON COLUMN customers.home_latitude IS '자택 위도 (보험 도메인)';
COMMENT ON COLUMN customers.home_longitude IS '자택 경도 (보험 도메인)';
COMMENT ON COLUMN customers.contract_latitude IS '계약 장소 위도 (보험 도메인)';
COMMENT ON COLUMN customers.contract_longitude IS '계약 장소 경도 (보험 도메인)';
