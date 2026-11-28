-- In-app stops can have a place: stop.upsert takes lat/lng (and clears them with null).
-- Left out of the payload, a stop keeps the place it had (Claude's stops keep theirs).
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
    insert into public.stops (id, trip_id, day_id, time, approx, name, kind, body, more, lat, lng)
    values (p_target, p_trip_id, (p_payload ->> 'dayId')::uuid, p_payload ->> 'time', false,
            p_payload ->> 'name', coalesce(p_payload ->> 'kind', 'normal'), p_payload ->> 'body', p_payload ->> 'more',
            (p_payload ->> 'lat')::double precision, (p_payload ->> 'lng')::double precision)
    on conflict (id) do update set
      day_id = excluded.day_id, time = excluded.time, name = excluded.name,
      kind = excluded.kind, body = excluded.body, more = excluded.more,
      lat = case when p_payload ? 'lat' then excluded.lat else public.stops.lat end,
      lng = case when p_payload ? 'lng' then excluded.lng else public.stops.lng end
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
