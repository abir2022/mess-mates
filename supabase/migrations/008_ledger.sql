-- 008_ledger.sql
-- One login, one identity per mess, and books that outlive membership.
--
-- The policy this implements:
--   * A person keeps ONE account, but every mess sees its own name and photo
--     for them (`mess_members.display_name` / `avatar_url`).
--   * Leaving a mess does not delete anything. The member can still read their
--     own meals, bazar and deposits for every mess they were ever in, and the
--     mess keeps exactly the same rows.
--   * A closed month can never be edited, but a late payment still has a home:
--     `dues_settlements` records money that moves after the month closed, so
--     the frozen figures stay frozen and the outstanding balance still falls.
--   * Money rows are never deleted. A mistake is voided with a reason, and the
--     original row, the amount and the name of whoever voided it stay visible.
--
-- Run this in the Supabase SQL editor after 007_governance.sql.

-- ----------------------------------------------------------------------------
-- 1. One identity per mess
-- ----------------------------------------------------------------------------
alter table public.mess_members add column if not exists display_name text not null default '';
alter table public.mess_members add column if not exists avatar_url text;

create or replace function public.set_member_identity(p_display_name text, p_mess uuid default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_mess uuid := p_mess;
begin
  if v_mess is null then
    select mess_id into v_mess
      from mess_members
     where user_id = auth.uid() and status = 'active'
     limit 1;
  end if;

  if v_mess is null then
    raise exception 'Join a mess before setting a name for it.';
  end if;

  if not exists (select 1 from mess_members where mess_id = v_mess and user_id = auth.uid()) then
    raise exception 'You are not a member of that mess.';
  end if;

  -- Only the person themselves can name themselves here; the mess admin still
  -- owns the roster but not somebody else's display identity.
  update mess_members
     set display_name = left(btrim(coalesce(p_display_name, '')), 40)
   where mess_id = v_mess and user_id = auth.uid();
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Voiding instead of deleting money rows
-- ----------------------------------------------------------------------------
alter table public.member_deposits
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles (id) on delete set null,
  add column if not exists void_reason text not null default '';

alter table public.bazar_expenses
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles (id) on delete set null,
  add column if not exists void_reason text not null default '';

-- No delete policy left on either table: a vanished row is an unexplained
-- taka. with no policy, RLS refuses the delete for everyone, including admins.
drop policy if exists deposits_delete on public.member_deposits;
drop policy if exists bazar_delete on public.bazar_expenses;

-- A settled month stays frozen, except for stamping a row void. This replaces
-- 002's function and adds exactly one allowed update shape: the void columns
-- change and every other column stays byte-for-byte the same.
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

  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'voided_at' - 'voided_by' - 'void_reason')
       = (to_jsonb(old) - 'voided_at' - 'voided_by' - 'void_reason')
     and coalesce(to_jsonb(new) ->> 'voided_at', '') <> ''
     and coalesce(to_jsonb(old) ->> 'voided_at', '') = '' then
    return new;
  end if;

  v_status := public.cycle_status_of(v_cycle);

  if v_status = 'closed' then
    raise exception 'This monthly cycle is closed, so its figures can no longer change.' using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.void_deposit(p_deposit uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_mess uuid;
  v_row  public.member_deposits;
begin
  select c.mess_id into v_mess
    from public.member_deposits d
    join public.monthly_cycles c on c.id = d.cycle_id
   where d.id = p_deposit;

  select * into v_row from public.member_deposits where id = p_deposit;

  if v_row.id is null then
    raise exception 'That payment does not exist.';
  end if;

  if not public.can_manage_mess(v_mess) then
    raise exception 'Only the mess admin or manager can void a payment.';
  end if;

  if v_row.voided_at is not null then
    raise exception 'That payment is already voided.';
  end if;

  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'Give a reason so the record explains itself.';
  end if;

  update public.member_deposits
     set voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason)
   where id = p_deposit;
end;
$$;

create or replace function public.void_bazar_expense(p_expense uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_mess uuid;
  v_row  public.bazar_expenses;
begin
  select c.mess_id into v_mess
    from public.bazar_expenses b
    join public.monthly_cycles c on c.id = b.cycle_id
   where b.id = p_expense;

  select * into v_row from public.bazar_expenses where id = p_expense;

  if v_row.id is null then
    raise exception 'That bazar entry does not exist.';
  end if;

  if not public.can_manage_mess(v_mess) then
    raise exception 'Only the mess admin or manager can void a bazar entry.';
  end if;

  if v_row.voided_at is not null then
    raise exception 'That entry is already voided.';
  end if;

  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'Give a reason so the record explains itself.';
  end if;

  update public.bazar_expenses
     set voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason)
   where id = p_expense;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. History that outlives membership
--    These policies widen the 001 set (permissive policies OR together): your
--    own rows and the names of the months you lived through stay readable
--    after your membership row turns 'left'.
-- ----------------------------------------------------------------------------
create or replace function public.is_mess_alumnus(p_mess uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.mess_members
     where mess_id = p_mess and user_id = auth.uid()
  );
$$;

drop policy if exists members_select_history on public.mess_members;
create policy members_select_history on public.mess_members for select
  using (user_id = auth.uid());

drop policy if exists messes_select_history on public.messes;
create policy messes_select_history on public.messes for select
  using (public.is_mess_alumnus(id));

drop policy if exists cycles_select_history on public.monthly_cycles;
create policy cycles_select_history on public.monthly_cycles for select
  using (public.is_mess_alumnus(mess_id));

drop policy if exists meals_select_own on public.daily_meals;
create policy meals_select_own on public.daily_meals for select
  using (user_id = auth.uid());

drop policy if exists bazar_select_own on public.bazar_expenses;
create policy bazar_select_own on public.bazar_expenses for select
  using (buyer_id = auth.uid());

drop policy if exists deposits_select_own on public.member_deposits;
create policy deposits_select_own on public.member_deposits for select
  using (user_id = auth.uid());

-- The profile (name, email, photo) is no longer readable by people who only
-- shared a mess in the past: past mates keep the accounting, not the contact
-- details. Active mates still see each other.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
        from public.mess_members me
        join public.mess_members mate on mate.mess_id = me.mess_id
       where me.user_id = auth.uid() and me.status = 'active'
         and mate.user_id = profiles.id
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Settlements: money that moves after the month closed
-- ----------------------------------------------------------------------------
create table if not exists public.dues_settlements (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  cycle_id uuid references public.monthly_cycles (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  direction text not null default 'member_to_mess'
    check (direction in ('member_to_mess', 'mess_to_member')),
  paid_date date not null default current_date,
  method text not null default 'cash',
  reference text not null default '',
  proof_path text,
  note text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by uuid references public.profiles (id) on delete set null,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  decision_note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_settlements_user on public.dues_settlements (user_id);
create index if not exists idx_settlements_mess on public.dues_settlements (mess_id, cycle_id);

alter table public.dues_settlements enable row level security;

drop policy if exists settlements_select on public.dues_settlements;
create policy settlements_select on public.dues_settlements for select
  using (user_id = auth.uid() or public.can_manage_mess(mess_id));

-- Writes go through the functions below so the two sides can never disagree
-- about who approved what. No insert/update/delete policy exists on purpose.

create or replace function public.request_settlement(
  p_cycle uuid,
  p_amount numeric,
  p_date date default current_date,
  p_method text default 'cash',
  p_reference text default '',
  p_proof text default null,
  p_note text default ''
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_cycle public.monthly_cycles;
  v_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than zero.';
  end if;

  select * into v_cycle from public.monthly_cycles where id = p_cycle;
  if v_cycle.id is null then
    raise exception 'That month does not exist.';
  end if;

  if not exists (
    select 1 from public.mess_members
     where mess_id = v_cycle.mess_id and user_id = auth.uid()
  ) then
    raise exception 'Only a member or a former member of this mess can settle against it.';
  end if;

  if exists (
    select 1 from public.dues_settlements
     where cycle_id = p_cycle and user_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'You already have a payment waiting for the manager.';
  end if;

  insert into public.dues_settlements
    (mess_id, cycle_id, user_id, amount, direction, paid_date, method, reference, proof_path, note, status, requested_by)
  values
    (v_cycle.mess_id, p_cycle, auth.uid(), round(p_amount, 2), 'member_to_mess',
     coalesce(p_date, current_date), coalesce(nullif(btrim(p_method), ''), 'cash'),
     coalesce(p_reference, ''), p_proof, coalesce(p_note, ''), 'pending', auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.record_settlement(
  p_cycle uuid,
  p_user uuid,
  p_amount numeric,
  p_direction text default 'member_to_mess',
  p_date date default current_date,
  p_method text default 'cash',
  p_reference text default '',
  p_proof text default null,
  p_note text default ''
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_cycle public.monthly_cycles;
  v_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than zero.';
  end if;
  if p_direction not in ('member_to_mess', 'mess_to_member') then
    raise exception 'Unknown settlement direction.';
  end if;

  select * into v_cycle from public.monthly_cycles where id = p_cycle;
  if v_cycle.id is null then
    raise exception 'That month does not exist.';
  end if;

  if not public.can_manage_mess(v_cycle.mess_id) then
    raise exception 'Only the mess admin or manager can record a settlement.';
  end if;

  if not exists (
    select 1 from public.mess_members
     where mess_id = v_cycle.mess_id and user_id = p_user
  ) then
    raise exception 'That person was never in this mess.';
  end if;

  -- A manager entering cash they already hold is the authority; there is
  -- nobody above them to ask, and the row keeps their name either way.
  insert into public.dues_settlements
    (mess_id, cycle_id, user_id, amount, direction, paid_date, method, reference, proof_path, note, status, requested_by, decided_by, decided_at, decision_note)
  values
    (v_cycle.mess_id, p_cycle, p_user, round(p_amount, 2), p_direction,
     coalesce(p_date, current_date), coalesce(nullif(btrim(p_method), ''), 'cash'),
     coalesce(p_reference, ''), p_proof, coalesce(p_note, ''), 'approved', auth.uid(), auth.uid(), now(), 'Recorded by the mess manager')
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.decide_settlement(
  p_settlement uuid,
  p_approve boolean,
  p_note text default ''
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.dues_settlements;
begin
  select * into v_row from public.dues_settlements where id = p_settlement;
  if v_row.id is null then
    raise exception 'That settlement does not exist.';
  end if;

  if not public.can_manage_mess(v_row.mess_id) then
    raise exception 'Only the mess admin or manager can decide a settlement.';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'That settlement is already % .', v_row.status;
  end if;

  if v_row.user_id = auth.uid() then
    raise exception 'A payment cannot be approved by the person it belongs to. Ask another manager or the admin.';
  end if;

  update public.dues_settlements
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(),
         decided_at = now(),
         decision_note = coalesce(p_note, '')
   where id = p_settlement;
end;
$$;

create or replace function public.cancel_settlement(p_settlement uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.dues_settlements;
begin
  select * into v_row from public.dues_settlements where id = p_settlement;
  if v_row.id is null then
    raise exception 'That settlement does not exist.';
  end if;

  if v_row.requested_by <> auth.uid() and not public.can_manage_mess(v_row.mess_id) then
    raise exception 'Only the person who sent it can cancel it.';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'That settlement is already % .', v_row.status;
  end if;

  update public.dues_settlements
     set status = 'cancelled', decided_by = auth.uid(), decided_at = now()
   where id = p_settlement;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. My ledger: the member's own line in every month of every mess they were in
--    SECURITY DEFINER with a hard auth.uid() filter, so it can total a mess's
--    figures without exposing a single row of anybody else's.
-- ----------------------------------------------------------------------------
create or replace function public.my_ledger()
returns table (
  mess_id uuid,
  mess_name text,
  currency_symbol text,
  cycle_id uuid,
  month_label text,
  cycle_status text,
  member_status text,
  meals numeric,
  meal_cost numeric,
  utility_share numeric,
  payable numeric,
  deposits numeric,
  bazar_paid numeric,
  settled_in numeric,
  settled_out numeric,
  outstanding numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select mm.mess_id, mm.status, m.name, m.currency_symbol
      from public.mess_members mm
      join public.messes m on m.id = mm.mess_id
     where mm.user_id = auth.uid()
  ),
  base as (
    select c.id as cycle_id,
           mine.name,
           mine.currency_symbol,
           mine.status,
           c.mess_id,
           c.month_label,
           c.status as cycle_status,
           coalesce((select sum(dm.breakfast + dm.lunch + dm.dinner + dm.guest_meals)
                       from public.daily_meals dm where dm.cycle_id = c.id), 0) as total_meals,
           coalesce((select sum(b.amount) from public.bazar_expenses b
                      where b.cycle_id = c.id and b.status = 'approved' and b.voided_at is null), 0) as total_bazar,
           coalesce((select sum(u.total_amount) from public.fixed_utilities u
                      where u.cycle_id = c.id), 0) as total_utilities,
           greatest((select count(*) from (
                       select user_id from public.daily_meals where cycle_id = c.id
                       union
                       select user_id from public.member_deposits where cycle_id = c.id
                     ) people), 1) as heads,
           coalesce((select sum(dm.breakfast + dm.lunch + dm.dinner + dm.guest_meals)
                       from public.daily_meals dm
                      where dm.cycle_id = c.id and dm.user_id = auth.uid()), 0) as my_meals,
           coalesce((select sum(d.amount) from public.member_deposits d
                      where d.cycle_id = c.id and d.user_id = auth.uid() and d.voided_at is null), 0) as my_deposits,
           coalesce((select sum(b.amount) from public.bazar_expenses b
                      where b.cycle_id = c.id and b.buyer_id = auth.uid()
                        and b.status = 'approved' and b.voided_at is null), 0) as my_bazar,
           coalesce((select sum(s.amount) from public.dues_settlements s
                      where s.cycle_id = c.id and s.user_id = auth.uid()
                        and s.status = 'approved' and s.direction = 'member_to_mess'), 0) as settled_in,
           coalesce((select sum(s.amount) from public.dues_settlements s
                      where s.cycle_id = c.id and s.user_id = auth.uid()
                        and s.status = 'approved' and s.direction = 'mess_to_member'), 0) as settled_out
      from public.monthly_cycles c
      join mine on mine.mess_id = c.mess_id
  ),
  figures as (
    select b.*,
           round(case when b.total_meals > 0 then b.my_meals * (b.total_bazar / b.total_meals) else 0 end, 2) as meal_cost,
           round(b.total_utilities / b.heads, 2) as utility_share
      from base b
  )
  select f.mess_id,
         f.name,
         f.currency_symbol,
         f.cycle_id,
         f.month_label,
         f.cycle_status,
         f.status,
         round(f.my_meals, 2),
         f.meal_cost,
         f.utility_share,
         round(f.meal_cost + f.utility_share, 2) as payable,
         round(f.my_deposits, 2),
         round(f.my_bazar, 2),
         round(f.settled_in, 2),
         round(f.settled_out, 2),
         round(f.meal_cost + f.utility_share - f.my_deposits - f.settled_in + f.settled_out, 2) as outstanding
    from figures f
   order by f.month_label desc, f.name;
$$;

-- ----------------------------------------------------------------------------
-- 6. Live updates for the new table
-- ----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.dues_settlements;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
