-- ============================================
-- MET System - Fix: organizations INSERT 정책 누락 + auto invite_code 트리거
-- 2026-05-15
-- ============================================
-- 문제: 조직 생성 시 RLS가 INSERT를 차단 (정책 미정의 = 거부)
-- 해결: authenticated 사용자는 누구나 새 조직 생성 가능
-- ============================================
-- ✅ idempotent: 몇 번 돌려도 안전 (drop-create 패턴)
-- ============================================

-- 1. 정책 재생성 (기존 있으면 제거)
drop policy if exists "organizations_authenticated_insert" on public.organizations;

create policy "organizations_authenticated_insert"
    on public.organizations for insert
    to authenticated
    with check (true);

-- 2. 자동 invite_code 생성 함수
create or replace function public.set_invite_code_if_missing()
returns trigger
language plpgsql
as $$
begin
  if new.invite_code is null then
    new.invite_code := public.generate_invite_code();
  end if;
  return new;
end;
$$;

-- 3. 트리거 재생성
drop trigger if exists trg_set_invite_code on public.organizations;
create trigger trg_set_invite_code
  before insert on public.organizations
  for each row execute function public.set_invite_code_if_missing();

-- 4. 검증
select
  'organizations INSERT policy + auto invite_code trigger applied' as status,
  (select count(*) from pg_policies
    where tablename = 'organizations'
      and policyname = 'organizations_authenticated_insert') as policy_exists,
  (select count(*) from pg_trigger
    where tgname = 'trg_set_invite_code') as trigger_exists;
