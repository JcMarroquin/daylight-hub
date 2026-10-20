-- Habit definitions and daily checks sync independently of one-off tasks.
-- Requires the initial hub migration (public.set_updated_at).
begin;
create table if not exists public.habits (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id::text),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create table if not exists public.habit_checks (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'id' = id::text and jsonb_typeof(data->'checked') = 'boolean'),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
-- Unchecking writes checked=false; keeping that row prevents an old device
-- from restoring a checkmark during its one-time local-data import.
drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at before update on public.habits
for each row execute function public.set_updated_at();
drop trigger if exists habit_checks_set_updated_at on public.habit_checks;
create trigger habit_checks_set_updated_at before update on public.habit_checks
for each row execute function public.set_updated_at();
alter table public.habits enable row level security;
alter table public.habit_checks enable row level security;
drop policy if exists "Users manage their own habits" on public.habits;
create policy "Users manage their own habits" on public.habits
for all to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage their own habit checks" on public.habit_checks;
create policy "Users manage their own habit checks" on public.habit_checks
for all to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
revoke all on public.habits, public.habit_checks from anon, authenticated;
grant select, insert, update on public.habits, public.habit_checks to authenticated;
do $$
declare table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['habits','habit_checks'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
