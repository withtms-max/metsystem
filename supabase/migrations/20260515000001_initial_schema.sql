-- ============================================
-- MET System - Initial Schema Migration
-- 2026-05-15
-- ============================================
-- 실행 방법:
--   1) Supabase Dashboard → SQL Editor
--   2) 이 파일 전체 복사 → Run
--   또는: supabase db push (Supabase CLI 사용 시)
-- ============================================

-- ============================================
-- 1. Organizations & Users
-- ============================================

create extension if not exists "uuid-ossp";

create table public.organizations (
    id uuid primary key default gen_random_uuid(),
    name varchar(100) not null,
    industry varchar(50),
    subscription_plan varchar(20) default 'trial',
    subscription_expires_at timestamptz,
    daily_ta_goal int default 10,
    daily_meeting_goal int default 3,
    invite_code varchar(10) unique,
    created_at timestamptz default now()
);

create table public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete set null,
    role varchar(20) not null check (role in ('salesperson', 'manager', 'owner')),
    name varchar(50) not null,
    phone varchar(20),
    email varchar(100),
    profile_image_url text,
    current_streak int default 0,
    best_streak int default 0,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- ============================================
-- 2. Customers (핵심 — RLS로 본인 데이터만 접근)
-- ============================================

create table public.customers (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references public.users(id) on delete cascade,
    name varchar(50) not null,
    phone varchar(20),
    email varchar(100),
    company varchar(100),
    job_title varchar(50),
    address text,
    grade char(1) default 'D' check (grade in ('A','B','C','D')),
    region_tag varchar(30),
    latitude decimal(10,7),
    longitude decimal(10,7),
    source varchar(20),
    profile_image_url text,
    memo text,
    contract_date date,
    birthday date,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_customers_owner_grade on public.customers(owner_id, grade);
create index idx_customers_owner_region on public.customers(owner_id, region_tag);
create index idx_customers_owner_name on public.customers(owner_id, name);

-- ============================================
-- 3. Activity Logs
-- ============================================

create table public.activity_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    customer_id uuid references public.customers(id) on delete set null,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    activity_type varchar(20) not null
        check (activity_type in ('ta_call','meeting','memo','message','contract')),
    status varchar(20) check (status in ('completed','scheduled','cancelled')),
    duration_seconds int,
    mood varchar(10) check (mood in ('good','neutral','bad')),
    note text,
    source varchar(20),
    activity_date date default current_date,
    created_at timestamptz default now()
);

create index idx_activity_user_date on public.activity_logs(user_id, activity_date);
create index idx_activity_org_date on public.activity_logs(organization_id, activity_date);

-- ============================================
-- 4. Pipeline Cards (생명수 칸반보드)
-- ============================================

create table public.pipeline_cards (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    customer_id uuid not null references public.customers(id) on delete cascade,
    month_key varchar(7) not null,
    stage varchar(20) default 'ta_target'
        check (stage in ('ta_target','ta_done','meeting_scheduled',
                         'meeting_done','contract','on_hold')),
    sort_order int default 0,
    note text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(user_id, customer_id, month_key)
);

create index idx_pipeline_user_month on public.pipeline_cards(user_id, month_key);

-- ============================================
-- 5. Golden Time Rules
-- ============================================

create table public.golden_time_rules (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    customer_id uuid references public.customers(id) on delete cascade,
    rule_type varchar(30) not null
        check (rule_type in ('contract_anniversary','birthday',
                             'holiday_greeting','custom','follow_up')),
    trigger_date date,
    recurrence varchar(20),
    days_before int default 0,
    message_template text,
    is_active boolean default true,
    created_at timestamptz default now()
);

create index idx_golden_time_trigger on public.golden_time_rules(trigger_date, is_active);

-- ============================================
-- 6. Manager Stats View (통계만! 고객정보 없음!)
-- ============================================

create or replace view public.manager_activity_stats as
select
    al.organization_id,
    al.user_id,
    u.name as salesperson_name,
    al.activity_date,
    al.activity_type,
    count(*)::int as count,
    sum(case when al.status = 'completed' then 1 else 0 end)::int as completed_count
from public.activity_logs al
join public.users u on al.user_id = u.id
group by al.organization_id, al.user_id, u.name, al.activity_date, al.activity_type;

-- ============================================
-- 7. Row Level Security (RLS) Policies
-- ============================================

-- users 본인만 자기 row 수정 가능
alter table public.users enable row level security;

create policy "users_self_read"
    on public.users for select
    using (auth.uid() = id or organization_id in (
        select organization_id from public.users where id = auth.uid()
    ));

create policy "users_self_update"
    on public.users for update
    using (auth.uid() = id);

create policy "users_self_insert"
    on public.users for insert
    with check (auth.uid() = id);

-- customers: 본인 고객만 접근 ✅ 핵심 프라이버시 정책
alter table public.customers enable row level security;

create policy "customers_owner_only"
    on public.customers for all
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());

-- activity_logs: 본인 활동만 접근 (관리자도 직접 접근 불가, view만 사용)
alter table public.activity_logs enable row level security;

create policy "activity_owner_only"
    on public.activity_logs for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- pipeline_cards: 본인 칸반만 접근
alter table public.pipeline_cards enable row level security;

create policy "pipeline_owner_only"
    on public.pipeline_cards for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- golden_time_rules: 본인 룰만 접근
alter table public.golden_time_rules enable row level security;

create policy "golden_time_owner_only"
    on public.golden_time_rules for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- organizations: 같은 조직 멤버만 조회
alter table public.organizations enable row level security;

create policy "organizations_member_read"
    on public.organizations for select
    using (id in (
        select organization_id from public.users where id = auth.uid()
    ));

create policy "organizations_manager_update"
    on public.organizations for update
    using (id in (
        select organization_id from public.users
        where id = auth.uid() and role in ('manager','owner')
    ));

-- ============================================
-- 8. Triggers — updated_at 자동 갱신
-- ============================================

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_customers_updated_at
    before update on public.customers
    for each row execute function public.update_updated_at_column();

create trigger update_pipeline_cards_updated_at
    before update on public.pipeline_cards
    for each row execute function public.update_updated_at_column();

-- ============================================
-- 9. Invite Code 자동 생성 함수
-- ============================================

create or replace function public.generate_invite_code()
returns text as $$
declare
    code text;
    chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    i int;
begin
    loop
        code := '';
        for i in 1..6 loop
            code := code || substr(chars, (random()*length(chars))::int + 1, 1);
        end loop;
        exit when not exists (select 1 from public.organizations where invite_code = code);
    end loop;
    return code;
end;
$$ language plpgsql;
