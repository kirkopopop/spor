-- Places been: the countries and cities each person has visited, logged by hand. Per person;
-- the household can see each other's (for the Me / Tanya / Both globe), only the owner changes theirs.
-- Trips that have ended count automatically in the app; this table holds only what was logged.

create table public.places_been (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  kind text not null check (kind in ('country', 'city')),
  country text not null check (country ~ '^[A-Z]{2}$'),
  name text not null check (char_length(name) between 1 and 120),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  created_at timestamptz not null default now(),
  unique (user_id, kind, country, name)
);

create index places_been_household on public.places_been (household_id);

-- Who and which household come from the session, never from the client.
create function private.stamp_place_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.user_id := (select auth.uid());
  new.household_id := private.my_household();
  if new.household_id is null then
    raise exception 'not in a household';
  end if;
  return new;
end;
$$;

create trigger places_been_owner before insert on public.places_been
  for each row execute function private.stamp_place_owner();

alter table public.places_been enable row level security;

create policy "household reads places been" on public.places_been
  for select to authenticated using (private.is_member(household_id));

create policy "people add their own places" on public.places_been
  for insert to authenticated with check (user_id = (select auth.uid()) and private.is_member(household_id));

create policy "people remove their own places" on public.places_been
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.places_been to authenticated;
