-- 005_realtime.sql — switch on Realtime for the tables the workspace renders.
--
-- Run this once against the live Supabase project (SQL editor, or
-- `supabase db push`). The app works without it: it simply falls back to
-- manual refresh, which is the behaviour before Realtime existed.
--
-- Replica identity full is set on purpose. Realtime checks RLS row by row, and
-- a DELETE whose old record carries only the primary key cannot be checked, so
-- those events are silently dropped (deleting a bazar entry or a poll would
-- never reach the other phones).

do $$
declare
  t text;
  targets text[] := array[
    'daily_meals',
    'bazar_expenses',
    'bazar_schedule',
    'fixed_utilities',
    'member_deposits',
    'mess_members',
    'mess_messages',
    'polls',
    'poll_votes',
    'game_rooms',
    'monthly_cycles',
    'messes',
    'profiles'
  ];
begin
  foreach t in array targets loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null; -- already published
      when undefined_object then null; -- publication missing; enable Realtime in the dashboard
    end;

    execute format('alter table public.%I replica identity full', t);
  end loop;
end $$;
