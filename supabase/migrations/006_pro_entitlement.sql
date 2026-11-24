-- 006_pro_entitlement.sql — Pro is granted by Mess Mates, never by the client.
--
-- Row policies cannot restrict a single column, and the existing ones are broad:
-- `messes_update` lets any mess admin write every column of their mess (including
-- `is_pro_mess`) and `profiles_update` lets any user write their own row
-- (including `is_pro`). That made the whole Pro tier free — anyone could flip the
-- flag with a hand-made API call.
--
-- A trigger is the narrow fix: client roles (authenticated / anon) may not change
-- either flag. The service role, and SQL typed into the dashboard, still can.

create or replace function public.protect_pro_flag()
returns trigger
language plpgsql
as $$
declare
  claims jsonb;
  caller text;
begin
  if nullif(current_setting('request.jwt.claims', true), '') is not null then
    claims := current_setting('request.jwt.claims', true)::jsonb;
  end if;
  caller := coalesce(claims ->> 'role', '');

  if caller in ('authenticated', 'anon') then
    if tg_table_name = 'messes' and new.is_pro_mess is distinct from old.is_pro_mess then
      raise exception 'Pro is activated by Mess Mates support, not from the app.'
        using errcode = '42501';
    end if;

    if tg_table_name = 'profiles' and new.is_pro is distinct from old.is_pro then
      raise exception 'Pro is activated by Mess Mates support, not from the app.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists messes_pro_flag_guard on public.messes;
create trigger messes_pro_flag_guard
  before update on public.messes
  for each row execute function public.protect_pro_flag();

drop trigger if exists profiles_pro_flag_guard on public.profiles;
create trigger profiles_pro_flag_guard
  before update on public.profiles
  for each row execute function public.protect_pro_flag();

-- How support grants Pro (run in the Supabase SQL editor, which is not a client role):
--
--   update public.messes set is_pro_mess = true where id = '<mess uuid>';
--   update public.profiles set is_pro = true where id = '<user uuid>';  -- personal grant only
--
-- Turning it off again is the same statement with false.
