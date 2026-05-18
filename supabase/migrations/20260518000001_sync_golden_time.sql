-- ============================================
-- MET System — 골든타임 자동 시드 (생일 / 계약 기념일)
-- 2026-05-18
-- ============================================
-- 고객 등록/수정 시 birthday / contract_date 값이 있으면
-- golden_time_rules 에 자동으로 row 를 upsert.
-- 매년 반복은 기존 listMonthlyEvents 로직(MM-DD 매칭)이 처리하므로
-- recurrence 컬럼은 'yearly' 로 마킹.
-- ============================================

-- 1) 단일 고객의 룰 동기화 함수
create or replace function public.sync_customer_golden_times(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.customers%rowtype;
begin
  select * into c from public.customers where id = p_customer_id;
  if not found then return; end if;

  -- 생일
  if c.birthday is not null then
    delete from public.golden_time_rules
      where customer_id = c.id and rule_type = 'birthday';
    insert into public.golden_time_rules (user_id, customer_id, rule_type, trigger_date, recurrence, days_before, is_active)
      values (c.owner_id, c.id, 'birthday', c.birthday, 'yearly', 0, true);
  else
    delete from public.golden_time_rules
      where customer_id = c.id and rule_type = 'birthday';
  end if;

  -- 계약 기념일
  if c.contract_date is not null then
    delete from public.golden_time_rules
      where customer_id = c.id and rule_type = 'contract_anniversary';
    insert into public.golden_time_rules (user_id, customer_id, rule_type, trigger_date, recurrence, days_before, is_active)
      values (c.owner_id, c.id, 'contract_anniversary', c.contract_date, 'yearly', 0, true);
  else
    delete from public.golden_time_rules
      where customer_id = c.id and rule_type = 'contract_anniversary';
  end if;
end;
$$;

grant execute on function public.sync_customer_golden_times(uuid) to authenticated;

-- 2) AFTER INSERT/UPDATE 트리거
create or replace function public.trg_sync_golden_times()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_customer_golden_times(new.id);
  return new;
end;
$$;

drop trigger if exists customers_sync_golden_times on public.customers;
create trigger customers_sync_golden_times
  after insert or update of birthday, contract_date on public.customers
  for each row execute function public.trg_sync_golden_times();

-- 3) 일괄 시드 (기존 고객 대상 1회용)
create or replace function public.sync_all_golden_times(p_user_id uuid default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  cnt int := 0;
  rec record;
begin
  for rec in
    select id from public.customers
    where (p_user_id is null or owner_id = p_user_id)
      and (birthday is not null or contract_date is not null)
  loop
    perform public.sync_customer_golden_times(rec.id);
    cnt := cnt + 1;
  end loop;
  return cnt;
end;
$$;

grant execute on function public.sync_all_golden_times(uuid) to authenticated;

-- 4) 명절 D-2 자동 안부 룰 생성 함수
-- (사용자 본인 호출 — listMonthlyEvents 진입 시 클라이언트에서 RPC 호출)
create or replace function public.ensure_holiday_greetings(p_user_id uuid, p_dates date[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  cnt int := 0;
  d date;
begin
  if p_user_id is null then return 0; end if;
  foreach d in array p_dates loop
    -- 이미 있으면 skip
    if exists (
      select 1 from public.golden_time_rules
      where user_id = p_user_id
        and customer_id is null
        and rule_type = 'holiday_greeting'
        and trigger_date = d
    ) then
      continue;
    end if;
    insert into public.golden_time_rules
      (user_id, customer_id, rule_type, trigger_date, recurrence, days_before, is_active)
      values (p_user_id, null, 'holiday_greeting', d, 'once', 0, true);
    cnt := cnt + 1;
  end loop;
  return cnt;
end;
$$;

grant execute on function public.ensure_holiday_greetings(uuid, date[]) to authenticated;

-- 검증
select
  'golden time sync installed' as status,
  (select count(*) from pg_proc where proname = 'sync_customer_golden_times') as sync_fn,
  (select count(*) from pg_proc where proname = 'sync_all_golden_times') as bulk_fn,
  (select count(*) from pg_proc where proname = 'ensure_holiday_greetings') as holiday_fn,
  (select count(*) from pg_trigger where tgname = 'customers_sync_golden_times') as trigger_exists;
