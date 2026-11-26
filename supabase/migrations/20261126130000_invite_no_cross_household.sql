-- Inviting an email that already has an account adds them only when they are in no
-- household yet and this household owns the invite; never pulls someone out of (or into
-- a second) household without their own sign-in.
create or replace function public.invite_member(p_email text, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare hh uuid := private.my_household();
begin
  if hh is null or not private.i_own(hh) then raise exception 'only the household owner can invite'; end if;
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'that email doesn''t look right'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'add a name'; end if;
  insert into private.allowed_emails (email, household_id, display_name, role)
    values (lower(trim(p_email)), hh, trim(p_name), 'member')
    on conflict (email) do update set display_name = excluded.display_name
    where private.allowed_emails.household_id = hh;
  insert into public.household_members (household_id, user_id, display_name, role)
    select hh, u.id, trim(p_name), 'member'
    from auth.users u
    join private.allowed_emails a on a.email = lower(u.email) and a.household_id = hh
    where lower(u.email) = lower(trim(p_email))
      and not exists (select 1 from public.household_members m where m.user_id = u.id)
    on conflict do nothing;
end $$;
