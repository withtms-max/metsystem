-- 영업 인텔리전스 — 영업맨이 놓치기 쉬운 핵심 필드들
--
-- 컨셉: 영업맨은 "OO이는 둘째 아들 누구, OO이는 골프 좋아함, OO이는 다음 주 자료
-- 보내기로 함" 같은 걸 머리에 다 못 담음 → 시스템이 들고 있어야 함.
--
-- 추가 필드:
--   anniversary             결혼기념일 (생일과 다른 슬롯)
--   children                자녀 정보 (JSON 배열, 유연한 스키마)
--   hobbies                 취미·관심사 태그 (배열)
--   referrer_id             소개해 준 사람 (FK to customers) — 소개 그래프
--   next_action_text        다음 액션 한 줄 ("자료 보내기")
--   next_action_date        다음 액션 예정일 (캘린더 자동 등록)
--   last_contact_at         마지막 활동 timestamp (트리거로 자동 갱신)
--   preferred_contact_time  선호 시간 ("점심 후", "퇴근 후", "주말")
--   preferred_contact_method 선호 방법 (call/sms/kakao/email)
--   competitor_product      현재 가입/사용 중인 경쟁사 상품
--   rejection_reason        거절 사유 (재공략 시 활용)

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS anniversary date,
  ADD COLUMN IF NOT EXISTS children jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hobbies text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS referrer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_action_text text,
  ADD COLUMN IF NOT EXISTS next_action_date date,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS preferred_contact_time text,
  ADD COLUMN IF NOT EXISTS preferred_contact_method text,
  ADD COLUMN IF NOT EXISTS competitor_product text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN customers.anniversary IS '결혼기념일 (보험·금융 라포 형성에 활용)';
COMMENT ON COLUMN customers.children IS '자녀 정보 [{ name, birth_year, school? }] JSON';
COMMENT ON COLUMN customers.hobbies IS '취미·관심사 태그 (골프, 낚시, 와인 등)';
COMMENT ON COLUMN customers.referrer_id IS '이 고객을 소개해 준 고객 (소개 그래프)';
COMMENT ON COLUMN customers.next_action_text IS '다음 약속 액션 — "자료 보내기" 등';
COMMENT ON COLUMN customers.next_action_date IS '다음 액션 예정일 (캘린더 자동 등록 대상)';
COMMENT ON COLUMN customers.last_contact_at IS '마지막 활동 시각 (activity_logs 트리거로 자동 갱신)';

CREATE INDEX IF NOT EXISTS idx_customers_next_action ON customers (next_action_date)
  WHERE next_action_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_last_contact ON customers (last_contact_at);
CREATE INDEX IF NOT EXISTS idx_customers_referrer ON customers (referrer_id)
  WHERE referrer_id IS NOT NULL;

-- ============================================
-- 자동 last_contact_at 갱신 트리거
-- ============================================
-- activity_logs insert/update 시 해당 고객의 last_contact_at 을 max(activity_date) 로 갱신.
-- 이걸로 "90일 무연락 고객" 같은 알림 즉시 계산 가능.

CREATE OR REPLACE FUNCTION update_customer_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET last_contact_at = GREATEST(
      COALESCE(last_contact_at, '1970-01-01'::timestamptz),
      NEW.created_at
    )
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_last_contact ON activity_logs;
CREATE TRIGGER trg_update_last_contact
  AFTER INSERT ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_last_contact();

-- 기존 activity_logs 데이터로 last_contact_at 초기값 채우기
UPDATE customers c
SET last_contact_at = sub.last_at
FROM (
  SELECT customer_id, MAX(created_at) AS last_at
  FROM activity_logs
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) sub
WHERE c.id = sub.customer_id
  AND (c.last_contact_at IS NULL OR c.last_contact_at < sub.last_at);

-- ============================================
-- 골든타임 룰: 결혼기념일 타입 추가
-- ============================================
-- rule_type 은 text 라서 enum 변경 불필요 (이미 'custom', 'birthday' 등 자유롭게 사용 중)
-- 'anniversary' 도 그대로 저장 가능
