-- Notes: everyone in the trip reads and adds; only the author edits or deletes their own.
drop policy "trip members" on public.notes;

create policy "trip members read notes" on public.notes
  for select to authenticated using (private.can_access_trip(trip_id));
create policy "trip members add notes" on public.notes
  for insert to authenticated with check (private.can_access_trip(trip_id));
create policy "authors edit their notes" on public.notes
  for update to authenticated
  using (author = (select auth.uid()) and private.can_access_trip(trip_id))
  with check (author = (select auth.uid()) and private.can_access_trip(trip_id));
create policy "authors delete their notes" on public.notes
  for delete to authenticated using (author = (select auth.uid()) and private.can_access_trip(trip_id));

-- "via claude" can only come from a token issued to an OAuth client (the connector),
-- never from the app's own session, and never changes afterwards.
create function private.stamp_note_via() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.via := old.via;
  elsif new.via is not null and coalesce((select auth.jwt()) ->> 'client_id', '') = '' then
    new.via := null;
  end if;
  return new;
end $$;
create trigger notes_via before insert or update on public.notes
  for each row execute function private.stamp_note_via();
