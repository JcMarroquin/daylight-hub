-- Hue credentials are encrypted by the backend before storage.
-- No browser role can access this table. Only the server secret key can.
create table if not exists public.hue_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.hue_connections enable row level security;
revoke all on table public.hue_connections from public, anon, authenticated;
grant select, insert, update, delete on table public.hue_connections to service_role;
