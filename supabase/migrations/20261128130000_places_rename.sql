-- Rename a place you logged (e.g. a search result named for a district: "Finance Center" → Istanbul).
-- Only the name can change, and only on your own rows.
create policy "rename your places" on public.places_been
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke update on public.places_been from authenticated, anon;
grant update (name) on public.places_been to authenticated;
