-- Initial hub schema. Apply through Supabase migrations after a project is configured.
-- No external credentials or remote database are touched by this file.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  category text not null default 'Personal',
  project text,
  due_date date,
  estimate_minutes integer check (estimate_minutes is null or estimate_minutes between 1 and 1440),
  priority smallint not null default 2 check (priority between 1 and 3),
  planning_date date,
  required_today boolean not null default false,
  is_done boolean not null default false,
  done_at timestamptz,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create index tasks_user_due_date_idx on public.tasks(user_id, due_date) where is_done = false and is_archived = false;

create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  time_zone text not null default 'America/New_York',
  strategy text not null check (strategy in ('Focus', 'Balanced', 'Essentials')),
  status text not null default 'draft' check (status in ('draft', 'accepted', 'superseded')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (user_id, id)
);

create index daily_plans_user_date_idx on public.daily_plans(user_id, plan_date desc);
create unique index daily_plans_one_accepted_per_day_idx on public.daily_plans(user_id, plan_date) where status = 'accepted';

create table public.plan_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null,
  task_id uuid,
  block_type text not null check (block_type in ('task', 'calendar', 'break', 'buffer')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  is_pinned boolean not null default false,
  source_event_id text,
  created_at timestamptz not null default now(),
  foreign key (user_id, plan_id) references public.daily_plans(user_id, id) on delete cascade,
  foreign key (user_id, task_id) references public.tasks(user_id, id) on delete cascade
);

create index plan_blocks_user_plan_start_idx on public.plan_blocks(user_id, plan_id, starts_at);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null default current_date,
  kind text not null check (kind in ('gym_visit', 'task_completed', 'workout', 'habit')),
  label text not null,
  category text,
  task_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_user_date_idx on public.activity_logs(user_id, activity_date desc);
create unique index activity_logs_one_gym_visit_per_day_idx on public.activity_logs(user_id, activity_date) where kind = 'gym_visit';
create unique index activity_logs_one_task_completion_per_day_idx on public.activity_logs(user_id, activity_date, task_id) where kind = 'task_completed' and task_id is not null;

create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wake_date date not null,
  bedtime time not null,
  wake_time time not null,
  quality smallint not null check (quality between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, wake_date)
);

create index sleep_logs_user_wake_date_idx on public.sleep_logs(user_id, wake_date desc);

create table public.alarms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Alarm',
  alarm_time time not null,
  time_zone text not null default 'America/New_York',
  days_of_week smallint[] not null default array[0,1,2,3,4,5,6]::smallint[],
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  check (array_position(days_of_week, null) is null),
  check (days_of_week <@ array[0,1,2,3,4,5,6]::smallint[])
);

create index alarms_user_enabled_idx on public.alarms(user_id) where is_enabled = true;

create table public.planner_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  time_zone text not null default 'America/New_York',
  workday_start time not null default '09:00',
  workday_end time not null default '18:00',
  break_minutes smallint not null default 20 check (break_minutes between 0 and 120),
  focus_session_minutes smallint not null default 50 check (focus_session_minutes between 15 and 240),
  updated_at timestamptz not null default now(),
  check (workday_end > workday_start)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

create trigger planner_preferences_set_updated_at before update on public.planner_preferences
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.daily_plans enable row level security;
alter table public.plan_blocks enable row level security;
alter table public.activity_logs enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.alarms enable row level security;
alter table public.planner_preferences enable row level security;

create policy "Users manage their own tasks" on public.tasks
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own plans" on public.daily_plans
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own plan blocks" on public.plan_blocks
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own activity" on public.activity_logs
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own sleep logs" on public.sleep_logs
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own alarms" on public.alarms
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own planner preferences" on public.planner_preferences
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.tasks, public.daily_plans, public.plan_blocks,
  public.activity_logs, public.sleep_logs, public.alarms, public.planner_preferences to authenticated;
