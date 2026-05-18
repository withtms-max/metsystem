-- 고객 다중 주소 + 좌표 (지도 + 보험 도메인 특화)
--
-- 보험 영업 컨텍스트:
--  · 자택 주소 — 생일·연하장 발송
--  · 직장 주소 — 평일 방문 (기존 address 컬럼이 이 역할이었음)
--  · 계약 장소 — 청약서 작성 위치 (단체보험·법인보험 중요)
--
-- 좌표:
--  · 카카오맵 표시용 위·경도 (decimal 8자리 정밀도)
--  · Daum Postcode 검색 → Kakao Geocoding 자동 호출 결과 저장
--  · 기존 address 컬럼의 직장 주소를 우선 시각화

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS home_address text,
  ADD COLUMN IF NOT EXISTS contract_address text,
  ADD COLUMN IF NOT EXISTS latitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS longitude numeric(10, 7);

COMMENT ON COLUMN customers.address IS '직장(사무실) 주소 — 평일 방문용';
COMMENT ON COLUMN customers.home_address IS '자택 주소 — 생일·연하장 발송용';
COMMENT ON COLUMN customers.contract_address IS '계약·청약 장소 — 보험 청약서 작성 위치';
COMMENT ON COLUMN customers.latitude IS '대표 좌표 (직장 우선 → 자택 → 계약) — 카카오 Geocoding 결과';
COMMENT ON COLUMN customers.longitude IS '대표 좌표 (직장 우선 → 자택 → 계약) — 카카오 Geocoding 결과';

-- 지도에서 영역 쿼리 시 빠른 lookup
CREATE INDEX IF NOT EXISTS idx_customers_coords
  ON customers (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
