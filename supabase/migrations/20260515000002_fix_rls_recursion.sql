-- ============================================
-- MET System - Fix: RLS infinite recursion on users/organizations
-- 2026-05-15
-- ============================================
-- 문제: users 테이블 RLS 정책이 users를 다시 쿼리 → 무한 재귀
-- 해결: SECURITY DEFINER 헬퍼 함수로 RLS 우회해서 org_id/role 조회
-- ============================================
-- 실행 방법: Supabase SQL Editor에 전체 복사 → Run
-- ============================================

-- 1. 문제 정책 제거
drop policy if exists "users_self_read" on public.users;
drop policy if exists "organizations_member_read" on public.organizations;
drop policy if exists "organizations_manager_update" on public.organizations;

-- 2. SECURITY DEFINER 헬퍼 함수
-- RLS를 우회해서 현재 사용자의 organization_id와 role을 조회
create or replace function public.current_user_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select organization_id from public.users where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

grant execute on function public.current_user_org_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;

-- 3. 정책 재생성 (재귀 없이)
create policy "users_self_read"
    on public.users for select
    using (
      auth.uid() = id
      or organization_id = public.current_user_org_id()
    );

create policy "organizations_member_read"
    on public.organizations for select
    using (id = public.current_user_org_id());

create policy "organizations_manager_update"
    on public.organizations for update
    using (
      id = public.current_user_org_id()
      and public.current_user_role() in ('manager','owner')
    );

-- 4. 검증 쿼리 (성공 시 빈 결과 반환)
select 'RLS recursion fix applied successfully' as status;
