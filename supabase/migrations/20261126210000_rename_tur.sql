-- The app is now called tur (was spor): the sign-up refusal says so.
create or replace function private.gate_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.allowed_emails a where a.email = lower(new.email)) then
    raise exception 'tur is private';
  end if;
  return new;
end $$;
