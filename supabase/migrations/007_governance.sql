-- ============================================================================
-- Mess Mates — 007 governance, payment requests, error log
-- Run once in the Supabase SQL editor after 001–006. Idempotent.
--
-- The rules implemented here are the ones the mess asked for:
--
--   1. Leaving is a request. A member asks an admin; the admin approves or
--      rejects. If nobody decides, the member may leave anyway and the mess
--      keeps every record (the member is marked 'auto_left', nothing deleted).
--   2. Removing a member needs a vote. An admin opens a removal poll; at least
--      80% of active members must vote. Majority for removal → the member is
--      removed and banned from rejoining. Majority against → the admin may
--      still remove them, but they can rejoin with the invite code.
--   3. The mess manager is elected the same way. The winning candidate gets the
--      'manager' role and a manager_terms row, so the mess can see who is
--      collecting money and from when.
--   4. Money reaches the manager as a request. A member submits a payment; the
--      manager approves it and only then does it count as a deposit.
--   5. Deleting an account while in a mess needs that mess's admin to approve
--      the leave first. The profile is then anonymised, never hard-deleted,
--      because meals, bazar and deposits still point at it.
--   6. Client errors land in a plain table the mess admin can read. No vendor.
--
-- Nothing here deletes history. "Removed" and "left" are both status = 'left'.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Polls gain a kind, a target, candidates and a quorum
-- ----------------------------------------------------------------------------
alter table public.polls add column if not exists kind text not null default 'general';
alter table public.polls drop constraint if exists polls_kind_check;
alter table public.polls
  add constraint polls_kind_check check (kind in ('general', 'member_removal', 'manager_selection'));

alter table public.polls add column if not exists target_user_id uuid references public.profiles (id) on delete set null;
alter table public.polls add column if not exists candidate_ids jsonb not null default '[]'::jsonb;
alter table public.polls add column if not exists quorum numeric(3, 2) not null default 0.80;
alter table public.polls add column if not exists result_applied boolean not null default false;

-- ----------------------------------------------------------------------------
-- 2. Tables
-- ----------------------------------------------------------------------------
create table if not exists public.member_requests (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_id uuid not null references public.mess_members (id) on delete cascade,
  kind text not null check (kind in ('leave', 'delete')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'withdrawn', 'auto_left')),
  note text not null default '',
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
-- One open request per member, so a double tap cannot spam the admin.
create unique index if not exists member_requests_one_pending
  on public.member_requests (mess_id, user_id) where status = 'pending';
create index if not exists idx_member_requests_mess on public.member_requests (mess_id, status);

create table if not exists public.mess_bans (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null default '',
  banned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (mess_id, user_id)
);

create table if not exists public.manager_terms (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid not null references public.messes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  starts_on date not null default current_date,
  ends_on date,
  note text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_manager_terms_mess on public.manager_terms (mess_id, starts_on desc);

create table if not exists public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.monthly_cycles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  paid_date date not null default current_date,
  note text not null default '',
  method text not null default 'bkash'
    check (method in ('cash', 'bkash', 'nagad', 'bank', 'other')),
  reference text not null default '',
  proof_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by uuid references public.profiles (id) on delete set null,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_deposit_requests_cycle on public.deposit_requests (cycle_id, status);

create table if not exists public.client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  mess_id uuid references public.messes (id) on delete set null,
  message text not null,
  stack text not null default '',
  route text not null default '',
  user_agent text not null default '',
  app_version text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_client_errors_mess on public.client_errors (mess_id, created_at desc);

-- An approved leave request is how a member deletes their account, so the
-- profile has to carry the marker instead of disappearing.
alter table public.profiles add column if not exists deleted_at timestamptz;

-- ----------------------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------------------
alter table public.member_requests enable row level security;
alter table public.mess_bans enable row level security;
alter table public.manager_terms enable row level security;
alter table public.deposit_requests enable row level security;
alter table public.client_errors enable row level security;

-- Reads only. Every write goes through a SECURITY DEFINER function below, so
-- the rules cannot be skipped with a hand-made API call.
drop policy if exists member_requests_select on public.member_requests;
create policy member_requests_select on public.member_requests for select
  using (public.is_mess_member(mess_id));

drop policy if exists bans_select on public.mess_bans;
create policy bans_select on public.mess_bans for select
  using (public.is_mess_member(mess_id));

drop policy if exists manager_terms_select on public.manager_terms;
create policy manager_terms_select on public.manager_terms for select
  using (public.is_mess_member(mess_id));

drop policy if exists deposit_requests_select on public.deposit_requests;
create policy deposit_requests_select on public.deposit_requests for select
  using (public.is_mess_member(public.mess_of_cycle(cycle_id)));

-- Error rows: anyone may insert (signed out too — a crash before sign-in still
-- matters), a member may read their own, an admin may read the mess's.
drop policy if exists client_errors_insert on public.client_errors;
create policy client_errors_insert on public.client_errors for insert
  to anon, authenticated with check (true);

drop policy if exists client_errors_select on public.client_errors;
create policy client_errors_select on public.client_errors for select
  to authenticated
  using (
    user_id = auth.uid()
    or (mess_id is not null and public.role_in_mess(mess_id) = 'admin')
  );

-- ----------------------------------------------------------------------------
-- 4. Close the direct-write holes the old policies left open
-- ----------------------------------------------------------------------------
-- 001 let an admin UPDATE mess_members straight from the client, which would
-- skip every rule in this file. Roles, removal and leaving all have RPCs.
drop policy if exists members_update on public.mess_members;
drop policy if exists members_delete on public.mess_members;
drop policy if exists members_insert on public.mess_members;

-- A member may open ordinary polls directly; governance polls come from the
-- RPC so they always carry a quorum and a real target.
drop policy if exists polls_insert on public.polls;
create policy polls_insert on public.polls for insert
  with check (
    public.is_mess_member(mess_id)
    and created_by = auth.uid()
    and kind = 'general'
  );

-- A governance poll is evidence: it cannot be deleted before its result is
-- applied, or an admin could quietly drop a vote that went the wrong way.
drop policy if exists polls_delete on public.polls;
create policy polls_delete on public.polls for delete
  using (
    kind = 'general'
    and (public.can_manage_mess(mess_id) or created_by = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 5. Quorum helper (80% of active members, rounded up)
-- ----------------------------------------------------------------------------
create or replace function public.poll_progress(p_poll uuid)
returns table (
  active_members integer,
  votes integer,
  required integer,
  quorum_met boolean,
  leading_index integer,
  leading_votes integer
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_mess     uuid;
  v_members  integer;
  v_votes    integer;
  v_required integer;
  v_lead     integer;
  v_lead_n   integer;
begin
  select mess_id into v_mess from polls where id = p_poll;

  select count(*) into v_members
    from mess_members where mess_id = v_mess and status = 'active';

  select count(*) into v_votes from poll_votes where poll_id = p_poll;

  v_required := ceil(coalesce(v_members, 0) * 0.8)::integer;

  select option_index, count(*) into v_lead, v_lead_n
    from poll_votes
   where poll_id = p_poll
   group by option_index
   order by count(*) desc, option_index asc
   limit 1;

  return query
    select
      coalesce(v_members, 0),
      coalesce(v_votes, 0),
      v_required,
      (coalesce(v_votes, 0) >= v_required and coalesce(v_votes, 0) > 0),
      v_lead,
      coalesce(v_lead_n, 0);
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Leaving: request → admin decision, or leave without waiting
-- ----------------------------------------------------------------------------
create or replace function public.create_member_request(p_kind text, p_note text default '')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_member  mess_members%rowtype;
  v_request uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_kind not in ('leave', 'delete') then
    raise exception 'Unknown request type';
  end if;

  select * into v_member
    from mess_members
   where user_id = auth.uid() and status = 'active'
   order by joined_at
   limit 1;

  if v_member.id is null then
    raise exception 'You are not in a mess.';
  end if;

  if exists (
    select 1 from member_requests
     where mess_id = v_member.mess_id and user_id = auth.uid() and status = 'pending'
  ) then
    raise exception 'You already have a request waiting for the admin.';
  end if;

  insert into member_requests (mess_id, user_id, member_id, kind, note)
  values (v_member.mess_id, auth.uid(), v_member.id, p_kind, coalesce(p_note, ''))
  returning id into v_request;

  return v_request;
end;
$$;

create or replace function public.withdraw_member_request(p_request uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  update member_requests
     set status = 'withdrawn', decided_at = now()
   where id = p_request and user_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'That request is no longer pending.';
  end if;
end;
$$;

create or replace function public.decide_member_request(
  p_request uuid,
  p_approve boolean,
  p_note text default ''
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_request member_requests%rowtype;
  v_admins  integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into v_request from member_requests where id = p_request;
  if v_request.id is null then
    raise exception 'Request not found';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'That request was already handled.';
  end if;
  if public.role_in_mess(v_request.mess_id) is distinct from 'admin' then
    raise exception 'Only a mess admin can decide this request.';
  end if;

  if p_approve then
    if exists (
      select 1 from mess_members
       where id = v_request.member_id and role = 'admin' and status = 'active'
    ) and (
      select count(*) from mess_members
       where mess_id = v_request.mess_id and role = 'admin' and status = 'active'
    ) <= 1 then
      raise exception 'Keep at least one admin in the mess.';
    end if;

    update mess_members set status = 'left' where id = v_request.member_id;
  end if;

  update member_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(),
         decided_at = now(),
         note = case when coalesce(p_note, '') = '' then note else p_note end
   where id = p_request;
end;
$$;

-- The member's escape hatch: "if admin do not approve/reject, the member can
-- still leave". The mess keeps every record, and the admin can export it.
create or replace function public.leave_mess_override()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_request member_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into v_request
    from member_requests
   where user_id = auth.uid() and status = 'pending'
   order by created_at desc
   limit 1;

  if v_request.id is null then
    raise exception 'Send a leave request first.';
  end if;

  if v_request.kind = 'delete' then
    raise exception 'An account deletion request needs the admin to approve it.';
  end if;

  if exists (
    select 1 from mess_members
     where id = v_request.member_id and role = 'admin' and status = 'active'
  ) and (
    select count(*) from mess_members
     where mess_id = v_request.mess_id and role = 'admin' and status = 'active'
  ) <= 1 then
    raise exception 'Make another member an admin before you leave.';
  end if;

  update mess_members set status = 'left' where id = v_request.member_id;
  update member_requests
     set status = 'auto_left', decided_at = now()
   where id = v_request.id;
end;
$$;

-- Old clients used to call leave_mess() directly; the request flow replaces it.
create or replace function public.leave_mess()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  raise exception 'Leaving now needs a leave request: Mess Hub → Council. An admin can approve it, or you can leave without waiting.';
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. Removal and manager election polls
-- ----------------------------------------------------------------------------
create or replace function public.create_governance_poll(
  p_kind text,
  p_target uuid default null,
  p_candidate_ids jsonb default '[]'::jsonb,
  p_closes_at timestamptz default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_member   mess_members%rowtype;
  v_options  jsonb;
  v_candidates jsonb;
  v_poll     uuid;
  v_close    timestamptz := coalesce(p_closes_at, now() + interval '2 days');
  v_candidate uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into v_member
    from mess_members
   where user_id = auth.uid() and status = 'active'
   limit 1;

  if v_member.id is null then
    raise exception 'You are not in a mess.';
  end if;
  if v_member.role <> 'admin' then
    raise exception 'Only an admin can open this poll.';
  end if;
  if p_kind not in ('member_removal', 'manager_selection') then
    raise exception 'Unknown poll type';
  end if;
  if v_close <= now() then
    raise exception 'Pick a closing time in the future.';
  end if;

  if p_kind = 'member_removal' then
    if p_target is null then
      raise exception 'Pick the member this poll is about.';
    end if;
    if p_target = auth.uid() then
      raise exception 'You cannot open a removal poll about yourself.';
    end if;
    if not exists (
      select 1 from mess_members
       where mess_id = v_member.mess_id and user_id = p_target and status = 'active'
    ) then
      raise exception 'That member is no longer active.';
    end if;
    if exists (
      select 1 from polls
       where mess_id = v_member.mess_id
         and kind = 'member_removal'
         and target_user_id = p_target
         and result_applied = false
         and closes_at > now()
    ) then
      raise exception 'A removal poll for that member is already open.';
    end if;

    v_options := jsonb_build_array('Remove from mess', 'Keep in mess');
    v_candidates := '[]'::jsonb;
  else
    v_candidates := coalesce(nullif(p_candidate_ids, '[]'::jsonb), '[]'::jsonb);

    if jsonb_array_length(v_candidates) = 0 then
      select coalesce(jsonb_agg(user_id), '[]'::jsonb) into v_candidates
        from mess_members
       where mess_id = v_member.mess_id and status = 'active';
    end if;

    if jsonb_array_length(v_candidates) < 2 then
      raise exception 'A manager election needs at least two candidates.';
    end if;

    v_options := '[]'::jsonb;
    for v_candidate in select c::uuid from jsonb_array_elements_text(v_candidates) as c loop
      if not exists (
        select 1 from mess_members
         where mess_id = v_member.mess_id and user_id = v_candidate and status = 'active'
      ) then
        raise exception 'Every candidate must be an active member.';
      end if;
      v_options := v_options || jsonb_build_array(
        (select full_name from profiles where id = v_candidate)
      );
    end loop;
  end if;

  insert into polls (mess_id, question, options_json, closes_at, created_by, kind, target_user_id, candidate_ids)
  values (
    v_member.mess_id,
    case
      when p_kind = 'member_removal'
        then 'Remove ' || (select full_name from profiles where id = p_target) || ' from the mess?'
      else 'Who should be the mess manager?'
    end,
    v_options,
    v_close,
    auth.uid(),
    p_kind,
    p_target,
    v_candidates
  )
  returning id into v_poll;

  return v_poll;
end;
$$;

create or replace function public.apply_poll_result(p_poll uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_poll      polls%rowtype;
  v_progress  record;
  v_winner    uuid;
  v_outcome   text;
  v_admins    integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into v_poll from polls where id = p_poll;
  if v_poll.id is null then
    raise exception 'Poll not found';
  end if;
  if public.role_in_mess(v_poll.mess_id) is distinct from 'admin' then
    raise exception 'Only an admin can apply a poll result.';
  end if;
  if v_poll.kind = 'general' then
    raise exception 'This is an ordinary poll; there is no result to apply.';
  end if;
  if v_poll.result_applied then
    raise exception 'This poll result was already applied.';
  end if;
  if v_poll.closes_at > now() then
    raise exception 'Wait for the poll to close before applying its result.';
  end if;

  select * into v_progress from public.poll_progress(p_poll);
  if not v_progress.quorum_met then
    raise exception 'Only % of % active members voted. At least % votes are needed.',
      v_progress.votes, v_progress.active_members, v_progress.required;
  end if;

  if v_poll.kind = 'member_removal' then
    if v_poll.target_user_id is null then
      raise exception 'This poll has no target.';
    end if;
    if not exists (
      select 1 from mess_members
       where mess_id = v_poll.mess_id and user_id = v_poll.target_user_id and status = 'active'
    ) then
      raise exception 'That member already left the mess.';
    end if;

    select count(*) into v_admins
      from mess_members
     where mess_id = v_poll.mess_id and role = 'admin' and status = 'active';

    if exists (
      select 1 from mess_members
       where mess_id = v_poll.mess_id and user_id = v_poll.target_user_id and role = 'admin'
    ) and v_admins <= 1 then
      raise exception 'Keep at least one admin in the mess.';
    end if;

    update mess_members
       set status = 'left'
     where mess_id = v_poll.mess_id and user_id = v_poll.target_user_id;

    if v_progress.leading_index = 0 then
      insert into mess_bans (mess_id, user_id, reason, banned_by)
      values (v_poll.mess_id, v_poll.target_user_id, 'Removed by a member vote', auth.uid())
      on conflict (mess_id, user_id) do nothing;
      v_outcome := 'removed_and_banned';
    else
      -- The vote said keep, but the admin still removed them: they may rejoin.
      delete from mess_bans
       where mess_id = v_poll.mess_id and user_id = v_poll.target_user_id;
      v_outcome := 'removed_can_rejoin';
    end if;
  else
    if v_progress.leading_index is null then
      raise exception 'No votes were counted.';
    end if;

    v_winner := (v_poll.candidate_ids ->> v_progress.leading_index)::uuid;
    if v_winner is null then
      raise exception 'The winning candidate is missing from this poll.';
    end if;

    update manager_terms
       set ends_on = current_date - 1
     where mess_id = v_poll.mess_id and ends_on is null;

    update mess_members
       set role = 'member'
     where mess_id = v_poll.mess_id and role = 'manager' and status = 'active';

    update mess_members
       set role = 'manager'
     where mess_id = v_poll.mess_id and user_id = v_winner and status = 'active';

    insert into manager_terms (mess_id, user_id, starts_on, note, created_by)
    values (
      v_poll.mess_id,
      v_winner,
      current_date,
      'Elected by member vote',
      auth.uid()
    );

    v_outcome := 'manager_elected';
  end if;

  update polls set result_applied = true where id = p_poll;

  return v_outcome;
end;
$$;

-- Admin removal is poll-only now. This stays as a clear refusal for old code
-- paths instead of silently allowing a one-tap removal.
create or replace function public.remove_mess_member(p_member uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  raise exception 'Removing a member needs a removal poll. Open one from Mess Hub → Council.';
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. Joining: a banned member cannot rejoin
-- ----------------------------------------------------------------------------
create or replace function public.join_mess(p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_mess  uuid;
  v_month text := to_char(current_date, 'YYYY-MM');
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select id into v_mess from messes where invite_code = upper(trim(p_code));
  if v_mess is null then
    raise exception 'Invalid invite code';
  end if;

  if exists (
    select 1 from mess_bans where mess_id = v_mess and user_id = auth.uid()
  ) then
    raise exception 'The members voted to remove you from this mess, so you cannot rejoin it.';
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

-- ----------------------------------------------------------------------------
-- 9. Payment requests: member submits, manager approves
-- ----------------------------------------------------------------------------
create or replace function public.request_deposit(
  p_cycle uuid,
  p_amount numeric,
  p_date date default current_date,
  p_note text default '',
  p_method text default 'bkash',
  p_reference text default '',
  p_proof text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_mess    uuid;
  v_request uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Enter the amount you paid.';
  end if;
  if p_method not in ('cash', 'bkash', 'nagad', 'bank', 'other') then
    raise exception 'Unknown payment method';
  end if;

  select mess_id into v_mess from monthly_cycles where id = p_cycle;
  if v_mess is null then
    raise exception 'Month not found';
  end if;
  if public.role_in_mess(v_mess) is null then
    raise exception 'You are not in this mess.';
  end if;
  if public.cycle_status_of(p_cycle) = 'closed' then
    raise exception 'This monthly cycle is closed.';
  end if;

  insert into deposit_requests (
    cycle_id, user_id, amount, paid_date, note, method, reference, proof_path, requested_by
  )
  values (
    p_cycle, auth.uid(), p_amount, coalesce(p_date, current_date), coalesce(p_note, ''),
    p_method, coalesce(p_reference, ''), p_proof, auth.uid()
  )
  returning id into v_request;

  return v_request;
end;
$$;

create or replace function public.decide_deposit_request(p_request uuid, p_approve boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_request deposit_requests%rowtype;
  v_mess    uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into v_request from deposit_requests where id = p_request;
  if v_request.id is null then
    raise exception 'Request not found';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'That payment was already handled.';
  end if;

  select mess_id into v_mess from monthly_cycles where id = v_request.cycle_id;
  if public.role_in_mess(v_mess) not in ('admin', 'manager') then
    raise exception 'Only the mess manager can approve payments.';
  end if;

  if p_approve then
    insert into member_deposits (cycle_id, user_id, amount, paid_date, note, method, reference, proof_path)
    values (
      v_request.cycle_id,
      v_request.user_id,
      v_request.amount,
      v_request.paid_date,
      v_request.note,
      v_request.method,
      v_request.reference,
      v_request.proof_path
    );
  end if;

  update deposit_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(),
         decided_at = now()
   where id = p_request;
end;
$$;

-- The only place a member can act on their own request.
create or replace function public.cancel_deposit_request(p_request uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from deposit_requests
   where id = p_request and user_id = auth.uid() and status = 'pending';
end;
$$;

-- ----------------------------------------------------------------------------
-- 10. Account deletion: no active mess, then anonymise
-- ----------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_pending integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  if exists (
    select 1 from mess_members where user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'Leave your mess first — ask the admin to approve your leave request.';
  end if;

  select count(*) into v_pending
    from member_requests
   where user_id = auth.uid() and status = 'pending';

  if v_pending > 0 then
    raise exception 'Your leave request is still waiting for the admin.';
  end if;

  -- Hard-deleting auth.users needs the service role, and every settled month
  -- still points at this profile. Anonymising keeps the books correct while the
  -- person and their sign-in details are gone from the app.
  update profiles
     set full_name = 'Former member',
         email = '',
         avatar_url = null,
         avatar_frame = 'ring',
         frame_unlocked_until = null,
         deleted_at = now()
   where id = auth.uid();
end;
$$;

-- ----------------------------------------------------------------------------
-- 11. Realtime for the new tables
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  targets text[] := array['member_requests', 'mess_bans', 'manager_terms', 'deposit_requests'];
begin
  foreach t in array targets loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 12. Grants
-- ----------------------------------------------------------------------------
revoke all on function public.poll_progress(uuid) from public;
revoke all on function public.create_member_request(text, text) from public;
revoke all on function public.withdraw_member_request(uuid) from public;
revoke all on function public.decide_member_request(uuid, boolean, text) from public;
revoke all on function public.leave_mess_override() from public;
revoke all on function public.create_governance_poll(text, uuid, jsonb, timestamptz) from public;
revoke all on function public.apply_poll_result(uuid) from public;
revoke all on function public.request_deposit(uuid, numeric, date, text, text, text, text) from public;
revoke all on function public.decide_deposit_request(uuid, boolean) from public;
revoke all on function public.cancel_deposit_request(uuid) from public;
revoke all on function public.delete_my_account() from public;

grant execute on function public.poll_progress(uuid) to authenticated;
grant execute on function public.create_member_request(text, text) to authenticated;
grant execute on function public.withdraw_member_request(uuid) to authenticated;
grant execute on function public.decide_member_request(uuid, boolean, text) to authenticated;
grant execute on function public.leave_mess_override() to authenticated;
grant execute on function public.create_governance_poll(text, uuid, jsonb, timestamptz) to authenticated;
grant execute on function public.apply_poll_result(uuid) to authenticated;
grant execute on function public.request_deposit(uuid, numeric, date, text, text, text, text) to authenticated;
grant execute on function public.decide_deposit_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_deposit_request(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
