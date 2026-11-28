-- Who logged a flight comes from the session, never from the client: set on insert, kept on update.

create or replace function private.stamp_flight_household() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.household_id := private.my_household();
  if new.household_id is null then
    raise exception 'not in a household';
  end if;
  new.user_id := coalesce(new.user_id, (select auth.uid()));
  if not exists (select 1 from public.household_members m where m.household_id = new.household_id and m.user_id = new.user_id) then
    raise exception 'that person is not in your household';
  end if;
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
  else
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;
