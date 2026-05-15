-- ============================================
-- MET System - Onboarding SECURITY DEFINER 함수
-- 2026-05-15
-- ============================================
-- 문제: 조직 생성 시 .insert().select() RETURNING이 SELECT 정책을 거침
--      SELECT 정책 = id = get_my_organization_id() = NULL (users 행 없음) → 거부
--      닭-달걀 문제: 조직 만들려면 users 필요, users 만들려면 조직 필요
--
-- 해결: SECURITY DEFINER 함수로 RLS 우회하면서 원자적 처리
-- ============================================

-- === 센터장: 새 조직 생성 + 본인을 manager로 등록 ===
create or replace function public.create_organization_with_owner(
  org_name text,
  org_industry text,
  user_name text,
  user_phone text default null,
  user_email text default null
)
returns table (
  org_id uuid,
  invite_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  new_invite_code text;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception '로그인이 필요해요';
  end if;

  -- 이미 가입한 사용자면 차단
  if exists (select 1 from public.users where id = current_user_id) then
    raise exception '이미 가입한 사용자예요';
  end if;

  new_invite_code := public.generate_invite_code();

  insert into public.organizations (name, industry, invite_code)
  values (org_name, org_industry, new_invite_code)
  returning id into new_org_id;

  insert into public.users (id, organization_id, role, name, phone, email)
  values (current_user_id, new_org_id, 'manager', user_name, user_phone, user_email);

  return query select new_org_id, new_invite_code;
end;
$$;

grant execute on function public.create_organization_with_owner(text, text, text, text, text)
  to authenticated;

-- === 영업맨: 초대코드로 조직 가입 + 본인을 salesperson으로 등록 ===
create or replace function public.join_organization_with_invite_code(
  code text,
  user_name text,
  user_phone text default null,
  user_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception '로그인이 필요해요';
  end if;

  if exists (select 1 from public.users where id = current_user_id) then
    raise exception '이미 가입한 사용자예요';
  end if;

  -- 초대코드로 조직 찾기 (RLS 우회됨)
  select id into target_org_id
  from public.organizations
  where invite_code = upper(code);

  if target_org_id is null then
    raise exception '유효하지 않은 초대 코드예요';
  end if;

  insert into public.users (id, organization_id, role, name, phone, email)
  values (current_user_id, target_org_id, 'salesperson', user_name, user_phone, user_email);

  return target_org_id;
end;
$$;

grant execute on function public.join_organization_with_invite_code(text, text, text, text)
  to authenticated;

-- 검증
select
  'onboarding functions created' as status,
  (select count(*) from pg_proc where proname = 'create_organization_with_owner') as create_fn,
  (select count(*) from pg_proc where proname = 'join_organization_with_invite_code') as join_fn;
