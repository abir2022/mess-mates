-- 009_trust_and_adoption.sql
-- Closing the gaps the audit found around the edges of the books:
--
--   * Joining a mess is a request an admin approves, not an instant entry with
--     a leaked six-character code.
--   * Bazar can carry an itemised list and a photo of the market receipt.
--   * A fixed utility is voided with a reason instead of being deleted, so the
--     split never changes without a trace.
--   * Pro has an expiry and a reference, so manual WhatsApp billing can be
--     granted, expired and audited without reading the boolean.
--   * Web Push subscriptions have a private home, ready for the send function.
--   * "Today" defaults are Dhaka dates, matching the app's calculations.
--
-- Run this in the Supabase SQL editor after 008_ledger.sql.

-- ----------------------------------------------------------------------------
-- 1. Join requests
-- ----------------------------------------------------------------------------
create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- One open request per person per mess; a rejected one can be sent again.
create unique index if not exists join_requests_one_pending
  on public.join_requests (mess_id, user_id) where status = 'pending';
create index if not exists idx_join_requests_mess
  on public.join_requests (mess_id, created_at desc);

create or replace function public.is_mess_admin(p_mess uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from mess_members
    where mess_id = p_mess and user_id = auth.uid() and status = 'active'
      and role = 'admin'
  );
$$;

alter table public.join_requests enable row level security;

drop policy if exists join_requests_select on public.join_requests;
create policy join_requests_select on public.join_requests for select
  using (user_id = auth.uid() or public.is_mess_admin(mess_id));

-- No insert/update/delete policy: only the two functions below may write.

create or replace function public.request_join_mess(p_code text, p_note text default '')
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_mess    uuid;
  v_status  text;
  v_recent  int;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;

  select id into v_mess
    from public.messes
   where upper(invite_code) = upper(btrim(coalesce(p_code, '')))
   limit 1;

  if v_mess is null then
    raise exception 'Invalid invite code. Ask your mess admin for the 6-character code.';
  end if;

  select status into v_status
    from public.mess_members
   where mess_id = v_mess and user_id = auth.uid();

  if v_status = 'active' then
    return jsonb_build_object('status', 'joined');
  end if;

  if exists (
    select 1 from public.mess_bans
     where mess_id = v_mess and user_id = auth.uid()
  ) then
    raise exception 'You were removed from this mess by a member vote, so you cannot rejoin.';
  end if;

  -- One mess per account: the workspace loads a single active membership, so
  -- silently joining a second one would hide the first set of books.
  if exists (
    select 1 from public.mess_members
     where user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'This account is already in a mess. Leave it first, then request to join another.';
  end if;

  -- Five requests an hour is plenty for a person with several invite codes.
  select count(*) into v_recent
    from public.join_requests
   where user_id = auth.uid() and created_at > now() - interval '1 hour';

  if v_recent >= 5 then
    raise exception 'Too many join attempts. Please wait an hour and try again.';
  end if;

  insert into public.join_requests (mess_id, user_id, note)
  values (v_mess, auth.uid(), left(btrim(coalesce(p_note, '')), 200))
  on conflict (mess_id, user_id) where status = 'pending'
  do update set note = excluded.note, created_at = now();

  return jsonb_build_object('status', 'pending');
end;
$$;

create or replace function public.decide_join_request(p_request uuid, p_approve boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.join_requests;
begin
  select * into v_row from public.join_requests where id = p_request for update;

  if v_row.id is null then
    raise exception 'That join request no longer exists.';
  end if;

  if not public.is_mess_admin(v_row.mess_id) then
    raise exception 'Only the mess admin can approve a join request.';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'That request has already been decided.';
  end if;

  if p_approve then
    if exists (
      select 1 from public.mess_members
       where user_id = v_row.user_id and status = 'active' and mess_id <> v_row.mess_id
    ) then
      raise exception 'That person is already in another mess, so they cannot join this one yet.';
    end if;

    insert into public.mess_members (mess_id, user_id, role, status, joined_at)
    values (v_row.mess_id, v_row.user_id, 'member', 'active', now())
    on conflict (mess_id, user_id)
    do update set status = 'active', joined_at = now();
  end if;

  update public.join_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(),
         decided_at = now()
   where id = p_request;
end;
$$;

grant execute on function public.request_join_mess(text, text) to authenticated;
grant execute on function public.decide_join_request(uuid, boolean) to authenticated;

-- Realtime: the admin's pending list should update without a refresh.
do $$
begin
  alter publication supabase_realtime add table public.join_requests;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Bazar receipts and itemised lists
-- ----------------------------------------------------------------------------
alter table public.bazar_expenses
  add column if not exists items_json jsonb not null default '[]'::jsonb,
  add column if not exists proof_path text;

-- ----------------------------------------------------------------------------
-- 3. Utilities are voided, never deleted
-- ----------------------------------------------------------------------------
alter table public.fixed_utilities
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles (id) on delete set null,
  add column if not exists void_reason text not null default '';

drop policy if exists utilities_delete on public.fixed_utilities;

create or replace function public.void_utility(p_utility uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_mess uuid;
  v_row  public.fixed_utilities;
begin
  select c.mess_id into v_mess
    from public.fixed_utilities u
    join public.monthly_cycles c on c.id = u.cycle_id
   where u.id = p_utility;

  select * into v_row from public.fixed_utilities where id = p_utility;

  if v_row.id is null then
    raise exception 'That utility does not exist.';
  end if;

  if not public.can_manage_mess(v_mess) then
    raise exception 'Only the mess admin or manager can void a utility.';
  end if;

  if v_row.voided_at is not null then
    raise exception 'That utility is already voided.';
  end if;

  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'Give a reason so the record explains itself.';
  end if;

  update public.fixed_utilities
     set voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason)
   where id = p_utility;
end;
$$;

grant execute on function public.void_utility(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Pro has a date, a plan and a reference
-- ----------------------------------------------------------------------------
alter table public.messes
  add column if not exists pro_until timestamptz,
  add column if not exists pro_plan text not null default '',
  add column if not exists pro_reference text not null default '';

-- ----------------------------------------------------------------------------
-- 5. Web Push subscriptions
--    Private to the owner. The send function reads them with the service role.
-- ----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mess_id uuid references public.messes (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Dhaka dates for money rows
--    The app computes today in Asia/Dhaka; a server default in UTC could put a
--    payment made at 00:30 Dhaka on the previous day.
-- ----------------------------------------------------------------------------
alter table public.member_deposits
  alter column paid_date set default ((now() at time zone 'Asia/Dhaka')::date);
alter table public.bazar_expenses
  alter column expense_date set default ((now() at time zone 'Asia/Dhaka')::date);
alter table public.deposit_requests
  alter column paid_date set default ((now() at time zone 'Asia/Dhaka')::date);
alter table public.dues_settlements
  alter column paid_date set default ((now() at time zone 'Asia/Dhaka')::date);
