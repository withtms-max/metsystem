-- 1) BUG FIX — 기존 가입 RPC 들이 organization_memberships 에 INSERT 안 하던 문제
-- 2) 팀 5개 제한
-- 3) 오너의 팀 삭제 RPC
-- 4) 백필 (idempotent)

-- ============================================
-- 1) 기존 멤버십 누락 백필 (한 번 더, 안전)
-- ============================================
INSERT INTO organization_memberships (user_id, organization_id, role, status, joined_at)
SELECT id, organization_id, role, 'active', COALESCE(created_at, now())
FROM users
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id)
  DO UPDATE SET status = 'active', left_at = NULL, exit_reason = NULL
  WHERE organization_memberships.status != 'active';

-- ============================================
-- 2) create_organization_with_owner — 멤버십 INSERT 추가
-- ============================================
DROP FUNCTION IF EXISTS create_organization_with_owner(text, text, text, text, text);

CREATE OR REPLACE FUNCTION create_organization_with_owner(
  org_name text,
  org_industry text,
  user_name text,
  user_phone text,
  user_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_invite_code text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다'; END IF;

  v_invite_code := UPPER(substring(md5(gen_random_uuid()::text) FROM 1 FOR 6));

  INSERT INTO organizations (name, industry, invite_code)
  VALUES (org_name, org_industry, v_invite_code)
  RETURNING id INTO v_org_id;

  INSERT INTO users (id, organization_id, role, name, phone, email)
  VALUES (v_user_id, v_org_id, 'owner', user_name, user_phone, user_email)
  ON CONFLICT (id) DO UPDATE
    SET organization_id = v_org_id, role = 'owner',
        name = EXCLUDED.name,
        phone = COALESCE(EXCLUDED.phone, users.phone),
        email = COALESCE(EXCLUDED.email, users.email);

  -- ⭐ 멤버십도 INSERT
  INSERT INTO organization_memberships (user_id, organization_id, role, status, invited_by)
  VALUES (v_user_id, v_org_id, 'owner', 'active', v_user_id)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  RETURN json_build_object('organization_id', v_org_id, 'invite_code', v_invite_code);
END;
$$;

GRANT EXECUTE ON FUNCTION create_organization_with_owner(text, text, text, text, text) TO authenticated;

-- ============================================
-- 3) join_organization_with_invite_code — 멤버십 INSERT 추가
-- ============================================
DROP FUNCTION IF EXISTS join_organization_with_invite_code(text, text, text, text);

CREATE OR REPLACE FUNCTION join_organization_with_invite_code(
  code text,
  user_name text,
  user_phone text,
  user_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다'; END IF;

  SELECT id INTO v_org_id FROM organizations WHERE invite_code = UPPER(code);
  IF v_org_id IS NULL THEN RAISE EXCEPTION '유효하지 않은 초대 코드입니다'; END IF;

  INSERT INTO users (id, organization_id, role, name, phone, email)
  VALUES (v_user_id, v_org_id, 'salesperson', user_name, user_phone, user_email)
  ON CONFLICT (id) DO UPDATE
    SET organization_id = v_org_id, role = 'salesperson',
        name = EXCLUDED.name,
        phone = COALESCE(EXCLUDED.phone, users.phone),
        email = COALESCE(EXCLUDED.email, users.email);

  INSERT INTO organization_memberships (user_id, organization_id, role, status)
  VALUES (v_user_id, v_org_id, 'salesperson', 'active')
  ON CONFLICT (user_id, organization_id)
  DO UPDATE SET status = 'active', left_at = NULL;

  RETURN json_build_object('organization_id', v_org_id);
END;
$$;

GRANT EXECUTE ON FUNCTION join_organization_with_invite_code(text, text, text, text) TO authenticated;

-- ============================================
-- 4) 팀 5개 제한 — request_team_join + create_team
-- ============================================
CREATE OR REPLACE FUNCTION request_team_join(p_invite_code text, p_message text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_request_id uuid;
  v_team_count int;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다'; END IF;

  SELECT COUNT(*) INTO v_team_count
  FROM organization_memberships
  WHERE user_id = v_user_id AND status = 'active';

  IF v_team_count >= 5 THEN
    RAISE EXCEPTION '최대 5개 팀까지만 가입할 수 있어요 (현재 %)', v_team_count;
  END IF;

  SELECT id INTO v_org_id FROM organizations WHERE invite_code = UPPER(p_invite_code);
  IF v_org_id IS NULL THEN RAISE EXCEPTION '유효하지 않은 초대 코드입니다'; END IF;

  IF EXISTS(SELECT 1 FROM organization_memberships
    WHERE user_id = v_user_id AND organization_id = v_org_id AND status = 'active')
  THEN RAISE EXCEPTION '이미 가입된 팀이에요'; END IF;

  IF EXISTS(SELECT 1 FROM organization_join_requests
    WHERE user_id = v_user_id AND organization_id = v_org_id AND status = 'pending')
  THEN RAISE EXCEPTION '이미 신청 중이에요'; END IF;

  INSERT INTO organization_join_requests (user_id, organization_id, invite_code, message)
  VALUES (v_user_id, v_org_id, UPPER(p_invite_code), p_message)
  RETURNING id INTO v_request_id;
  RETURN v_request_id;
END; $$;
GRANT EXECUTE ON FUNCTION request_team_join(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION create_team(p_name text, p_industry text DEFAULT NULL, p_set_active boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_invite_code text;
  v_team_count int;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다'; END IF;
  IF length(trim(p_name)) = 0 THEN RAISE EXCEPTION '팀 이름을 입력해주세요'; END IF;

  SELECT COUNT(*) INTO v_team_count
  FROM organization_memberships
  WHERE user_id = v_user_id AND status = 'active';

  IF v_team_count >= 5 THEN
    RAISE EXCEPTION '최대 5개 팀까지만 소속 가능해요. 기존 팀에서 탈퇴 후 만들어주세요';
  END IF;

  v_invite_code := UPPER(substring(md5(gen_random_uuid()::text) FROM 1 FOR 6));
  INSERT INTO organizations (name, industry, invite_code)
  VALUES (trim(p_name), p_industry, v_invite_code) RETURNING id INTO v_org_id;
  INSERT INTO organization_memberships (user_id, organization_id, role, status, invited_by)
  VALUES (v_user_id, v_org_id, 'owner', 'active', v_user_id);
  IF p_set_active THEN
    UPDATE users SET organization_id = v_org_id, role = 'owner' WHERE id = v_user_id;
  END IF;
  RETURN v_org_id;
END; $$;
GRANT EXECUTE ON FUNCTION create_team(text, text, boolean) TO authenticated;

-- ============================================
-- 5) 팀 삭제 RPC (오너만) — 데이터 모두 사라짐
-- ============================================
CREATE OR REPLACE FUNCTION delete_team(p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_active_other uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다'; END IF;

  SELECT role INTO v_role
  FROM organization_memberships
  WHERE user_id = v_user_id AND organization_id = p_organization_id AND status = 'active';

  IF v_role IS NULL THEN RAISE EXCEPTION '소속된 팀이 아닙니다'; END IF;
  IF v_role != 'owner' THEN RAISE EXCEPTION '오너만 팀을 삭제할 수 있어요'; END IF;

  -- 멤버들의 활성 조직을 다른 팀으로 옮기기 (CASCADE 전에)
  UPDATE users
  SET organization_id = (
    SELECT organization_id FROM organization_memberships
    WHERE user_id = users.id
      AND status = 'active'
      AND organization_id != p_organization_id
    ORDER BY joined_at DESC LIMIT 1
  )
  WHERE organization_id = p_organization_id;

  -- 조직 삭제 (CASCADE 로 모든 관련 데이터 삭제)
  DELETE FROM organizations WHERE id = p_organization_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_team(uuid) TO authenticated;
