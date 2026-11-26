-- Settings: household invites and members, your own name, deleting your account.
-- Each function checks the caller itself (security definer, so it can reach the allowlist).

create function private.my_household() returns uuid
language sql stable security definer set search_path = '' as $$
  select household_id from public.household_members where user_id = (select auth.uid()) limit 1;
$$;

create function private.i_own(hh uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members
                 where household_id = hh and user_id = (select auth.uid()) and role = 'owner');
$$;

-- Invite someone by email: they can then sign in with a magic link and join this household.
create function public.invite_member(p_email text, p_name text) returns void
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
  -- Already has an account (e.g. signed up elsewhere earlier): join now.
  insert into public.household_members (household_id, user_id, display_name, role)
    select hh, u.id, trim(p_name), 'member' from auth.users u where lower(u.email) = lower(trim(p_email))
    on conflict do nothing;
end $$;

-- Invites that nobody has used yet.
create function public.list_invites() returns table (email text, display_name text)
language sql stable security definer set search_path = '' as $$
  select a.email, a.display_name from private.allowed_emails a
  where a.household_id = private.my_household() and private.i_own(a.household_id)
    and not exists (select 1 from auth.users u where lower(u.email) = a.email);
$$;

create function public.revoke_invite(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare hh uuid := private.my_household();
begin
  if hh is null or not private.i_own(hh) then raise exception 'only the household owner can revoke invites'; end if;
  delete from private.allowed_emails a where a.email = lower(p_email) and a.household_id = hh
    and not exists (select 1 from auth.users u where lower(u.email) = a.email);
end $$;

-- Remove a member (never yourself); they lose access and can't sign up again.
create function public.remove_member(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare hh uuid := private.my_household();
begin
  if hh is null or not private.i_own(hh) then raise exception 'only the household owner can remove people'; end if;
  if p_user = (select auth.uid()) then raise exception 'you can''t remove yourself'; end if;
  delete from public.household_members where household_id = hh and user_id = p_user;
  delete from private.allowed_emails a using auth.users u
    where u.id = p_user and a.email = lower(u.email) and a.household_id = hh;
end $$;

create function public.update_my_name(p_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'add a name'; end if;
  update public.household_members set display_name = trim(p_name) where user_id = (select auth.uid());
  update private.allowed_emails a set display_name = trim(p_name)
    from auth.users u where u.id = (select auth.uid()) and a.email = lower(u.email);
end $$;

-- Delete your own account. An owner who still shares the household must remove the others first,
-- so a household is never left without anyone who can manage it.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  hh uuid := private.my_household();
begin
  if me is null then raise exception 'not signed in'; end if;
  if hh is not null and private.i_own(hh) and exists (
    select 1 from public.household_members where household_id = hh and user_id <> me) then
    raise exception 'remove the other members first';
  end if;
  delete from private.allowed_emails a using auth.users u where u.id = me and a.email = lower(u.email);
  delete from auth.users where id = me;
end $$;

revoke execute on function public.invite_member(text, text), public.list_invites(), public.revoke_invite(text),
  public.remove_member(uuid), public.update_my_name(text), public.delete_my_account() from anon, public;
grant execute on function public.invite_member(text, text), public.list_invites(), public.revoke_invite(text),
  public.remove_member(uuid), public.update_my_name(text), public.delete_my_account() to authenticated;
grant execute on function private.my_household(), private.i_own(uuid) to authenticated;
