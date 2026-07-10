-- Profile photo storage policies for Enterprise IAM
-- Safe to run multiple times.

insert into storage.buckets (id, name, public)
select 'profile-photos', 'profile-photos', true
where not exists (
  select 1 from storage.buckets where id = 'profile-photos'
);

-- Allow authenticated users to upload only to their own folder:
-- object path format: {auth.uid()}/{filename}

drop policy if exists "profile_photos_insert_own" on storage.objects;
create policy "profile_photos_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "profile_photos_update_own" on storage.objects;
create policy "profile_photos_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "profile_photos_delete_own" on storage.objects;
create policy "profile_photos_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Public bucket keeps read access via public URLs; no read policy is required here.
