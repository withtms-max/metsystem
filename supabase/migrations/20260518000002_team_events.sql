-- ============================================
-- MET System — Team Events (팀 공식 일정)
-- 2026-05-18
-- ============================================
-- 개인 일정(activity_logs)과 별개로, 조직 단위 공식 일정을 저장.
-- 모든 조직 멤버가 읽을 수 있으나 작성은 매니저/오너만.
-- ============================================

create table if not exists public.team_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete set null,
  title varchar(100) not null,
  event_date date not null,
  event_time time,                    -- NULL 이면 종일 (is_all_day=true 와 동일 의미)
  is_all_day boolean default false,
  event_type varchar(20) not null
    check (event_type in ('training','workshop','meeting','external','meal','announcement','other')),
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_team_events_org_date
  on public.team_events(organization_id, event_date);

-- updated_at 자동
drop trigger if exists trg_team_events_updated_at on public.team_events;
create trigger trg_team_events_updated_at
  before update on public.team_events
  for each row execute function public.update_updated_at_column();

-- ============================================
-- RLS
-- ============================================

alter table public.team_events enable row level security;

-- 같은 조직 멤버는 모두 읽기 가능
drop policy if exists "team_events_member_read" on public.team_events;
create policy "team_events_member_read"
  on public.team_events for select
  using (organization_id = public.get_my_organization_id());

-- 매니저/오너만 INSERT
drop policy if exists "team_events_manager_insert" on public.team_events;
create policy "team_events_manager_insert"
  on public.team_events for insert
  with check (
    organization_id = public.get_my_organization_id()
    and public.get_my_role() in ('manager', 'owner')
  );

-- UPDATE/DELETE: 만든 사람 또는 매니저/오너
drop policy if exists "team_events_modify" on public.team_events;
create policy "team_events_modify"
  on public.team_events for update
  using (
    organization_id = public.get_my_organization_id()
    and (created_by = auth.uid() or public.get_my_role() in ('manager','owner'))
  );

drop policy if exists "team_events_delete" on public.team_events;
create policy "team_events_delete"
  on public.team_events for delete
  using (
    organization_id = public.get_my_organization_id()
    and (created_by = auth.uid() or public.get_my_role() in ('manager','owner'))
  );

select
  'team_events installed' as status,
  (select count(*) from pg_policies where tablename = 'team_events') as policy_count,
  (select count(*) from pg_indexes where tablename = 'team_events') as index_count;
