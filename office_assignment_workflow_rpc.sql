-- Transactional assignment workflow functions for Office workspace.
-- Run in Supabase SQL editor.

create or replace function public.office_assign_asset(
  p_asset_id bigint,
  p_employee_id bigint,
  p_notes text default null,
  p_expected_return_date date default null,
  p_assigned_by text default null
)
returns table (assignment_id bigint)
language plpgsql
security definer
as $$
declare
  v_assignment_id bigint;
  v_now timestamptz := now();
begin
  insert into public.assignment_records (
    asset_id,
    employee_id,
    status,
    assigned_date,
    expected_return_date,
    notes,
    assigned_by
  )
  values (
    p_asset_id,
    p_employee_id,
    'Assigned',
    v_now,
    p_expected_return_date,
    p_notes,
    p_assigned_by
  )
  returning id into v_assignment_id;

  update public.assets
  set
    assigned_to = p_employee_id,
    currently_assigned_to = p_employee_id,
    status = 'Assigned',
    last_assignment_date = v_now
  where id = p_asset_id;

  if not found then
    raise exception 'Asset % not found while assigning.', p_asset_id;
  end if;

  return query select v_assignment_id;
end;
$$;

create or replace function public.office_return_asset(
  p_assignment_id bigint default null,
  p_asset_id bigint default null,
  p_employee_id bigint default null,
  p_outcome text default 'Returned',
  p_notes text default null
)
returns table (return_record_id bigint)
language plpgsql
security definer
as $$
declare
  v_assignment_id bigint;
  v_asset_id bigint;
  v_employee_id bigint;
  v_outcome text;
  v_asset_status text;
  v_now timestamptz := now();
  v_return_record_id bigint;
begin
  if p_assignment_id is null and (p_asset_id is null or p_employee_id is null) then
    raise exception 'Provide assignment id or asset/employee ids.';
  end if;

  if p_assignment_id is not null then
    select ar.id, ar.asset_id, ar.employee_id
      into v_assignment_id, v_asset_id, v_employee_id
    from public.assignment_records ar
    where ar.id = p_assignment_id;

    if v_assignment_id is null then
      raise exception 'Assignment % not found.', p_assignment_id;
    end if;
  else
    v_assignment_id := null;
    v_asset_id := p_asset_id;
    v_employee_id := p_employee_id;
  end if;

  v_outcome := coalesce(nullif(trim(p_outcome), ''), 'Returned');
  v_asset_status := case when v_outcome = 'Returned' then 'Available' else v_outcome end;

  update public.assets
  set
    assigned_to = null,
    currently_assigned_to = null,
    status = v_asset_status
  where id = v_asset_id;

  if not found then
    raise exception 'Asset % not found while returning.', v_asset_id;
  end if;

  insert into public.assignment_records (
    asset_id,
    employee_id,
    status,
    assigned_date,
    actual_return_date,
    notes
  )
  values (
    v_asset_id,
    v_employee_id,
    v_outcome,
    v_now,
    v_now,
    coalesce(p_notes, case when v_assignment_id is not null then 'Return workflow event from assignment #' || v_assignment_id::text else null end)
  )
  returning id into v_return_record_id;

  if v_assignment_id is not null then
    update public.assignment_records
    set
      status = v_outcome,
      actual_return_date = v_now
    where id = v_assignment_id;
  end if;

  return query select v_return_record_id;
end;
$$;

-- Optional hardening: grant execute if needed.
-- grant execute on function public.office_assign_asset(bigint, bigint, text, date, text) to authenticated;
-- grant execute on function public.office_return_asset(bigint, bigint, bigint, text, text) to authenticated;
