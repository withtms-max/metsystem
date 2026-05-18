-- 가입 신청 취소 — 영업맨 본인이 pending 신청을 취소.
--
-- 사용 시나리오:
--   · 영업맨이 실수로 잘못된 코드 입력 → 취소 후 재신청
--   · 관리자가 응답 느림 → 다른 팀으로 변경하고 싶음

CREATE OR REPLACE FUNCTION cancel_team_join(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다';
  END IF;

  SELECT * INTO v_request FROM organization_join_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN
    RAISE EXCEPTION '신청을 찾을 수 없습니다';
  END IF;

  -- 본인 신청만 취소 가능
  IF v_request.user_id != v_user_id THEN
    RAISE EXCEPTION '본인 신청만 취소할 수 있어요';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION '대기 중인 신청만 취소할 수 있어요';
  END IF;

  UPDATE organization_join_requests
  SET status = 'cancelled', decided_at = now()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_team_join(uuid) TO authenticated;
