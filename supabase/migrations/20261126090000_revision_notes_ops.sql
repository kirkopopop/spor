-- 1. Trip revision: any change inside a trip bumps it. Writers (Claude) pass the
--    revision they read; a stale one is refused, so nobody overwrites an edit they
--    haven't seen. Expenses don't count: logging a coffee shouldn't block planning.
alter table public.trips add column revision bigint not null default 0;

create function private.bump_trip_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t uuid;
begin
  t := case when tg_op = 'DELETE' then old.trip_id else new.trip_id end;
  update public.trips set revision = revision + 1 where id = t;
  if tg_op = 'UPDATE' and old.trip_id is distinct from new.trip_id then
    update public.trips set revision = revision + 1 where id = old.trip_id;
  end if;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['days', 'stops', 'bookings', 'budget_lines', 'spare_ideas', 'notes'] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function private.bump_trip_revision()', t || '_bump_revision', t);
  end loop;
end $$;

-- Editing the trip row itself bumps it too (but not the bump above, which only touches revision).
create function private.bump_own_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.revision = old.revision and row(new.*) is distinct from row(old.*) then
    new.revision := old.revision + 1;
  end if;
  return new;
end $$;
create trigger trips_bump_revision before update on public.trips
  for each row execute function private.bump_own_revision();

-- 2. Notes can sit on a day as well as on a stop or the whole trip.
alter table public.notes add column day_id uuid references public.days on delete cascade;
create index on public.notes (stop_id);
create index on public.notes (day_id);
alter publication supabase_realtime add table public.budget_lines, public.spare_ideas;

-- 3. One entry point for every edit made in the app. Idempotent on the phone's op id,
--    runs as the caller (RLS applies), logged for Claude to read.
create function public.apply_op(p_op_id uuid, p_trip_id uuid, p_kind text, p_target uuid, p_payload jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare bad text;
begin
  if not private.can_access_trip(p_trip_id) then raise exception 'no access to trip %', p_trip_id; end if;

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
grant execute on function public.apply_op(uuid, uuid, text, uuid, jsonb) to authenticated;
revoke execute on function public.apply_op(uuid, uuid, text, uuid, jsonb) from anon, public;

-- paid_by must be someone in the household, not any account.
create function private.check_paid_by() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.paid_by is not null and not exists (
    select 1 from public.household_members m join public.trips t on t.household_id = m.household_id
    where t.id = new.trip_id and m.user_id = new.paid_by) then
    raise exception 'paid_by is not in this household';
  end if;
  return new;
end $$;
create trigger expenses_paid_by before insert or update of paid_by on public.expenses
  for each row execute function private.check_paid_by();
