-- Accounts are per person; trips are shared one by one.
--
-- Before: a household shared everything (trips, flights, places) and only allow-listed emails
-- could sign up. Now anyone can create an account (Google, email + password, or a magic link);
-- each person's flights and places been are their own; a trip belongs to whoever made it and is
-- shared with specific people, each able to edit or only view. Sharing is by email: someone
-- without an account yet gets the trip once they sign up and confirm that email.

-- ── People ────────────────────────────────────────────────────────────
create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  created_at timestamptz not null default now()
);

insert into public.profiles (user_id, display_name)
  select distinct on (user_id) user_id, display_name from public.household_members order by user_id, (role = 'owner') desc;
insert into public.profiles (user_id, display_name)
  select u.id, coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
                        nullif(trim(u.raw_user_meta_data ->> 'name'), ''), split_part(u.email, '@', 1), 'Traveller')
  from auth.users u
  on conflict (user_id) do nothing;

-- ── Who is on which trip ─────────────────────────────────────────────
create table public.trip_members (
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  added_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index on public.trip_members (user_id);
create unique index trip_members_one_owner on public.trip_members (trip_id) where role = 'owner';

-- Shared with an email that has no (confirmed) account yet.
create table public.trip_invites (
  trip_id uuid not null references public.trips on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role text not null check (role in ('editor', 'viewer')),
  invited_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  primary key (trip_id, email)
);
create index on public.trip_invites (email);

alter table public.trips add column owner_id uuid references auth.users on delete cascade;
update public.trips t set owner_id = (
  select m.user_id from public.household_members m where m.household_id = t.household_id order by (m.role = 'owner') desc limit 1);
insert into public.trip_members (trip_id, user_id, role)
  select id, owner_id, 'owner' from public.trips where owner_id is not null;
-- Anyone else in the old household keeps the trips they had, as an editor.
insert into public.trip_members (trip_id, user_id, role)
  select t.id, m.user_id, 'editor' from public.trips t join public.household_members m on m.household_id = t.household_id
  where m.user_id <> t.owner_id
  on conflict do nothing;
delete from public.trips where owner_id is null; -- a household nobody had joined: nothing to keep
alter table public.trips alter column owner_id set not null, alter column owner_id set default auth.uid();
create index on public.trips (owner_id);

-- ── Access helpers ────────────────────────────────────────────────────
create or replace function private.trip_role(t uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.trip_members where trip_id = t and user_id = (select auth.uid());
$$;

create or replace function private.can_access_trip(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trip_members where trip_id = t and user_id = (select auth.uid()));
$$;

create function private.can_edit_trip(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trip_members where trip_id = t and user_id = (select auth.uid()) and role in ('owner', 'editor'));
$$;

create function private.owns_trip(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trip_members where trip_id = t and user_id = (select auth.uid()) and role = 'owner');
$$;

-- Someone you're on a trip with: you see their name.
create function private.shares_trip_with(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.trip_members a join public.trip_members b on b.trip_id = a.trip_id
    where a.user_id = (select auth.uid()) and b.user_id = u);
$$;

-- You may log a flight for someone who is on a trip you can edit (one booking covers both).
create function private.can_log_flight_for(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select u = (select auth.uid()) or exists (
    select 1 from public.trip_members a join public.trip_members b on b.trip_id = a.trip_id
    where a.user_id = (select auth.uid()) and a.role in ('owner', 'editor') and b.user_id = u);
$$;

grant execute on function private.trip_role(uuid), private.can_access_trip(uuid), private.can_edit_trip(uuid),
  private.owns_trip(uuid), private.shares_trip_with(uuid), private.can_log_flight_for(uuid) to authenticated;

-- ── Trips: the owner comes from the session and never changes ────────
create function private.stamp_trip_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.owner_id := coalesce((select auth.uid()), new.owner_id);
  else
    new.owner_id := old.owner_id;
  end if;
  return new;
end $$;
create trigger trips_owner before insert or update on public.trips
  for each row execute function private.stamp_trip_owner();

create function private.add_trip_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.trip_members (trip_id, user_id, role) values (new.id, new.owner_id, 'owner') on conflict do nothing;
  return null;
end $$;
create trigger trips_add_owner after insert on public.trips
  for each row execute function private.add_trip_owner();

drop policy "members manage trips" on public.trips;
create policy "members read trips" on public.trips
  -- owner_id too: a new trip is returned to its creator before the owner row is added.
  for select to authenticated using (owner_id = (select auth.uid()) or private.can_access_trip(id));
create policy "anyone creates their own trips" on public.trips
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "editors change trips" on public.trips
  for update to authenticated using (private.can_edit_trip(id)) with check (private.can_edit_trip(id));
create policy "owners delete trips" on public.trips
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Everything inside a trip: everyone on it reads, editors and the owner change.
do $$
declare t text;
begin
  foreach t in array array['days', 'bookings', 'stops', 'budget_lines', 'spare_ideas', 'expenses'] loop
    execute format('drop policy "trip members" on public.%I', t);
    execute format('create policy "trip members read" on public.%I for select to authenticated using (private.can_access_trip(trip_id))', t);
    execute format('create policy "trip editors add" on public.%I for insert to authenticated with check (private.can_edit_trip(trip_id))', t);
    execute format('create policy "trip editors change" on public.%I for update to authenticated using (private.can_edit_trip(trip_id)) with check (private.can_edit_trip(trip_id))', t);
    execute format('create policy "trip editors remove" on public.%I for delete to authenticated using (private.can_edit_trip(trip_id))', t);
  end loop;
end $$;

drop policy "trip members add notes" on public.notes;
create policy "trip editors add notes" on public.notes
  for insert to authenticated with check (private.can_edit_trip(trip_id));

drop policy "members log their own edits" on public.activity_log;
create policy "editors log their own edits" on public.activity_log
  for insert to authenticated with check (private.can_edit_trip(trip_id) and actor = (select auth.uid()));

-- One entry point for app edits: a viewer gets a clear refusal rather than a silent no-op.
create or replace function public.apply_op(p_op_id uuid, p_trip_id uuid, p_kind text, p_target uuid, p_payload jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare bad text;
begin
  if not private.can_edit_trip(p_trip_id) then raise exception 'you can only view trip %', p_trip_id; end if;

  insert into public.activity_log (op_id, trip_id, actor, kind, target_id, patch)
    values (p_op_id, p_trip_id, (select auth.uid()), p_kind, p_target, p_payload)
    on conflict on constraint activity_log_op_id_key do nothing;
  if not found then return; end if; -- already applied

  case p_kind
  when 'stop.patch' then
    select key into bad from jsonb_object_keys(p_payload) key where key not in ('time', 'pickedOptionId', 'doneAt') limit 1;
    if bad is not null then raise exception 'field % cannot be edited by hand', bad; end if;
    update public.stops s set
      time = coalesce(p_payload ->> 'time', s.time),
      picked_option_id = case when p_payload ? 'pickedOptionId' then p_payload ->> 'pickedOptionId' else s.picked_option_id end,
      done_at = case when p_payload ? 'doneAt' then (p_payload ->> 'doneAt')::timestamptz else s.done_at end
    where s.id = p_target and s.trip_id = p_trip_id;

  when 'stop.upsert' then
    insert into public.stops (id, trip_id, day_id, time, approx, name, kind, body, more)
    values (p_target, p_trip_id, (p_payload ->> 'dayId')::uuid, p_payload ->> 'time', false,
            p_payload ->> 'name', coalesce(p_payload ->> 'kind', 'normal'), p_payload ->> 'body', p_payload ->> 'more')
    on conflict (id) do update set
      day_id = excluded.day_id, time = excluded.time, name = excluded.name,
      kind = excluded.kind, body = excluded.body, more = excluded.more
    where public.stops.trip_id = p_trip_id;

  when 'stop.delete' then
    delete from public.stops where id = p_target and trip_id = p_trip_id;

  when 'note.add' then
    insert into public.notes (id, trip_id, stop_id, day_id, body)
    values (p_target, p_trip_id, (p_payload ->> 'stopId')::uuid, (p_payload ->> 'dayId')::uuid, p_payload ->> 'body')
    on conflict (id) do nothing;

  when 'note.delete' then
    delete from public.notes where id = p_target and trip_id = p_trip_id and author = (select auth.uid());

  when 'expense.add' then
    insert into public.expenses (id, trip_id, amount, currency, category, paid_by, stop_id, note, spent_at)
    values (p_target, p_trip_id, (p_payload ->> 'amount')::numeric, p_payload ->> 'currency', p_payload ->> 'category',
            coalesce((p_payload ->> 'paidBy')::uuid, (select auth.uid())), (p_payload ->> 'stopId')::uuid,
            p_payload ->> 'note', coalesce((p_payload ->> 'spentAt')::timestamptz, now()))
    on conflict (id) do nothing;

  when 'expense.delete' then
    delete from public.expenses where id = p_target and trip_id = p_trip_id;

  else
    raise exception 'unknown edit %', p_kind;
  end case;
end $$;

-- paid_by must be someone on the trip.
create or replace function private.check_paid_by() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.paid_by is not null and not exists (
    select 1 from public.trip_members m where m.trip_id = new.trip_id and m.user_id = new.paid_by) then
    raise exception 'paid_by is not on this trip';
  end if;
  return new;
end $$;

-- Leaving tur must not be blocked by a note or an expense left on someone else's trip.
alter table public.notes alter column author drop not null;
alter table public.notes drop constraint notes_author_fkey,
  add constraint notes_author_fkey foreign key (author) references auth.users on delete set null;
alter table public.expenses alter column created_by drop not null;
alter table public.expenses drop constraint expenses_created_by_fkey,
  add constraint expenses_created_by_fkey foreign key (created_by) references auth.users on delete set null;

-- Who wrote a note or added an expense still never changes, but is cleared when they delete their account.
create or replace function private.stamp_author() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.author := (select auth.uid());
  else
    new.author := case when new.author is null then null else old.author end;
  end if;
  return new;
end $$;

create or replace function private.stamp_creator() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
  else
    new.created_by := case when new.created_by is null then null else old.created_by end;
  end if;
  return new;
end $$;

-- ── Sharing ───────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;

create policy "you and your travel companions" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()) or private.shares_trip_with(user_id));
create policy "people see who is on their trips" on public.trip_members
  for select to authenticated using (private.can_access_trip(trip_id));
create policy "owners see pending invites" on public.trip_invites
  for select to authenticated using (private.owns_trip(trip_id));

grant select on public.profiles, public.trip_members, public.trip_invites to authenticated;

-- Share a trip by email. An account with that (confirmed) email is added at once; otherwise the
-- invite waits until someone signs up and confirms it. Returns 'added' or 'invited'.
create function public.share_trip(p_trip uuid, p_email text, p_role text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  mail text := lower(trim(coalesce(p_email, '')));
  them uuid;
begin
  if not private.owns_trip(p_trip) then raise exception 'only the trip''s owner can share it'; end if;
  if p_role not in ('editor', 'viewer') then raise exception 'choose can edit or can view'; end if;
  if mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'that email doesn''t look right'; end if;
  select id into them from auth.users where lower(email) = mail and email_confirmed_at is not null limit 1;
  if them = (select auth.uid()) then raise exception 'that''s you'; end if;
  if them is not null then
    insert into public.profiles (user_id, display_name) values (them, split_part(mail, '@', 1)) on conflict do nothing;
    insert into public.trip_members (trip_id, user_id, role) values (p_trip, them, p_role)
      on conflict (trip_id, user_id) do update set role = excluded.role where public.trip_members.role <> 'owner';
    delete from public.trip_invites where trip_id = p_trip and email = mail;
    return 'added';
  end if;
  insert into public.trip_invites (trip_id, email, role, invited_by) values (p_trip, mail, p_role, (select auth.uid()))
    on conflict (trip_id, email) do update set role = excluded.role;
  return 'invited';
end $$;

create function public.revoke_trip_invite(p_trip uuid, p_email text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.owns_trip(p_trip) then raise exception 'only the trip''s owner can change who it''s shared with'; end if;
  delete from public.trip_invites where trip_id = p_trip and email = lower(trim(p_email));
end $$;

create function public.set_trip_role(p_trip uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.owns_trip(p_trip) then raise exception 'only the trip''s owner can change who it''s shared with'; end if;
  if p_role not in ('editor', 'viewer') then raise exception 'choose can edit or can view'; end if;
  update public.trip_members set role = p_role where trip_id = p_trip and user_id = p_user and role <> 'owner';
end $$;

-- The owner removes someone; anyone else can take themselves off a trip.
create function public.remove_from_trip(p_trip uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_user = (select auth.uid()) then
    if private.owns_trip(p_trip) then raise exception 'you own this trip: delete it instead'; end if;
  elsif not private.owns_trip(p_trip) then
    raise exception 'only the trip''s owner can remove people';
  end if;
  delete from public.trip_members where trip_id = p_trip and user_id = p_user and role <> 'owner';
end $$;

revoke execute on function public.share_trip(uuid, text, text), public.revoke_trip_invite(uuid, text),
  public.set_trip_role(uuid, uuid, text), public.remove_from_trip(uuid, uuid) from anon, public;
grant execute on function public.share_trip(uuid, text, text), public.revoke_trip_invite(uuid, text),
  public.set_trip_role(uuid, uuid, text), public.remove_from_trip(uuid, uuid) to authenticated;

-- ── Sign-up: open to anyone ──────────────────────────────────────────
drop trigger spor_gate_signup on auth.users;
drop trigger spor_join_household on auth.users;
drop function private.gate_signup();
drop function private.join_household();

create function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                                nullif(trim(new.raw_user_meta_data ->> 'name'), ''), nullif(split_part(new.email, '@', 1), ''), 'Traveller'), 80))
  on conflict do nothing;
  return new;
end $$;

-- Trips waiting for this email arrive once the email is proven (Google, or the confirmation link),
-- so nobody gets a trip by signing up with someone else's address.
create function private.claim_trip_invites() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is null or new.email is null then return new; end if;
  insert into public.trip_members (trip_id, user_id, role)
    select i.trip_id, new.id, i.role from public.trip_invites i where i.email = lower(new.email)
    on conflict do nothing;
  delete from public.trip_invites where email = lower(new.email);
  return new;
end $$;

create trigger tur_create_profile after insert on auth.users
  for each row execute function private.create_profile();
create trigger tur_claim_invites after insert or update of email_confirmed_at, email on auth.users
  for each row execute function private.claim_trip_invites();

-- ── Your own name and account ────────────────────────────────────────
create or replace function public.update_my_name(p_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'add a name'; end if;
  update public.profiles set display_name = left(trim(p_name), 80) where user_id = (select auth.uid());
end $$;

-- Deletes the account, the trips it owns (with everything in them), and its flights and places.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = me;
end $$;

-- ── Flights: yours, plus any you logged for a travel companion ───────
drop policy "household reads flights" on public.flights;
drop policy "household adds flights" on public.flights;
drop policy "household edits flights" on public.flights;
drop policy "household removes flights" on public.flights;
drop trigger flights_household on public.flights;
drop function private.stamp_flight_household();
drop index public.flights_household;
alter table public.flights drop column household_id;
create index flights_user on public.flights (user_id, flown_on);

create function private.stamp_flight() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := coalesce(new.user_id, (select auth.uid()));
    new.created_by := (select auth.uid());
    if not private.can_log_flight_for(new.user_id) then
      raise exception 'you can log flights for yourself and people on trips you can edit';
    end if;
  else
    new.user_id := old.user_id; -- a flight stays with the person who flew it
    -- Kept, except cleared when whoever logged it deletes their account.
    new.created_by := case when new.created_by is null then null else old.created_by end;
  end if;
  return new;
end $$;
create trigger flights_stamp before insert or update on public.flights
  for each row execute function private.stamp_flight();

create policy "your flights and the ones you logged" on public.flights
  for select to authenticated using (user_id = (select auth.uid()) or created_by = (select auth.uid()));
create policy "log flights for yourself or a companion" on public.flights
  for insert to authenticated with check (private.can_log_flight_for(user_id));
create policy "change your flights and the ones you logged" on public.flights
  for update to authenticated
  using (user_id = (select auth.uid()) or created_by = (select auth.uid()))
  with check (user_id = (select auth.uid()) or created_by = (select auth.uid()));
create policy "remove your flights and the ones you logged" on public.flights
  for delete to authenticated using (user_id = (select auth.uid()) or created_by = (select auth.uid()));

-- ── Places been: only yours ──────────────────────────────────────────
drop policy "household reads places been" on public.places_been;
drop policy "people add their own places" on public.places_been;
drop policy "people remove their own places" on public.places_been;
drop trigger places_been_owner on public.places_been;
drop function private.stamp_place_owner();
drop index public.places_been_household;
alter table public.places_been drop column household_id;

create function private.stamp_place_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.user_id := (select auth.uid());
  return new;
end $$;
create trigger places_been_owner before insert on public.places_been
  for each row execute function private.stamp_place_owner();

create policy "your places" on public.places_been
  for select to authenticated using (user_id = (select auth.uid()));
create policy "log your places" on public.places_been
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "remove your places" on public.places_been
  for delete to authenticated using (user_id = (select auth.uid()));

-- ── Households are gone ──────────────────────────────────────────────
drop function public.invite_member(text, text);
drop function public.list_invites();
drop function public.revoke_invite(text);
drop function public.remove_member(uuid);
drop policy "members read their household" on public.households;
drop policy "members see each other" on public.household_members;
alter table public.trips drop column household_id;
drop table private.allowed_emails;
drop table public.household_members;
drop table public.households;
drop function private.my_household();
drop function private.i_own(uuid);
drop function private.is_member(uuid);

-- Being added to (or removed from) a trip shows up on the phone without a refresh.
alter publication supabase_realtime add table public.trip_members;
