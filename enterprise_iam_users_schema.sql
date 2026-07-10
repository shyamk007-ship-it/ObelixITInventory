-- Enterprise IAM support schema updates for existing users table
-- Safe to run multiple times.

alter table if exists public.users
  add column if not exists auth_user_id uuid;

alter table if exists public.users
  add column if not exists is_active boolean not null default true;

alter table if exists public.users
  add column if not exists phone_number text;

alter table if exists public.users
  add column if not exists profile_photo_url text;

alter table if exists public.users
  add column if not exists force_password_change boolean not null default false;

alter table if exists public.users
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists users_email_unique_idx
  on public.users (lower(email));

create unique index if not exists users_auth_user_id_unique_idx
  on public.users (auth_user_id)
  where auth_user_id is not null;

create index if not exists users_is_active_idx
  on public.users (is_active);

create index if not exists users_role_idx
  on public.users (role);

create index if not exists users_force_password_change_idx
  on public.users (force_password_change);

-- Optional storage bucket for profile photos.
insert into storage.buckets (id, name, public)
select 'profile-photos', 'profile-photos', true
where not exists (
  select 1 from storage.buckets where id = 'profile-photos'
);

-- Note:
-- Add storage policies in Supabase dashboard according to your security model.
-- This script does not alter Office/Fleet business modules.
