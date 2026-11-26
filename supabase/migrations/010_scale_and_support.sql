-- 010_scale_and_support.sql
-- The operational layer the audit asked for:
--
--   * Indexes for the cycle-scoped reads the workspace makes on every load.
--   * A server-side cycle total, so the dashboard's headline numbers do not
--     depend on the browser adding up every row.
--   * A platform-admin console: grant or expire Pro, inspect recent crashes.
--   * Push delivery log, so one reminder is sent once per person per day.
--
-- Run after 009_trust_and_adoption.sql.
--
-- To open the support console, run this once with the account that should
-- administer the platform (replace the email):
--
--   insert into public.platform_admins (user_id, note)
--   select id, 'owner' from public.profiles where email = 'you@example.com'
--   on conflict (user_id) do nothing;
--
-- The console is at #/support and is refused by the database for anyone who
-- is not listed above.

-- ----------------------------------------------------------------------------
-- 1. Indexes for the hot, cycle-scoped queries
-- ----------------------------------------------------------------------------
create index if not exists idx_daily_meals_cycle_user
  on public.daily_meals (cycle_id, user_id);
create index if not exists idx_bazar_cycle_status
  on public.bazar_expenses (cycle_id, status);
create index if not exists idx_utilities_cycle
  on public.fixed_utilities (cycle_id);
create index if not exists idx_deposits_cycle_user
  on public.member_deposits (cycle_id, user_id);
create index if not exists idx_settlements_cycle_user
  on public.dues_settlements (cycle_id, user_id, status);
create index if not exists idx_messages_mess_created
  on public.mess_messages (mess_id, created_at);
create index if not exists idx_cycles_mess_month
  on public.monthly_cycles (mess_id, month_label desc);
create index if not exists idx_join_requests_user_status
  on public.join_requests (user_id, status);
create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id, mess_id);

-- ----------------------------------------------------------------------------
-- 2. Server-side cycle totals
--    The same filters as src/lib/calc.ts: approved, non-voided bazar; active
--    utilities; non-voided deposits; every meal field. No per-member money is
--    computed here, so the settlement rules stay in one place.
-- ----------------------------------------------------------------------------
create or replace function public.cycle_totals(p_cycle uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mess uuid;
begin
  select mess_id into v_mess from public.monthly_cycles where id = p_cycle;
  if v_mess is null then
    raise exception 'That month does not exist.';
  end if;

  if not exists (
    select 1 from public.mess_members
     where mess_id = v_mess and user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'You are not a member of this mess.';
  end if;

  return jsonb_build_object(
    'cycle_id', p_cycle,
    'total_meals', round(coalesce((
      select sum(breakfast + lunch + dinner + guest_meals)
        from public.daily_meals where cycle_id = p_cycle
    ), 0)::numeric, 2),
    'meal_rate', case
      when coalesce((
        select sum(breakfast + lunch + dinner + guest_meals)
          from public.daily_meals where cycle_id = p_cycle
      ), 0)::numeric > 0 then round(coalesce((
        select sum(amount) from public.bazar_expenses
         where cycle_id = p_cycle and status = 'approved' and voided_at is null
      ), 0)::numeric / (
        select sum(breakfast + lunch + dinner + guest_meals)
          from public.daily_meals where cycle_id = p_cycle
      )::numeric, 2)
      else 0
    end,
    'total_bazar', round(coalesce((
      select sum(amount) from public.bazar_expenses
       where cycle_id = p_cycle and status = 'approved' and voided_at is null
    ), 0)::numeric, 2),
    'pending_bazar', round(coalesce((
      select sum(amount) from public.bazar_expenses
       where cycle_id = p_cycle and status = 'pending' and voided_at is null
    ), 0)::numeric, 2),
    'total_utilities', round(coalesce((
      select sum(total_amount) from public.fixed_utilities
       where cycle_id = p_cycle and voided_at is null
    ), 0)::numeric, 2),
    'total_deposits', round(coalesce((
      select sum(amount) from public.member_deposits
       where cycle_id = p_cycle and voided_at is null
    ), 0)::numeric, 2),
    'active_members', (
      select count(*) from public.mess_members
       where mess_id = v_mess and status = 'active'
    )
  );
end;
$$;

revoke all on function public.cycle_totals(uuid) from public;
grant execute on function public.cycle_totals(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Platform admins and the support console
--    Deliberately separate from mess roles: a mess admin must never be able to
--    grant themselves Pro, and support must not read a mess's books.
-- ----------------------------------------------------------------------------
create table if not exists public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
-- No policies: the table is readable only through is_platform_admin().

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.support_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_messes jsonb;
  v_errors jsonb;
begin
  if not public.is_platform_admin() then
    return jsonb_build_object('allowed', false);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'name', m.name,
    'invite_code', m.invite_code,
    'is_pro_mess', m.is_pro_mess,
    'pro_until', m.pro_until,
    'pro_plan', m.pro_plan,
    'pro_reference', m.pro_reference,
    'member_count', (
      select count(*) from public.mess_members mm
       where mm.mess_id = m.id and mm.status = 'active'
    ),
    'cycle_label', c.month_label,
    'cycle_status', c.status,
    'created_at', m.created_at
  ) order by m.created_at desc), '[]'::jsonb)
  into v_messes
  from public.messes m
  left join lateral (
    select month_label, status
      from public.monthly_cycles
     where mess_id = m.id
     order by month_label desc
     limit 1
  ) c on true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'message', e.message,
    'route', e.route,
    'created_at', e.created_at,
    'mess_name', m.name
  ) order by e.created_at desc), '[]'::jsonb)
  into v_errors
  from (
    select * from public.client_errors order by created_at desc limit 25
  ) e
  left join public.messes m on m.id = e.mess_id;

  return jsonb_build_object('allowed', true, 'messes', v_messes, 'errors', v_errors);
end;
$$;

revoke all on function public.support_overview() from public;
grant execute on function public.support_overview() to authenticated;

create or replace function public.admin_set_pro(
  p_mess uuid,
  p_until timestamptz,
  p_plan text default '',
  p_reference text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only a platform admin can change Pro.';
  end if;

  update public.messes
     set pro_until = p_until,
         is_pro_mess = (p_until is not null and p_until > now()),
         pro_plan = coalesce(btrim(p_plan), ''),
         pro_reference = coalesce(btrim(p_reference), '')
   where id = p_mess;

  if not found then
    raise exception 'That mess does not exist.';
  end if;
end;
$$;

revoke all on function public.admin_set_pro(uuid, timestamptz, text, text) from public;
grant execute on function public.admin_set_pro(uuid, timestamptz, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Push deliveries
--    One row per person, per reminder, per Dhaka day. The send function inserts
--    with on-conflict-do-nothing before sending, so a cron retry cannot spam.
-- ----------------------------------------------------------------------------
create table if not exists public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  sent_on date not null default ((now() at time zone 'Asia/Dhaka')::date),
  created_at timestamptz not null default now(),
  unique (user_id, kind, sent_on)
);

alter table public.push_deliveries enable row level security;
-- No policies: the Edge Function uses the service role.

create index if not exists idx_push_deliveries_day
  on public.push_deliveries (sent_on, kind);
