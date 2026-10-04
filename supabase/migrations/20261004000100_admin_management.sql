-- ═════════════════════════════════════════════════════════════════════════
--  Admin management from the admin panel
-- ═════════════════════════════════════════════════════════════════════════
--  Admins can list the admins, invite new ones and remove existing ones.
--
--  New admins join through a one-time invitation: an admin creates an invite
--  and passes on its link; the invitee opens it, chooses their own e-mail and
--  password, and the database grants the role when the code matches. Nobody
--  ever handles another person's password, and the browser never gets a
--  privileged key.
--
--  Everything goes through SECURITY DEFINER functions that check the caller.
--  The tables themselves stay unreachable through the API.

create table public.admin_invites (
  id          uuid primary key default gen_random_uuid(),
  -- Only the SHA-256 of the code is stored; the code itself is shown once.
  code_hash   text not null unique,
  -- Optional: the invite can only be used by the account with this e-mail.
  email       text check (email is null or char_length(email) <= 254),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz
);

create index admin_invites_pending_idx
  on public.admin_invites (expires_at)
  where accepted_at is null;

alter table public.admin_invites enable row level security;
revoke all on table public.admin_invites from anon, authenticated;
grant select, insert, update, delete on table public.admin_invites to service_role;


-- Raises "insufficient privilege" unless the caller is an admin.
create function public.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'admin only' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.require_admin() from public, anon, authenticated;


create function public.hash_invite_code(code text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- Dashes, spaces and letter case in a typed code do not matter.
  select encode(
    sha256(convert_to(upper(regexp_replace(coalesce(code, ''), '[^0-9A-Za-z]', '', 'g')), 'UTF8')),
    'hex'
  );
$$;

revoke all on function public.hash_invite_code(text) from public, anon, authenticated;


-- ── Admins ────────────────────────────────────────────────────────────────

create function public.list_admins()
returns table (
  user_id         uuid,
  email           text,
  added_at        timestamptz,
  last_sign_in_at timestamptz,
  is_self         boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();

  return query
    select a.user_id,
           u.email::text,
           a.created_at,
           u.last_sign_in_at,
           a.user_id = (select auth.uid())
    from public.admin_users a
    join auth.users u on u.id = a.user_id
    order by a.created_at;
end;
$$;

revoke all on function public.list_admins() from public, anon;
grant execute on function public.list_admins() to authenticated;


-- Removes another admin's rights (their account itself is kept, powerless).
-- An admin cannot remove themselves, so the site can never end up without one.
-- Returns 'ok' | 'cannot_remove_self' | 'not_found'.
create function public.remove_admin(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();

  if target = (select auth.uid()) then
    return 'cannot_remove_self';
  end if;

  delete from public.admin_users where user_id = target;
  if not found then
    return 'not_found';
  end if;

  return 'ok';
end;
$$;

revoke all on function public.remove_admin(uuid) from public, anon;
grant execute on function public.remove_admin(uuid) to authenticated;


-- ── Invitations ───────────────────────────────────────────────────────────

-- Creates an invitation and returns its code (XXXX-XXXX-XXXX-XXXX). The code
-- cannot be retrieved again later.
create function public.create_admin_invite(invite_email text default null, valid_days integer default 7)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw  text := upper(substr(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 1, 16));
  days integer := least(greatest(coalesce(valid_days, 7), 1), 30);
begin
  perform public.require_admin();

  insert into public.admin_invites (code_hash, email, created_by, expires_at)
  values (
    public.hash_invite_code(raw),
    nullif(lower(btrim(invite_email)), ''),
    (select auth.uid()),
    now() + make_interval(days => days)
  );

  return substr(raw, 1, 4) || '-' || substr(raw, 5, 4) || '-' || substr(raw, 9, 4) || '-' || substr(raw, 13, 4);
end;
$$;

revoke all on function public.create_admin_invite(text, integer) from public, anon;
grant execute on function public.create_admin_invite(text, integer) to authenticated;


create function public.list_admin_invites()
returns table (
  id         uuid,
  email      text,
  created_at timestamptz,
  expires_at timestamptz,
  is_expired boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();

  -- Open invitations only; used ones show up as admins.
  return query
    select i.id, i.email, i.created_at, i.expires_at, i.expires_at <= now()
    from public.admin_invites i
    where i.accepted_at is null
    order by i.created_at desc;
end;
$$;

revoke all on function public.list_admin_invites() from public, anon;
grant execute on function public.list_admin_invites() to authenticated;


create function public.revoke_admin_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  delete from public.admin_invites where id = invite_id and accepted_at is null;
end;
$$;

revoke all on function public.revoke_admin_invite(uuid) from public, anon;
grant execute on function public.revoke_admin_invite(uuid) to authenticated;


-- Makes the calling (signed-in) user an admin if the code belongs to an open,
-- unexpired invitation. Returns
--   'ok' | 'invalid_code' | 'expired' | 'wrong_email' | 'not_signed_in'
create function public.accept_admin_invite(code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller       uuid := (select auth.uid());
  caller_email text;
  invite       public.admin_invites%rowtype;
begin
  if caller is null then
    return 'not_signed_in';
  end if;

  -- Row lock: one invitation cannot be accepted twice at the same moment.
  select * into invite
  from public.admin_invites
  where code_hash = public.hash_invite_code(code) and accepted_at is null
  for update;

  if not found then
    return 'invalid_code';
  end if;
  if invite.expires_at <= now() then
    return 'expired';
  end if;

  if invite.email is not null then
    select lower(u.email) into caller_email from auth.users u where u.id = caller;
    if caller_email is distinct from invite.email then
      return 'wrong_email';
    end if;
  end if;

  insert into public.admin_users (user_id) values (caller) on conflict (user_id) do nothing;
  update public.admin_invites set accepted_by = caller, accepted_at = now() where id = invite.id;

  return 'ok';
end;
$$;

revoke all on function public.accept_admin_invite(text) from public, anon;
grant execute on function public.accept_admin_invite(text) to authenticated;
