-- 개인 가입 + 팀 만들기 분리.
--
-- 변경:
--  · 가입 시 역할 강제 X → 일단 개인(NULL org)으로 가입
--  · 본인이 나중에 "팀 만들기" 또는 "팀 참여" 선택
--  · 팀 만들기 시 자동으로 본인이 owner + memberships INSERT

-- ============================================
-- 1) users.organization_id NULL 허용 확인
-- ============================================
-- 기존 스키마에서 이미 nullable 일 것 (initial schema 기준). 확인용.
ALTER TABLE users
  ALTER COLUMN organization_id DROP NOT NULL;

-- ============================================
-- 2) create_personal_user RPC — 개인 가입
-- ============================================
-- 역할·조직 없이 users row 만 INSERT. 그 후 사용자가 직접 팀 만들기/참여.
CREATE OR REPLACE FUNCTION create_personal_user(
  p_name text,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다';
  END IF;

  INSERT INTO users (id, name, phone, email, role, organization_id)
  VALUES (v_user_id, p_name, p_phone, p_email, 'salesperson', NULL)
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        phone = COALESCE(EXCLUDED.phone, users.phone),
        email = COALESCE(EXCLUDED.email, users.email);
END;
$$;

GRANT EXECUTE ON FUNCTION create_personal_user(text, text, text) TO authenticated;

-- ============================================
-- 3) create_team RPC — 팀 만들기 (기존 사용자가 본인 팀 생성)
-- ============================================
-- 기존 create_organization_with_owner 는 신규 가입자용이라 users INSERT 도 포함.
-- 이건 이미 가입된 사용자가 추가로 팀 만드는 용.
CREATE OR REPLACE FUNCTION create_team(
  p_name text,
  p_industry text DEFAULT NULL,
  p_set_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_invite_code text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION '팀 이름을 입력해주세요';
  END IF;

  -- 초대 코드 생성 (6자리 영숫자)
  v_invite_code := UPPER(substring(md5(gen_random_uuid()::text) FROM 1 FOR 6));

  INSERT INTO organizations (name, industry, invite_code)
  VALUES (trim(p_name), p_industry, v_invite_code)
  RETURNING id INTO v_org_id;

  -- 멤버십 등록 (owner)
  INSERT INTO organization_memberships (user_id, organization_id, role, status, invited_by)
  VALUES (v_user_id, v_org_id, 'owner', 'active', v_user_id);

  -- 활성 팀으로 설정 (옵션)
  IF p_set_active THEN
    UPDATE users SET organization_id = v_org_id, role = 'owner' WHERE id = v_user_id;
  ELSE
    -- 활성 안 바꿔도 role 은 owner 로 upgrade (활성 팀에서의 role)
    -- 단, 이미 다른 활성 팀에 있다면 그 팀의 role 유지
    NULL;
  END IF;

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_team(text, text, boolean) TO authenticated;
