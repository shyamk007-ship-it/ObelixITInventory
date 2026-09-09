-- Idempotently restore the existing Super Admin role for Shyam.
-- Run in the Supabase SQL editor with an administrative connection.
-- This preserves any existing Fleet assignment and supports either the role_id
-- schema or the legacy role-text schema found in older deployments.

do $$
declare
  target_auth_id uuid := '46d2c7ee-abbb-4374-9d9d-37d8a9d056cf'::uuid;
  auth_id uuid;
  super_admin_role_id text;
  has_role_id boolean;
  updated_count integer;
begin
  select id into auth_id
  from auth.users
  where id = target_auth_id;

  if auth_id is null then
    raise exception 'Shyam Auth user % was not found in auth.users', target_auth_id;
  end if;

  select id::text into super_admin_role_id
  from public.roles
  where lower(role_name) = 'super_admin'
  order by id
  limit 1;

  if super_admin_role_id is null then
    raise exception 'Existing public.roles row with role_name super_admin was not found';
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_roles'
      and column_name = 'role_id'
  ) into has_role_id;

  if has_role_id then
    execute format(
      'update public.user_roles
       set role_id = %L, workspace = ''office'', is_active = true
       where user_id = %L::uuid and lower(workspace) = ''office''',
      super_admin_role_id,
      auth_id
    );
    get diagnostics updated_count = row_count;

    if updated_count = 0 then
      execute format(
        'insert into public.user_roles (user_id, role_id, workspace, is_active)
         values (%L::uuid, %L, ''office'', true)',
        auth_id,
        super_admin_role_id
      );
    end if;
  else
    execute format(
      'update public.user_roles
       set role = ''super_admin'', workspace = ''office'', is_active = true
       where user_id = %L::uuid and lower(workspace) = ''office''',
      auth_id
    );
    get diagnostics updated_count = row_count;

    if updated_count = 0 then
      execute format(
        'insert into public.user_roles (user_id, role, workspace, is_active)
         values (%L::uuid, ''super_admin'', ''office'', true)',
        auth_id
      );
    end if;
  end if;
end;
$$;
