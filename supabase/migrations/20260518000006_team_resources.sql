-- 팀 자료 + 댓글 — 영업맨이 카톡에 흩어진 자료를 한곳에서 관리.
--
-- 자료 유형:
--  · 업로드 파일 (PDF, 이미지) — Supabase Storage
--  · 외부 링크 (YouTube, 외부 PDF, Notion 등) — URL만 저장
--
-- 권한:
--  · 같은 조직 멤버 모두 SELECT
--  · 업로드한 본인 + 센터장/오너 DELETE
--  · 모두 댓글 가능

CREATE TABLE IF NOT EXISTS team_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  -- 파일 업로드 시
  file_path text,        -- storage 객체 경로 (org_id/resource_id/filename)
  file_name text,
  file_size_bytes bigint,
  mime_type text,
  -- 외부 링크 시
  external_url text,
  -- 메타
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN team_resources.category IS 'training | sales_doc | contract | notice | script | general';

CREATE INDEX IF NOT EXISTS idx_team_resources_org_created
  ON team_resources (organization_id, created_at DESC);

ALTER TABLE team_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_resources_select" ON team_resources;
CREATE POLICY "team_resources_select" ON team_resources
  FOR SELECT
  USING (organization_id = get_my_organization_id());

DROP POLICY IF EXISTS "team_resources_insert" ON team_resources;
CREATE POLICY "team_resources_insert" ON team_resources
  FOR INSERT
  WITH CHECK (
    organization_id = get_my_organization_id()
    AND uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS "team_resources_update" ON team_resources;
CREATE POLICY "team_resources_update" ON team_resources
  FOR UPDATE
  USING (organization_id = get_my_organization_id());

DROP POLICY IF EXISTS "team_resources_delete" ON team_resources;
CREATE POLICY "team_resources_delete" ON team_resources
  FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR get_my_role() IN ('manager', 'owner')
  );

-- ============================================
-- 댓글
-- ============================================

CREATE TABLE IF NOT EXISTS resource_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES team_resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resource_comments_resource
  ON resource_comments (resource_id, created_at);

ALTER TABLE resource_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resource_comments_select" ON resource_comments;
CREATE POLICY "resource_comments_select" ON resource_comments
  FOR SELECT
  USING (
    resource_id IN (
      SELECT id FROM team_resources WHERE organization_id = get_my_organization_id()
    )
  );

DROP POLICY IF EXISTS "resource_comments_insert" ON resource_comments;
CREATE POLICY "resource_comments_insert" ON resource_comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND resource_id IN (
      SELECT id FROM team_resources WHERE organization_id = get_my_organization_id()
    )
  );

DROP POLICY IF EXISTS "resource_comments_delete" ON resource_comments;
CREATE POLICY "resource_comments_delete" ON resource_comments
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR get_my_role() IN ('manager', 'owner')
  );

-- ============================================
-- Storage bucket — Supabase 대시보드에서 추가 설정 필요
-- ============================================
-- 사용자가 직접 해야 할 일 (SQL Editor 에서 한 번에 실행):
--   1. bucket 생성
--   2. 객체 RLS 정책 — 같은 조직 멤버만 read/write

INSERT INTO storage.buckets (id, name, public)
VALUES ('team-resources', 'team-resources', false)
ON CONFLICT (id) DO NOTHING;

-- 객체 경로 규약: {organization_id}/{resource_id}/{filename}
-- 첫 번째 폴더가 조직 ID 라서 (storage.foldername(name))[1] 로 매칭

DROP POLICY IF EXISTS "team_resources_storage_select" ON storage.objects;
CREATE POLICY "team_resources_storage_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'team-resources'
    AND (storage.foldername(name))[1] = get_my_organization_id()::text
  );

DROP POLICY IF EXISTS "team_resources_storage_insert" ON storage.objects;
CREATE POLICY "team_resources_storage_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'team-resources'
    AND (storage.foldername(name))[1] = get_my_organization_id()::text
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "team_resources_storage_delete" ON storage.objects;
CREATE POLICY "team_resources_storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'team-resources'
    AND (
      owner = auth.uid()
      OR get_my_role() IN ('manager', 'owner')
    )
  );

-- 조회수 증가 RPC (트랜잭션 안전)
CREATE OR REPLACE FUNCTION increment_resource_view(p_resource_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE team_resources
  SET view_count = view_count + 1
  WHERE id = p_resource_id
    AND organization_id = get_my_organization_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_resource_view(uuid) TO authenticated;
