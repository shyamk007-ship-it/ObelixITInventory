-- Office Custom Permission System
-- Apply this migration in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.office_users (
  id bigserial primary key,
  auth_user_id uuid not null unique,
  public_user_id bigint references public.users(id) on delete set null,
  full_name text not null,
  email text not null,
  employee_id text,
  department text,
  designation text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  is_admin boolean not null default false,
  office_access boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists office_users_email_unique_idx on public.office_users (lower(email));
create index if not exists office_users_public_user_id_idx on public.office_users (public_user_id);

create table if not exists public.office_permissions (
  id bigserial primary key,
  office_user_id bigint not null unique references public.office_users(id) on delete cascade,

  dashboard_view boolean not null default false,

  employees_view boolean not null default false,
  employees_create boolean not null default false,
  employees_edit boolean not null default false,
  employees_delete boolean not null default false,
  employees_export boolean not null default false,

  departments_view boolean not null default false,
  departments_create boolean not null default false,
  departments_edit boolean not null default false,
  departments_delete boolean not null default false,
  departments_export boolean not null default false,

  visitors_view boolean not null default false,
  visitors_create boolean not null default false,
  visitors_edit boolean not null default false,
  visitors_delete boolean not null default false,
  visitors_export boolean not null default false,

  inventory_view boolean not null default false,
  inventory_create boolean not null default false,
  inventory_edit boolean not null default false,
  inventory_delete boolean not null default false,
  inventory_transfer boolean not null default false,
  inventory_export boolean not null default false,

  warehouse_view boolean not null default false,
  warehouse_create boolean not null default false,
  warehouse_edit boolean not null default false,
  warehouse_delete boolean not null default false,
  warehouse_export boolean not null default false,

  procurement_view boolean not null default false,
  procurement_create boolean not null default false,
  procurement_edit boolean not null default false,
  procurement_approve boolean not null default false,
  procurement_export boolean not null default false,

  purchase_orders_view boolean not null default false,
  purchase_orders_create boolean not null default false,
  purchase_orders_edit boolean not null default false,
  purchase_orders_delete boolean not null default false,
  purchase_orders_approve boolean not null default false,
  purchase_orders_export boolean not null default false,

  suppliers_view boolean not null default false,
  suppliers_create boolean not null default false,
  suppliers_edit boolean not null default false,
  suppliers_delete boolean not null default false,
  suppliers_export boolean not null default false,

  assets_view boolean not null default false,
  assets_create boolean not null default false,
  assets_edit boolean not null default false,
  assets_delete boolean not null default false,
  assets_assign boolean not null default false,
  assets_return boolean not null default false,
  assets_export boolean not null default false,

  reports_view boolean not null default false,
  reports_export boolean not null default false,

  notifications_view boolean not null default false,
  notifications_manage boolean not null default false,

  settings_view boolean not null default false,
  settings_edit boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.office_permission_audit_logs (
  id bigserial primary key,
  actor_auth_user_id uuid,
  actor_email text,
  target_auth_user_id uuid,
  target_email text,
  action text not null,
  module text not null,
  context text not null,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists office_permission_audit_logs_actor_idx
  on public.office_permission_audit_logs (actor_auth_user_id, created_at desc);

create index if not exists office_permission_audit_logs_target_idx
  on public.office_permission_audit_logs (target_auth_user_id, created_at desc);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_office_users on public.office_users;
create trigger set_updated_at_office_users
before update on public.office_users
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists set_updated_at_office_permissions on public.office_permissions;
create trigger set_updated_at_office_permissions
before update on public.office_permissions
for each row
execute function public.set_updated_at_timestamp();

alter table public.office_users enable row level security;
alter table public.office_permissions enable row level security;
alter table public.office_permission_audit_logs enable row level security;

drop policy if exists office_users_select_self_or_admin on public.office_users;
create policy office_users_select_self_or_admin
on public.office_users
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or exists (
    select 1
    from public.office_users admins
    where admins.auth_user_id = auth.uid()
      and admins.is_admin = true
      and admins.status = 'active'
  )
);

drop policy if exists office_permissions_select_self_or_admin on public.office_permissions;
create policy office_permissions_select_self_or_admin
on public.office_permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.office_users ou
    where ou.id = office_permissions.office_user_id
      and (
        ou.auth_user_id = auth.uid()
        or exists (
          select 1
          from public.office_users admins
          where admins.auth_user_id = auth.uid()
            and admins.is_admin = true
            and admins.status = 'active'
        )
      )
  )
);

drop policy if exists office_permission_audit_select_admin_only on public.office_permission_audit_logs;
create policy office_permission_audit_select_admin_only
on public.office_permission_audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.office_users admins
    where admins.auth_user_id = auth.uid()
      and admins.is_admin = true
      and admins.status = 'active'
  )
);

-- Seed permission rows for existing office_users entries that do not have a row yet.
insert into public.office_permissions (office_user_id)
select ou.id
from public.office_users ou
left join public.office_permissions op on op.office_user_id = ou.id
where op.id is null;
