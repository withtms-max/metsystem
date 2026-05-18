-- 다중 팀 멤버십 — V2 (Multi-team support).
--
-- 설계:
--   users.organization_id 는 "현재 활성 팀" 으로 그대로 유지 (기존 RLS 영향 0)
--   organization_memberships = "내가 속한 모든 팀" (M:N)
--   organization_join_requests = pending 가입 신청
--
-- 팀 스위처는 users.organization_id 만 갱신 → 기존 모든 RLS 그대로 동작.

-- ============================================
-- 1) organization_memberships (M:N 멤버십)
-- ============================================
CREATE TABLE IF NOT EXISTS organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'salesperson',
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  -- 누가 가입시켰는지 (관리자가 승인한 경우)
  invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
  -- 내보내기 사유 / 탈퇴 사유
  exit_reason text,
  UNIQUE (user_id, organization_id)
);

COMMENT ON COLUMN organization_memberships.status IS 'active | left (본인 탈퇴) | removed (관리자 퇴장)';
COMMENT ON COLUMN organization_memberships.role IS 'salesperson | manager | owner';

CREATE INDEX IF NOT EXISTS idx_memberships_user_active
  ON organization_memberships (user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_memberships_org_active
  ON organization_memberships (organization_id) WHERE status = 'active';

ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인의 모든 멤버십 + 본인이 매니저인 조직의 모든 멤버십
DROP POLICY IF EXISTS "memberships_select" ON organization_memberships;
CREATE POLICY "memberships_select" ON organization_memberships
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      organization_id = get_my_organization_id()
      AND get_my_role() IN ('manager', 'owner')
    )
  );

-- INSERT/UPDATE/DELETE 는 RPC 함수로만 (직접 조작 막음)
DROP POLICY IF EXISTS "memberships_no_direct_write" ON organization_memberships;
CREATE POLICY "memberships_no_direct_write" ON organization_memberships
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- ============================================
-- 2) organization_join_requests (가입 신청)
-- ============================================
CREATE TABLE IF NOT EXISTS organization_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invite_code text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_reason text
);

COMMENT ON COLUMN organization_join_requests.status IS 'pending | approved | rejected | cancelled';

CREATE INDEX IF NOT EXISTS idx_join_requests_org_pending
  ON organization_join_requests (organization_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_join_requests_user
  ON organization_join_requests (user_id, requested_at DESC);

ALTER TABLE organization_join_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 신청 + 본인이 매니저인 조직의 신청
DROP POLICY IF EXISTS "join_requests_select" ON organization_join_requests;
CREATE POLICY "join_requests_select" ON organization_join_requests
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      organization_id = get_my_organization_id()
      AND get_my_role() IN ('manager', 'owner')
    )
  );

-- 직접 변경은 RPC 만
DROP POLICY IF EXISTS "join_requests_no_direct_write" ON organization_join_requests;
CREATE POLICY "join_requests_no_direct_write" ON organization_join_requests
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- ============================================
-- 3) 기존 데이터 백필 — users.organization_id → memberships
-- ============================================
INSERT INTO organization_memberships (user_id, organization_id, role, status, joined_at)
SELECT id, organization_id, role, 'active', COALESCE(created_at, now())
FROM users
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ============================================
-- 4) RPC — 가입 신청
-- ============================================
CREATE OR REPLACE FUNCTION request_team_join(
  p_invite_code text,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_already_member boolean;
  v_pending_exists boolean;
  v_request_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다';
  END IF;

  -- 초대 코드로 조직 조회
  SELECT id INTO v_org_id FROM organizations WHERE invite_code = UPPER(p_invite_code);
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION '유효하지 않은 초대 코드입니다';
  END IF;

  -- 이미 활성 멤버?
  SELECT EXISTS(
    SELECT 1 FROM organization_memberships
    WHERE user_id = v_user_id AND organization_id = v_org_id AND status = 'active'
  ) INTO v_already_member;
  IF v_already_member THEN
    RAISE EXCEPTION '이미 가입된 팀이에요';
  END IF;

  -- pending 신청 있는지
  SELECT EXISTS(
    SELECT 1 FROM organization_join_requests
    WHERE user_id = v_user_id AND organization_id = v_org_id AND status = 'pending'
  ) INTO v_pending_exists;
  IF v_pending_exists THEN
    RAISE EXCEPTION '이미 신청 중이에요. 관리자 승인을 기다려주세요';
  END IF;

  -- 신청 INSERT
  INSERT INTO organization_join_requests (user_id, organization_id, invite_code, message)
  VALUES (v_user_id, v_org_id, UPPER(p_invite_code), p_message)
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION request_team_join(text, text) TO authenticated;

-- ============================================
-- 5) RPC — 신청 승인 (관리자)
-- ============================================
CREATE OR REPLACE FUNCTION approve_team_join(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_request RECORD;
  v_caller_role text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다';
  END IF;

  SELECT * INTO v_request FROM organization_join_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN
    RAISE EXCEPTION '신청을 찾을 수 없습니다';
  END IF;
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION '이미 처리된 신청입니다';
  END IF;

  -- 호출자가 해당 조직의 manager/owner 인지
  SELECT role INTO v_caller_role
  FROM organization_memberships
  WHERE user_id = v_caller
    AND organization_id = v_request.organization_id
    AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('manager', 'owner') THEN
    RAISE EXCEPTION '승인 권한이 없습니다';
  END IF;

  -- 멤버십 추가 (있으면 활성화)
  INSERT INTO organization_memberships (user_id, organization_id, role, status, invited_by)
  VALUES (v_request.user_id, v_request.organization_id, 'salesperson', 'active', v_caller)
  ON CONFLICT (user_id, organization_id)
  DO UPDATE SET status = 'active', left_at = NULL, exit_reason = NULL;

  -- 신청 상태 변경
  UPDATE organization_join_requests
  SET status = 'approved', decided_by = v_caller, decided_at = now()
  WHERE id = p_request_id;

  -- 활성 조직이 NULL 인 사용자라면 이 조직을 active 로 (첫 가입 케이스)
  UPDATE users
  SET organization_id = v_request.organization_id
  WHERE id = v_request.user_id AND organization_id IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_team_join(uuid) TO authenticated;

-- ============================================
-- 6) RPC — 신청 거절 (관리자)
-- ============================================
CREATE OR REPLACE FUNCTION reject_team_join(p_request_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_request RECORD;
  v_caller_role text;
BEGIN
  SELECT * INTO v_request FROM organization_join_requests WHERE id = p_request_id;
  IF v_request IS NULL OR v_request.status != 'pending' THEN
    RAISE EXCEPTION '처리할 수 없는 신청입니다';
  END IF;

  SELECT role INTO v_caller_role
  FROM organization_memberships
  WHERE user_id = v_caller AND organization_id = v_request.organization_id AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('manager', 'owner') THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  UPDATE organization_join_requests
  SET status = 'rejected', decided_by = v_caller, decided_at = now(), decision_reason = p_reason
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reject_team_join(uuid, text) TO authenticated;

-- ============================================
-- 7) RPC — 팀 탈퇴 (본인)
-- ============================================
CREATE OR REPLACE FUNCTION leave_team(p_organization_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_membership RECORD;
  v_other_org uuid;
  v_owner_count int;
BEGIN
  SELECT * INTO v_membership
  FROM organization_memberships
  WHERE user_id = v_user_id AND organization_id = p_organization_id AND status = 'active';

  IF v_membership IS NULL THEN
    RAISE EXCEPTION '소속된 팀이 아닙니다';
  END IF;

  -- owner 가 본인이고 다른 owner 가 없으면 탈퇴 불가
  IF v_membership.role = 'owner' THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM organization_memberships
    WHERE organization_id = p_organization_id
      AND role = 'owner'
      AND status = 'active'
      AND user_id != v_user_id;
    IF v_owner_count = 0 THEN
      RAISE EXCEPTION '마지막 오너는 탈퇴할 수 없어요. 다른 멤버를 오너로 임명하거나 조직을 삭제하세요';
    END IF;
  END IF;

  -- 멤버십 status='left' 로
  UPDATE organization_memberships
  SET status = 'left', left_at = now(), exit_reason = p_reason
  WHERE id = v_membership.id;

  -- 활성 조직이 이 조직이었다면 다른 활성 멤버십으로 전환
  SELECT organization_id INTO v_other_org
  FROM organization_memberships
  WHERE user_id = v_user_id AND status = 'active'
  ORDER BY joined_at DESC
  LIMIT 1;

  UPDATE users
  SET organization_id = v_other_org
  WHERE id = v_user_id AND organization_id = p_organization_id;
END;
$$;

GRANT EXECUTE ON FUNCTION leave_team(uuid, text) TO authenticated;

-- ============================================
-- 8) RPC — 멤버 내보내기 (관리자)
-- ============================================
CREATE OR REPLACE FUNCTION remove_team_member(
  p_user_id uuid,
  p_organization_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_role text;
  v_target_role text;
  v_other_org uuid;
BEGIN
  IF v_caller = p_user_id THEN
    RAISE EXCEPTION '본인을 내보낼 수 없어요. 탈퇴 기능을 사용하세요';
  END IF;

  SELECT role INTO v_caller_role
  FROM organization_memberships
  WHERE user_id = v_caller AND organization_id = p_organization_id AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('manager', 'owner') THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  SELECT role INTO v_target_role
  FROM organization_memberships
  WHERE user_id = p_user_id AND organization_id = p_organization_id AND status = 'active';

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION '해당 멤버가 없습니다';
  END IF;

  -- owner 는 내보낼 수 없음 (다른 owner 만 가능, 그것도 미지원)
  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION '오너는 내보낼 수 없어요';
  END IF;

  -- manager 는 owner 만 내보낼 수 있음
  IF v_target_role = 'manager' AND v_caller_role != 'owner' THEN
    RAISE EXCEPTION '매니저는 오너만 내보낼 수 있어요';
  END IF;

  UPDATE organization_memberships
  SET status = 'removed', left_at = now(), exit_reason = p_reason
  WHERE user_id = p_user_id AND organization_id = p_organization_id;

  -- 그 사용자의 활성 조직이 이 조직이었다면 전환
  SELECT organization_id INTO v_other_org
  FROM organization_memberships
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY joined_at DESC
  LIMIT 1;

  UPDATE users
  SET organization_id = v_other_org
  WHERE id = p_user_id AND organization_id = p_organization_id;
END;
$$;

GRANT EXECUTE ON FUNCTION remove_team_member(uuid, uuid, text) TO authenticated;

-- ============================================
-- 9) RPC — 활성 팀 전환 (스위처)
-- ============================================
CREATE OR REPLACE FUNCTION switch_active_team(p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_active_member boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM organization_memberships
    WHERE user_id = v_user_id AND organization_id = p_organization_id AND status = 'active'
  ) INTO v_is_active_member;

  IF NOT v_is_active_member THEN
    RAISE EXCEPTION '소속된 팀이 아닙니다';
  END IF;

  UPDATE users SET organization_id = p_organization_id WHERE id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION switch_active_team(uuid) TO authenticated;
