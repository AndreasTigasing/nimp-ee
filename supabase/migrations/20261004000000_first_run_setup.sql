-- ═════════════════════════════════════════════════════════════════════════
--  First-run setup: create the first admin from the website (/admin/setup)
-- ═════════════════════════════════════════════════════════════════════════
--  A static site has no private server-side secret, so without a safeguard
--  whoever opened /admin first could make themselves the admin. The safeguard
--  is a one-time setup code that only the project owner can read (Supabase
--  dashboard → Table Editor → setup_state). It is burned on first use.

create table public.setup_state (
  id           boolean primary key default true check (id),
  -- 12 hex characters, shown to the owner as XXXX-XXXX-XXXX. Empty once used.
  setup_code   text not null,
  completed_at timestamptz
);

comment on table public.setup_state is
  'One-time setup code for creating the first admin. Readable only in the Supabase dashboard.';

-- On a database that already has an admin the setup is marked as done.
insert into public.setup_state (setup_code, completed_at)
select
  upper(substr(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 1, 12)),
  case when exists (select 1 from public.admin_users) then now() end;

-- No policies and no grants: unreachable through the API.
alter table public.setup_state enable row level security;
revoke all on table public.setup_state from anon, authenticated;
grant select, insert, update, delete on table public.setup_state to service_role;


-- True while the site has no admin yet. Reveals nothing else.
create function public.setup_required()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.admin_users);
$$;

revoke all on function public.setup_required() from public;
grant execute on function public.setup_required() to anon, authenticated;


-- Makes the calling (signed-in) user the first admin, if there is none yet
-- and the setup code matches. Returns a status instead of raising, so the UI
-- can show a precise message:
--   'ok' | 'invalid_code' | 'already_done' | 'not_signed_in'
create function public.claim_first_admin(code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller   uuid := (select auth.uid());
  expected text;
begin
  if caller is null then
    return 'not_signed_in';
  end if;

  -- Row lock: two simultaneous claims cannot both succeed.
  select setup_code into expected from public.setup_state where id for update;

  if exists (select 1 from public.admin_users) then
    return 'already_done';
  end if;

  -- Dashes, spaces and letter case in the typed code do not matter.
  if coalesce(expected, '') = ''
     or upper(regexp_replace(coalesce(code, ''), '[^0-9A-Za-z]', '', 'g')) <> expected then
    return 'invalid_code';
  end if;

  insert into public.admin_users (user_id) values (caller);
  update public.setup_state set completed_at = now(), setup_code = '' where id;

  return 'ok';
end;
$$;

revoke all on function public.claim_first_admin(text) from public, anon;
grant execute on function public.claim_first_admin(text) to authenticated;


-- Public address of the site, set in the quick setup. Used for the canonical
-- link when the build itself does not know its URL (pre-built package).
alter table public.site_settings
  add column site_url public.http_url;
