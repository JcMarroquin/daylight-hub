-- Gym workouts and body-weight entries, private to each signed-in account.
-- Apply after the initial hub migration (public.set_updated_at).
begin;
create table if not exists public.gym_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ?& array['id','kind','date'] and data->>'id' = id and data->>'kind' in ('workout','weight')),
  updated_at timestamptz not null default now(),
  primary key (user_id,id)
);
drop trigger if exists gym_records_set_updated_at on public.gym_records;
create trigger gym_records_set_updated_at before update on public.gym_records
for each row execute function public.set_updated_at();
alter table public.gym_records enable row level security;
drop policy if exists "Users manage their own gym records" on public.gym_records;
create policy "Users manage their own gym records" on public.gym_records
for all to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
revoke all on public.gym_records from anon,authenticated;
grant select,insert,update on public.gym_records to authenticated;
do $$
begin
 if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
 and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'gym_records') then
  alter publication supabase_realtime add table public.gym_records;
 end if;
end $$;
notify pgrst, 'reload schema';
commit;
