-- ============================================================================
-- Mess Mates — complete Supabase schema (Stage 1 + 2 + 3)
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run: everything is idempotent.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Member',
  email text,
  avatar_url text,
  is_pro boolean not null default false,
  xp_points integer not null default 0,
  avatar_frame text not null default 'ring',
  frame_unlocked_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.messes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  currency_symbol text not null default '৳',
  guild_banner_url text,
  guild_banner text not null default 'midnight',
  guild_emblem text not null default '🏠',
  guild_points integer not null default 0,
  is_pro_mess boolean not null default false,
  meal_lock_hour integer not null default 22,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.mess_members (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'manager', 'member')),
  status text not null default 'active' check (status in ('active', 'left')),
  joined_at timestamptz not null default now(),
  unique (mess_id, user_id)
);

create table if not exists public.monthly_cycles (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  month_label text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  unique (mess_id, month_label)
);

create table if not exists public.daily_meals (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.monthly_cycles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  breakfast numeric(6,2) not null default 0,
  lunch numeric(6,2) not null default 0,
  dinner numeric(6,2) not null default 0,
  guest_meals numeric(6,2) not null default 0,
  unique (cycle_id, user_id, date)
);

create table if not exists public.bazar_expenses (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.monthly_cycles (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  items_summary text not null default '',
  expense_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);

create table if not exists public.fixed_utilities (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.monthly_cycles (id) on delete cascade,
  title text not null,
  total_amount numeric(12,2) not null default 0,
  split_type text not null default 'equal' check (split_type in ('equal', 'custom')),
  created_at timestamptz not null default now()
);

create table if not exists public.member_deposits (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.monthly_cycles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12,2) not null default 0,
  paid_date date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.bazar_schedule (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  assigned_user_id uuid not null references public.profiles (id) on delete cascade,
  scheduled_date date not null,
  market_route_notes text not null default '',
  shopping_list_json jsonb not null default '[]'::jsonb,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'missed')),
  created_at timestamptz not null default now()
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  question text not null,
  options_json jsonb not null default '[]'::jsonb,
  closes_at timestamptz not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_index integer not null,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create table if not exists public.mess_messages (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) <= 800),
  is_announcement boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  game_type text not null check (game_type in ('chess', 'dice', 'challenge')),
  code text not null,
  title text not null default '',
  state_json jsonb not null default '{}'::jsonb,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  winner_user_id uuid references public.profiles (id) on delete set null,
  points_awarded boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_daily_meals_cycle on public.daily_meals (cycle_id);
create index if not exists idx_bazar_cycle on public.bazar_expenses (cycle_id);
create index if not exists idx_deposits_cycle on public.member_deposits (cycle_id);
create index if not exists idx_messages_mess_created on public.mess_messages (mess_id, created_at desc);
create index if not exists idx_members_user on public.mess_members (user_id);
create index if not exists idx_polls_mess on public.polls (mess_id);
create index if not exists idx_games_mess on public.game_rooms (mess_id);

-- ----------------------------------------------------------------------------
-- 2. Membership helpers (SECURITY DEFINER avoids recursive RLS)
-- ----------------------------------------------------------------------------
create or replace function public.is_mess_member(p_mess uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from mess_members
    where mess_id = p_mess and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.can_manage_mess(p_mess uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from mess_members
    where mess_id = p_mess and user_id = auth.uid() and status = 'active'
      and role in ('admin', 'manager')
  );
$$;

create or replace function public.mess_of_cycle(p_cycle uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select mess_id from monthly_cycles where id = p_cycle;
$$;

create or replace function public.can_manage_cycle(p_cycle uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.can_manage_mess(public.mess_of_cycle(p_cycle));
$$;

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.messes enable row level security;
alter table public.mess_members enable row level security;
alter table public.monthly_cycles enable row level security;
alter table public.daily_meals enable row level security;
alter table public.bazar_expenses enable row level security;
alter table public.fixed_utilities enable row level security;
alter table public.member_deposits enable row level security;
alter table public.bazar_schedule enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
alter table public.mess_messages enable row level security;
alter table public.game_rooms enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.mess_members me
      join public.mess_members mate on mate.mess_id = me.mess_id
      where me.user_id = auth.uid() and mate.user_id = profiles.id
    )
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- messes
drop policy if exists messes_select on public.messes;
create policy messes_select on public.messes for select
  using (public.is_mess_member(id));

drop policy if exists messes_insert on public.messes;
create policy messes_insert on public.messes for insert
  with check (created_by = auth.uid());

drop policy if exists messes_update on public.messes;
create policy messes_update on public.messes for update
  using (public.can_manage_mess(id)) with check (public.can_manage_mess(id));

-- mess_members
drop policy if exists members_select on public.mess_members;
create policy members_select on public.mess_members for select
  using (public.is_mess_member(mess_id));

drop policy if exists members_insert on public.mess_members;
create policy members_insert on public.mess_members for insert
  with check (public.can_manage_mess(mess_id) or user_id = auth.uid());

drop policy if exists members_update on public.mess_members;
create policy members_update on public.mess_members for update
  using (public.can_manage_mess(mess_id)) with check (public.can_manage_mess(mess_id));

drop policy if exists members_delete on public.mess_members;
create policy members_delete on public.mess_members for delete
  using (public.can_manage_mess(mess_id));

-- monthly_cycles
drop policy if exists cycles_select on public.monthly_cycles;
create policy cycles_select on public.monthly_cycles for select
  using (public.is_mess_member(mess_id));

drop policy if exists cycles_write on public.monthly_cycles;
create policy cycles_write on public.monthly_cycles for all
  using (public.can_manage_mess(mess_id)) with check (public.can_manage_mess(mess_id));

-- daily_meals
drop policy if exists meals_select on public.daily_meals;
create policy meals_select on public.daily_meals for select
  using (public.is_mess_member(public.mess_of_cycle(cycle_id)));

drop policy if exists meals_insert on public.daily_meals;
create policy meals_insert on public.daily_meals for insert
  with check (
    public.is_mess_member(public.mess_of_cycle(cycle_id))
    and (user_id = auth.uid() or public.can_manage_cycle(cycle_id))
  );

drop policy if exists meals_update on public.daily_meals;
create policy meals_update on public.daily_meals for update
  using (
    public.can_manage_cycle(cycle_id)
    or (user_id = auth.uid() and public.is_mess_member(public.mess_of_cycle(cycle_id)))
  )
  with check (public.is_mess_member(public.mess_of_cycle(cycle_id)));

drop policy if exists meals_delete on public.daily_meals;
create policy meals_delete on public.daily_meals for delete
  using (public.can_manage_cycle(cycle_id));

-- bazar_expenses
drop policy if exists bazar_select on public.bazar_expenses;
create policy bazar_select on public.bazar_expenses for select
  using (public.is_mess_member(public.mess_of_cycle(cycle_id)));

drop policy if exists bazar_insert on public.bazar_expenses;
create policy bazar_insert on public.bazar_expenses for insert
  with check (
    buyer_id = auth.uid()
    and public.is_mess_member(public.mess_of_cycle(cycle_id))
  );

drop policy if exists bazar_update on public.bazar_expenses;
create policy bazar_update on public.bazar_expenses for update
  using (
    public.can_manage_cycle(cycle_id)
    or (buyer_id = auth.uid() and status = 'pending')
  )
  with check (public.is_mess_member(public.mess_of_cycle(cycle_id)));

drop policy if exists bazar_delete on public.bazar_expenses;
create policy bazar_delete on public.bazar_expenses for delete
  using (public.can_manage_cycle(cycle_id) or buyer_id = auth.uid());

-- fixed_utilities
drop policy if exists utilities_select on public.fixed_utilities;
create policy utilities_select on public.fixed_utilities for select
  using (public.is_mess_member(public.mess_of_cycle(cycle_id)));

drop policy if exists utilities_insert on public.fixed_utilities;
create policy utilities_insert on public.fixed_utilities for insert
  with check (public.can_manage_cycle(cycle_id));

drop policy if exists utilities_update on public.fixed_utilities;
create policy utilities_update on public.fixed_utilities for update
  using (public.can_manage_cycle(cycle_id)) with check (public.can_manage_cycle(cycle_id));

drop policy if exists utilities_delete on public.fixed_utilities;
create policy utilities_delete on public.fixed_utilities for delete
  using (public.can_manage_cycle(cycle_id));

-- member_deposits
drop policy if exists deposits_select on public.member_deposits;
create policy deposits_select on public.member_deposits for select
  using (public.is_mess_member(public.mess_of_cycle(cycle_id)));

drop policy if exists deposits_insert on public.member_deposits;
create policy deposits_insert on public.member_deposits for insert
  with check (
    public.is_mess_member(public.mess_of_cycle(cycle_id))
    and (user_id = auth.uid() or public.can_manage_cycle(cycle_id))
  );

drop policy if exists deposits_update on public.member_deposits;
create policy deposits_update on public.member_deposits for update
  using (public.can_manage_cycle(cycle_id) or user_id = auth.uid())
  with check (public.is_mess_member(public.mess_of_cycle(cycle_id)));

drop policy if exists deposits_delete on public.member_deposits;
create policy deposits_delete on public.member_deposits for delete
  using (public.can_manage_cycle(cycle_id) or user_id = auth.uid());

-- bazar_schedule
drop policy if exists duty_select on public.bazar_schedule;
create policy duty_select on public.bazar_schedule for select
  using (public.is_mess_member(mess_id));

drop policy if exists duty_insert on public.bazar_schedule;
create policy duty_insert on public.bazar_schedule for insert
  with check (public.can_manage_mess(mess_id));

drop policy if exists duty_update on public.bazar_schedule;
create policy duty_update on public.bazar_schedule for update
  using (public.can_manage_mess(mess_id) or assigned_user_id = auth.uid())
  with check (public.is_mess_member(mess_id));

drop policy if exists duty_delete on public.bazar_schedule;
create policy duty_delete on public.bazar_schedule for delete
  using (public.can_manage_mess(mess_id));

-- polls
drop policy if exists polls_select on public.polls;
create policy polls_select on public.polls for select
  using (public.is_mess_member(mess_id));

drop policy if exists polls_insert on public.polls;
create policy polls_insert on public.polls for insert
  with check (public.is_mess_member(mess_id) and created_by = auth.uid());

drop policy if exists polls_delete on public.polls;
create policy polls_delete on public.polls for delete
  using (public.can_manage_mess(mess_id) or created_by = auth.uid());

-- poll_votes
drop policy if exists votes_select on public.poll_votes;
create policy votes_select on public.poll_votes for select
  using (
    exists (
      select 1 from public.polls
      where polls.id = poll_votes.poll_id and public.is_mess_member(polls.mess_id)
    )
  );

drop policy if exists votes_write on public.poll_votes;
create policy votes_write on public.poll_votes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- mess_messages
drop policy if exists messages_select on public.mess_messages;
create policy messages_select on public.mess_messages for select
  using (public.is_mess_member(mess_id));

drop policy if exists messages_insert on public.mess_messages;
create policy messages_insert on public.mess_messages for insert
  with check (public.is_mess_member(mess_id) and user_id = auth.uid());

drop policy if exists messages_delete on public.mess_messages;
create policy messages_delete on public.mess_messages for delete
  using (public.can_manage_mess(mess_id));

-- game_rooms
drop policy if exists games_select on public.game_rooms;
create policy games_select on public.game_rooms for select
  using (public.is_mess_member(mess_id));

drop policy if exists games_insert on public.game_rooms;
create policy games_insert on public.game_rooms for insert
  with check (public.is_mess_member(mess_id) and created_by = auth.uid());

drop policy if exists games_update on public.game_rooms;
create policy games_update on public.game_rooms for update
  using (public.is_mess_member(mess_id)) with check (public.is_mess_member(mess_id));

drop policy if exists games_delete on public.game_rooms;
create policy games_delete on public.game_rooms for delete
  using (public.can_manage_mess(mess_id));

-- ----------------------------------------------------------------------------
-- 4. Message storage guard: keep only the latest 100 messages per mess
-- ----------------------------------------------------------------------------
create or replace function public.trim_mess_messages()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.mess_messages
  where mess_id = new.mess_id
    and id not in (
      select id from public.mess_messages
      where mess_id = new.mess_id
      order by created_at desc
      limit 100
    );
  return new;
end;
$$;

drop trigger if exists trg_trim_mess_messages on public.mess_messages;
create trigger trg_trim_mess_messages
  after insert on public.mess_messages
  for each row execute function public.trim_mess_messages();

-- ----------------------------------------------------------------------------
-- 5. Onboarding RPCs
-- ----------------------------------------------------------------------------
create or replace function public.create_mess(p_name text, p_currency text default '৳')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_mess uuid;
  v_code text;
  v_month text := to_char(current_date, 'YYYY-MM');
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from messes where invite_code = v_code);
  end loop;

  insert into messes (name, invite_code, currency_symbol, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'My Mess'), v_code, coalesce(nullif(p_currency, ''), '৳'), auth.uid())
  returning id into v_mess;

  insert into mess_members (mess_id, user_id, role, status)
  values (v_mess, auth.uid(), 'admin', 'active');

  insert into monthly_cycles (mess_id, month_label, status)
  values (v_mess, v_month, 'open')
  on conflict (mess_id, month_label) do nothing;

  return v_mess;
end;
$$;

create or replace function public.join_mess(p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_mess uuid;
  v_month text := to_char(current_date, 'YYYY-MM');
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select id into v_mess from messes where invite_code = upper(trim(p_code));
  if v_mess is null then
    raise exception 'Invalid invite code';
  end if;

  insert into mess_members (mess_id, user_id, role, status)
  values (v_mess, auth.uid(), 'member', 'active')
  on conflict (mess_id, user_id) do update set status = 'active';

  insert into monthly_cycles (mess_id, month_label, status)
  values (v_mess, v_month, 'open')
  on conflict (mess_id, month_label) do nothing;

  return v_mess;
end;
$$;

-- Awards guild points to the winner's mess and XP to the player, exactly once.
create or replace function public.award_game_win(p_room uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_room game_rooms%rowtype;
begin
  select * into v_room from game_rooms where id = p_room;
  if v_room.id is null then
    raise exception 'Game room not found';
  end if;
  if not public.is_mess_member(v_room.mess_id) then
    raise exception 'Not a member of this mess';
  end if;
  if v_room.points_awarded then
    return;
  end if;

  update game_rooms set points_awarded = true, updated_at = now() where id = p_room;
  update messes set guild_points = guild_points + 25 where id = v_room.mess_id;
  update profiles set xp_points = xp_points + 10 where id = auth.uid();
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Leaderboard view (no invite codes exposed)
-- ----------------------------------------------------------------------------
create or replace view public.guild_leaderboard
with (security_invoker = false) as
  select id, name, guild_points, guild_emblem, guild_banner
  from public.messes;

grant select on public.guild_leaderboard to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Settlement view — exact Stage 1 financial engine
--    rate = approved bazar / total meals; payable = meals*rate + utilities/members
-- ----------------------------------------------------------------------------
create or replace view public.cycle_member_summary
with (security_invoker = true) as
with cycle_bazar as (
  select cycle_id, sum(amount) as total
  from public.bazar_expenses
  where status = 'approved'
  group by cycle_id
),
cycle_meals as (
  select cycle_id, sum(breakfast + lunch + dinner + guest_meals) as total
  from public.daily_meals
  group by cycle_id
),
member_meal as (
  select cycle_id, user_id, sum(breakfast + lunch + dinner + guest_meals) as total
  from public.daily_meals
  group by cycle_id, user_id
),
cycle_utility as (
  select cycle_id, sum(total_amount) as total
  from public.fixed_utilities
  group by cycle_id
),
member_deposit as (
  select cycle_id, user_id, sum(amount) as total
  from public.member_deposits
  group by cycle_id, user_id
),
active_member as (
  select c.id as cycle_id, mm.user_id
  from public.monthly_cycles c
  join public.mess_members mm on mm.mess_id = c.mess_id and mm.status = 'active'
),
member_count as (
  select cycle_id, count(*)::numeric as total
  from active_member
  group by cycle_id
)
select
  c.id as cycle_id,
  c.mess_id,
  c.month_label,
  am.user_id,
  p.full_name,
  coalesce(ml.total, 0) as total_meals,
  coalesce(cb.total, 0) as total_bazar,
  coalesce(cm.total, 0) as total_mess_meals,
  case when coalesce(cm.total, 0) > 0 then round(coalesce(cb.total, 0) / cm.total, 2) else 0 end as meal_rate,
  coalesce(cu.total, 0) as total_utilities,
  case when coalesce(mc.total, 0) > 0 then round(coalesce(cu.total, 0) / mc.total, 2) else 0 end as utility_share,
  round(coalesce(ml.total, 0) * case when coalesce(cm.total, 0) > 0 then coalesce(cb.total, 0) / cm.total else 0 end, 2) as meal_cost,
  round(
    coalesce(ml.total, 0) * case when coalesce(cm.total, 0) > 0 then coalesce(cb.total, 0) / cm.total else 0 end
    + case when coalesce(mc.total, 0) > 0 then coalesce(cu.total, 0) / mc.total else 0 end,
    2
  ) as payable,
  coalesce(md.total, 0) as total_deposits,
  round(coalesce(md.total, 0) - (
    coalesce(ml.total, 0) * case when coalesce(cm.total, 0) > 0 then coalesce(cb.total, 0) / cm.total else 0 end
    + case when coalesce(mc.total, 0) > 0 then coalesce(cu.total, 0) / mc.total else 0 end
  ), 2) as net_balance
from public.monthly_cycles c
join active_member am on am.cycle_id = c.id
join public.profiles p on p.id = am.user_id
left join cycle_bazar cb on cb.cycle_id = c.id
left join cycle_meals cm on cm.cycle_id = c.id
left join cycle_utility cu on cu.cycle_id = c.id
left join member_count mc on mc.cycle_id = c.id
left join member_meal ml on ml.cycle_id = c.id and ml.user_id = am.user_id
left join member_deposit md on md.cycle_id = c.id and md.user_id = am.user_id;

-- ----------------------------------------------------------------------------
-- 8. Profile bootstrap on signup
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
