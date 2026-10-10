-- One saved schedule per account, including an empty schedule after all shifts are removed.
create table if not exists public.work_schedules (
  user_id uuid primary key references auth.users(id) on delete cascade,
  shifts jsonb not null default '[]'::jsonb check (jsonb_typeof(shifts) = 'array'),
  updated_at timestamptz not null default now()
);

create trigger work_schedules_set_updated_at before update on public.work_schedules
for each row execute function public.set_updated_at();

alter table public.work_schedules enable row level security;
create policy "Users manage their own work schedule" on public.work_schedules
for all to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.work_schedules to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.work_schedules;
  end if;
exception when duplicate_object then null;
end $$;
