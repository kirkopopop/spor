-- spor: households, trips and everything inside them.
-- Access rule everywhere: you see a trip if you are a member of its household.

create schema if not exists private;

-- ── Households ─────────────────────────────────────────────────────────
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  primary key (household_id, user_id)
);
create index on public.household_members (user_id);

-- Who may create an account, and which household they join. Never readable by clients.
create table private.allowed_emails (
  email text primary key check (email = lower(email)),
  household_id uuid not null references public.households on delete cascade,
  display_name text not null,
  role text not null default 'member'
);

-- ── Trips ──────────────────────────────────────────────────────────────
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name text not null check (length(name) between 1 and 120),
  stage text not null default 'idea' check (stage in ('idea', 'planning', 'live', 'memory')),
  start_date date,
  end_date date,
  timezone text not null default 'Europe/Copenhagen',
  currency text not null default 'EUR' check (currency in ('EUR', 'GBP', 'DKK', 'USD')),
  people text[] not null default '{}',
  summary text,
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index on public.trips (household_id);

create table public.days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  date date not null,
  title text not null default '',
  city text not null default '',
  place text not null default '',
  intro text,
  rain text[] not null default '{}',
  unique (trip_id, date)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  title text not null,
  note text,
  status text not null default 'to_book' check (status in ('to_book', 'booked')),
  est_cost numeric(10, 2),
  actual_cost numeric(10, 2),
  due_by date,
  private_ref text, -- booking reference: lives only here, behind RLS
  url text,
  sort int not null default 0
);
create index on public.bookings (trip_id);

create table public.stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  day_id uuid not null references public.days on delete cascade,
  time text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'), -- local to the trip's timezone
  approx boolean not null default false,
  name text not null check (length(name) between 1 and 200),
  kind text not null default 'normal' check (kind in ('fixed', 'normal', 'optional')),
  body text,
  more text,
  lat double precision,
  lng double precision,
  maps_query text,
  go jsonb, -- travel to this stop: {mode, min, text?, leave?, est?}
  journey text check (journey in ('train', 'bus', 'plane')),
  off_map boolean not null default false,
  who text,
  fee jsonb, -- {label, paid}
  booking_id uuid references public.bookings on delete set null,
  options jsonb not null default '[]', -- [{id, name, body?, mapsQuery?}]
  pick_one boolean not null default false,
  picked_option_id text,
  done_at timestamptz,
  done_by uuid references auth.users on delete set null,
  sort int not null default 0
);
create index on public.stops (trip_id);
create index on public.stops (day_id);

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  category text not null,
  label text not null,
  planned numeric(10, 2) not null default 0,
  unique (trip_id, category)
);

create table public.spare_ideas (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  name text not null,
  city text not null default '',
  area text,
  note text,
  indoor boolean not null default false,
  minutes int not null default 60,
  lat double precision,
  lng double precision,
  maps_query text
);
create index on public.spare_ideas (trip_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null,
  category text not null,
  paid_by uuid references auth.users on delete set null,
  split jsonb not null default '{"even": true}',
  stop_id uuid references public.stops on delete set null,
  note text,
  spent_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users
);
create index on public.expenses (trip_id);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  stop_id uuid references public.stops on delete set null,
  author uuid not null default auth.uid() references auth.users,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index on public.notes (trip_id);

-- Every hand edit, by whom and when: lets Claude read what others changed before it writes.
create table public.activity_log (
  id bigint generated always as identity primary key,
  op_id uuid unique, -- the phone's edit id: replays of a queued edit are no-ops
  trip_id uuid not null references public.trips on delete cascade,
  actor uuid references auth.users on delete set null,
  kind text not null,
  target_id uuid,
  patch jsonb,
  at timestamptz not null default now()
);
create index on public.activity_log (trip_id, at desc);

-- ── Access helpers (private schema: not exposed through the API) ───────
create function private.is_member(hh uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hh and m.user_id = (select auth.uid())
  );
$$;

create function private.can_access_trip(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.trips tr
    join public.household_members m on m.household_id = tr.household_id
    where tr.id = t and m.user_id = (select auth.uid())
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_member(uuid), private.can_access_trip(uuid) to authenticated;

-- ── Row level security ────────────────────────────────────────────────
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table private.allowed_emails enable row level security;
alter table public.trips enable row level security;
alter table public.days enable row level security;
alter table public.bookings enable row level security;
alter table public.stops enable row level security;
alter table public.budget_lines enable row level security;
alter table public.spare_ideas enable row level security;
alter table public.expenses enable row level security;
alter table public.notes enable row level security;
alter table public.activity_log enable row level security;

create policy "members read their household" on public.households
  for select to authenticated using (private.is_member(id));

create policy "members see each other" on public.household_members
  for select to authenticated using (private.is_member(household_id));

create policy "members manage trips" on public.trips
  for all to authenticated
  using (private.is_member(household_id)) with check (private.is_member(household_id));

-- Everything inside a trip follows the trip.
do $$
declare t text;
begin
  foreach t in array array['days', 'bookings', 'stops', 'budget_lines', 'spare_ideas', 'expenses', 'notes'] loop
    execute format(
      'create policy "trip members" on public.%I for all to authenticated
         using (private.can_access_trip(trip_id)) with check (private.can_access_trip(trip_id))', t);
  end loop;
end $$;

create policy "members read activity" on public.activity_log
  for select to authenticated using (private.can_access_trip(trip_id));
create policy "members log their own edits" on public.activity_log
  for insert to authenticated with check (private.can_access_trip(trip_id) and actor = (select auth.uid()));

-- A stop cannot point at another trip's booking or day.
create function private.check_stop_refs() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.days d where d.id = new.day_id and d.trip_id = new.trip_id) then
    raise exception 'day % is not in trip %', new.day_id, new.trip_id;
  end if;
  if new.booking_id is not null and not exists (
    select 1 from public.bookings b where b.id = new.booking_id and b.trip_id = new.trip_id) then
    raise exception 'booking % is not in trip %', new.booking_id, new.trip_id;
  end if;
  return new;
end $$;
create trigger stops_refs before insert or update of day_id, booking_id, trip_id on public.stops
  for each row execute function private.check_stop_refs();

-- ── Hand edits from phones ────────────────────────────────────────────
-- One queued edit = one call. Idempotent on op_id, so a retry after a dropped
-- connection never applies twice. Only light-edit fields are allowed here.
create function public.apply_stop_patch(op_id uuid, stop_id uuid, patch jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  t uuid;
  bad text;
begin
  select key into bad from jsonb_object_keys(patch) key
    where key not in ('time', 'pickedOptionId', 'doneAt') limit 1;
  if bad is not null then raise exception 'field % cannot be edited by hand', bad; end if;

  select s.trip_id into t from public.stops s where s.id = stop_id;
  if t is null then return; end if; -- stop was deleted (e.g. Claude rewrote the day): drop the edit

  insert into public.activity_log (op_id, trip_id, actor, kind, target_id, patch)
    values (op_id, t, (select auth.uid()), 'stop.patch', stop_id, patch)
    on conflict on constraint activity_log_op_id_key do nothing;
  if not found then return; end if; -- already applied

  update public.stops s set
    time = coalesce(patch ->> 'time', s.time),
    picked_option_id = case when patch ? 'pickedOptionId' then patch ->> 'pickedOptionId' else s.picked_option_id end,
    done_at = case when patch ? 'doneAt' then (patch ->> 'doneAt')::timestamptz else s.done_at end,
    done_by = case when patch ? 'doneAt' then (select auth.uid()) else s.done_by end
  where s.id = stop_id;
end $$;
grant execute on function public.apply_stop_patch(uuid, uuid, jsonb) to authenticated;
revoke execute on function public.apply_stop_patch(uuid, uuid, jsonb) from anon, public;

-- ── Sign-up allowlist ─────────────────────────────────────────────────
-- Only listed emails can create an account; they join their household at once.
create function private.gate_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.allowed_emails a where a.email = lower(new.email)) then
    raise exception 'spor is private';
  end if;
  return new;
end $$;

create function private.join_household() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.household_members (household_id, user_id, display_name, role)
    select a.household_id, new.id, a.display_name, a.role
    from private.allowed_emails a where a.email = lower(new.email)
    on conflict do nothing;
  return new;
end $$;

create trigger spor_gate_signup before insert on auth.users
  for each row execute function private.gate_signup();
create trigger spor_join_household after insert on auth.users
  for each row execute function private.join_household();

-- ── Realtime: the other phone's ticks and picks arrive without a refresh ─
alter publication supabase_realtime add table public.trips, public.days, public.stops, public.bookings,
  public.expenses, public.notes;
