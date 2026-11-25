-- Who-did-what columns are stamped by the database, never taken from the client,
-- so nobody can write a note, an expense or a tick in someone else's name.

create function private.stamp_author() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.author := (select auth.uid());
  else
    new.author := old.author; -- authorship never changes
  end if;
  return new;
end $$;
create trigger notes_author before insert or update on public.notes
  for each row execute function private.stamp_author();

create function private.stamp_creator() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
  else
    new.created_by := old.created_by;
  end if;
  return new;
end $$;
create trigger expenses_creator before insert or update on public.expenses
  for each row execute function private.stamp_creator();

-- done_by always follows done_at: whoever ticks (or unticks) the stop.
create function private.stamp_done_by() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.done_at is distinct from old.done_at then
    new.done_by := case when new.done_at is null then null else (select auth.uid()) end;
  else
    new.done_by := old.done_by;
  end if;
  return new;
end $$;
create trigger stops_done_by before insert or update on public.stops
  for each row execute function private.stamp_done_by();
