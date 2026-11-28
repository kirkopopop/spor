-- Flights: one row per person per flight, for travel stats (count, air time, km) and the countries
-- flown to. Distance and countries are worked out from the airports when a flight is logged.
-- A household logs flights for each other (one booking covers both), so any member adds, edits
-- or removes a flight of anyone in their household.

create table public.flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  flown_on date not null,
  from_code text not null check (from_code ~ '^[A-Z]{3}$'),
  to_code text not null check (to_code ~ '^[A-Z]{3}$'),
  from_country text not null check (from_country ~ '^[A-Z]{2}$'),
  to_country text not null check (to_country ~ '^[A-Z]{2}$'),
  km integer not null check (km between 0 and 21000),
  minutes integer check (minutes between 1 and 1440),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index flights_household on public.flights (household_id, flown_on);

-- The household comes from the session; the person flown for must be in it (yourself by default).
create function private.stamp_flight_household() returns trigger
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
  return new;
end;
$$;

create trigger flights_household before insert or update on public.flights
  for each row execute function private.stamp_flight_household();

alter table public.flights enable row level security;

create policy "household reads flights" on public.flights
  for select to authenticated using (private.is_member(household_id));

create policy "household adds flights" on public.flights
  for insert to authenticated with check (private.is_member(household_id));

create policy "household edits flights" on public.flights
  for update to authenticated using (private.is_member(household_id)) with check (private.is_member(household_id));

create policy "household removes flights" on public.flights
  for delete to authenticated using (private.is_member(household_id));

grant select, insert, update, delete on public.flights to authenticated;
