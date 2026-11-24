-- ============================================================================
-- Mess Mates — 004 roles & member removal
-- Run once in the Supabase SQL editor after 001 and 002. Idempotent.
--
-- 001 lets admins and managers update any mess_members row, which is too wide:
-- a plain member cannot leave on their own, and a manager could promote
-- themselves. These SECURITY DEFINER functions enforce the real rules and the
-- client calls them instead of writing the table directly.
--
-- Removal is a soft leave (status = 'left'), so meals, bazar and deposits keep
-- their owner and past months still settle exactly as they did.
-- ============================================================================

create or replace function public.set_member_role(p_member uuid, p_role text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_member      mess_members%rowtype;
  v_caller_role text;
  v_admins      integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_role not in ('admin', 'manager', 'member') then
    raise exception 'Unknown role';
  end if;

  select * into v_member from mess_members where id = p_member;
  if v_member.id is null then
    raise exception 'Member not found';
  end if;

  v_caller_role := public.role_in_mess(v_member.mess_id);
  if v_caller_role is distinct from 'admin' then
    raise exception 'Only an admin can change roles';
  end if;

  select count(*) into v_admins
    from mess_members
   where mess_id = v_member.mess_id and status = 'active' and role = 'admin';

  if v_member.role = 'admin' and p_role <> 'admin' and v_admins <= 1 then
    raise exception 'Keep at least one admin in the mess';
  end if;

  update mess_members set role = p_role where id = p_member;
end;
$$;

create or replace function public.remove_mess_member(p_member uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_member      mess_members%rowtype;
  v_caller_role text;
  v_admins      integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into v_member from mess_members where id = p_member;
  if v_member.id is null or v_member.status = 'left' then
    return;
  end if;

  v_caller_role := public.role_in_mess(v_member.mess_id);
  if v_caller_role not in ('admin', 'manager') then
    raise exception 'Only an admin or manager can remove a member';
  end if;
  if v_member.user_id = auth.uid() then
    raise exception 'Use Leave this mess to remove yourself';
  end if;
  if v_member.role = 'admin' and v_caller_role <> 'admin' then
    raise exception 'Only an admin can remove another admin';
  end if;

  select count(*) into v_admins
    from mess_members
   where mess_id = v_member.mess_id and status = 'active' and role = 'admin';

  if v_member.role = 'admin' and v_admins <= 1 then
    raise exception 'Keep at least one admin in the mess';
  end if;

  update mess_members set status = 'left' where id = p_member;
end;
$$;

create or replace function public.leave_mess()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_member mess_members%rowtype;
  v_admins integer;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into v_member
    from mess_members
   where user_id = auth.uid() and status = 'active'
   order by joined_at
   limit 1;

  if v_member.id is null then
    return;
  end if;

  if v_member.role = 'admin' then
    select count(*) into v_admins
      from mess_members
     where mess_id = v_member.mess_id and status = 'active' and role = 'admin';
    if v_admins <= 1 then
      raise exception 'Make another member an admin before you leave';
    end if;
  end if;

  update mess_members set status = 'left' where id = v_member.id;
end;
$$;

revoke all on function public.set_member_role(uuid, text) from public;
revoke all on function public.remove_mess_member(uuid) from public;
revoke all on function public.leave_mess() from public;

grant execute on function public.set_member_role(uuid, text) to authenticated;
grant execute on function public.remove_mess_member(uuid) to authenticated;
grant execute on function public.leave_mess() to authenticated;
