-- Supabase notifications table schema

create extension if not exists "pgcrypto";

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  action text not null,
  record_type text,
  record_id text,
  user_name text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_read_idx on public.notifications(read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);
