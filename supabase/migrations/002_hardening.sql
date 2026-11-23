-- ============================================================================
-- Mess Mates — 002 hardening
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query),
-- after 001_mess_mates.sql. Safe to re-run: everything is idempotent.
--
-- 1. Server-side cycle lock: a closed cycle rejects every write, and members
--    cannot edit meals for past days or after the mess's meal lock hour.
--    The rule now lives in Postgres, so no client can skip it.
-- 2. Deposit payment metadata: method (cash / bKash / Nagad / bank), the
--    transaction reference and an uploaded receipt image.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Deposit payment metadata
-- ----------------------------------------------------------------------------
alter table public.member_deposits add column if not exists method text not null default 'cash';
alter table public.member_deposits add column if not exists reference text not null default '';
alter table public.member_deposits add column if not exists proof_path text;

alter table public.member_deposits drop constraint if exists member_deposits_method_check;
alter table public.member_deposits
  add constraint member_deposits_method_check
  check (method in ('cash', 'bkash', 'nagad', 'bank', 'other'));

-- ----------------------------------------------------------------------------
-- 2. Lock helpers
-- ----------------------------------------------------------------------------
create or replace function public.cycle_status_of(p_cycle uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select status from monthly_cycles where id = p_cycle;
$$;

create or replace function public.role_in_mess(p_mess uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select role from mess_members
   where mess_id = p_mess and user_id = auth.uid() and status = 'active'
   limit 1;
$$;

-- Meals: closed cycle → always rejected. Past day or after the lock hour →
-- rejected for members, allowed for admins and managers.
-- auth.uid() is null for the service role and for SQL editor / admin sessions,
-- which must stay able to fix data.
create or replace function public.enforce_meal_lock()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_cycle  uuid := coalesce(new.cycle_id, old.cycle_id);
  v_date   date := coalesce(new.date, old.date);
  v_mess   uuid;
  v_status text;
  v_lock   integer;
  v_role   text;
  v_now    timestamp := (now() at time zone 'Asia/Dhaka');
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  select mc.mess_id, mc.status, m.meal_lock_hour
    into v_mess, v_status, v_lock
    from monthly_cycles mc
    join messes m on m.id = mc.mess_id
   where mc.id = v_cycle;

  if v_status = 'closed' then
    raise exception 'This monthly cycle is closed, so its meals can no longer change.' using errcode = 'P0001';
  end if;

  v_role := public.role_in_mess(v_mess);

  if v_role in ('admin', 'manager') then
    return coalesce(new, old);
  end if;

  if v_date < v_now::date then
    raise exception 'Meals for past days are locked. Ask an admin or manager to change them.' using errcode = 'P0001';
  end if;

  if v_date = v_now::date and extract(hour from v_now) >= v_lock then
    raise exception 'Today''s meals locked at %:00. Ask an admin or manager to change them.', v_lock using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;
$$;

-- Money rows (bazar, utilities, deposits) may not be touched once the cycle
-- is closed, so a settled month can never be edited behind everyone's back.
create or replace function public.enforce_open_cycle()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_cycle  uuid := coalesce(new.cycle_id, old.cycle_id);
  v_status text;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  v_status := public.cycle_status_of(v_cycle);

  if v_status = 'closed' then
    raise exception 'This monthly cycle is closed, so its figures can no longer change.' using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_meal_lock on public.daily_meals;
create trigger trg_meal_lock
  before insert or update or delete on public.daily_meals
  for each row execute function public.enforce_meal_lock();

drop trigger if exists trg_bazar_open on public.bazar_expenses;
create trigger trg_bazar_open
  before insert or update or delete on public.bazar_expenses
  for each row execute function public.enforce_open_cycle();

drop trigger if exists trg_utilities_open on public.fixed_utilities;
create trigger trg_utilities_open
  before insert or update or delete on public.fixed_utilities
  for each row execute function public.enforce_open_cycle();

drop trigger if exists trg_deposits_open on public.member_deposits;
create trigger trg_deposits_open
  before insert or update or delete on public.member_deposits
  for each row execute function public.enforce_open_cycle();

-- ----------------------------------------------------------------------------
-- 3. Receipt images for deposits
-- Path layout: <mess_id>/<random>.<ext>
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deposit-proofs',
  'deposit-proofs',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists deposit_proofs_insert on storage.objects;
create policy deposit_proofs_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'deposit-proofs'
    and owner = auth.uid()
    and exists (
      select 1 from public.mess_members mm
       where mm.user_id = auth.uid() and mm.status = 'active'
         and mm.mess_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists deposit_proofs_select on storage.objects;
create policy deposit_proofs_select on storage.objects for select to authenticated
  using (
    bucket_id = 'deposit-proofs'
    and exists (
      select 1 from public.mess_members mm
       where mm.user_id = auth.uid() and mm.status = 'active'
         and mm.mess_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists deposit_proofs_delete on storage.objects;
create policy deposit_proofs_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'deposit-proofs'
    and (
      owner = auth.uid()
      or exists (
        select 1 from public.mess_members mm
         where mm.user_id = auth.uid() and mm.status = 'active'
           and mm.role in ('admin', 'manager')
           and mm.mess_id::text = (storage.foldername(name))[1]
      )
    )
  );
