-- ═════════════════════════════════════════════════════════════════════════
--  Streamer Site Template — initial schema
-- ═════════════════════════════════════════════════════════════════════════
--  Tables:  admin_users, site_settings, offers, calendar_events,
--           contact_submissions, contact_rate_log
--  View:    live_offers
--  Storage: public bucket "media" (admin image uploads)
--
--  Security model
--    * Row Level Security is enabled on every table.
--    * Table privileges are granted explicitly (least privilege) instead of
--      relying on Supabase's permissive defaults; RLS is the second layer.
--    * "Admin" = an authenticated user whose id is listed in admin_users.
--      Admins are added with SQL only (see README) — never from the browser.
-- ═════════════════════════════════════════════════════════════════════════


-- ── Shared types ──────────────────────────────────────────────────────────

-- Only http(s) links may be stored: blocks javascript:, data: and friends
-- from ever reaching an href / src on the public site.
create domain public.http_url as text
  check (value ~* '^https?://[^[:space:]]+$' and char_length(value) <= 2048);

create domain public.hex_color as text
  check (value ~* '^#[0-9a-f]{6}$');


-- ── Shared trigger: keep updated_at current ───────────────────────────────

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ── Admins ────────────────────────────────────────────────────────────────

create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Users allowed to manage the site. Rows are managed with SQL only (no API write access).';

alter table public.admin_users enable row level security;

-- SECURITY DEFINER so policies on other tables can consult admin_users
-- without giving anyone direct read access to the whole table.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

comment on function public.is_admin() is
  'True when the calling user is listed in admin_users. Used by RLS policies and the admin UI.';

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "admin_users: users can read their own row"
  on public.admin_users for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;


-- ── Site settings (single row) ────────────────────────────────────────────
-- Admin-editable public content. Every column is nullable: NULL means "use
-- the value from the code / environment configuration". No secrets here —
-- the whole row is world-readable.

create table public.site_settings (
  id                boolean primary key default true check (id),
  display_name      text check (char_length(display_name) <= 80),
  tagline           text check (char_length(tagline) <= 160),
  about_text        text check (char_length(about_text) <= 4000),
  tags              text[] check (cardinality(tags) <= 12),
  profile_image_url public.http_url,
  business_email    text check (
                      business_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
                      and char_length(business_email) <= 254
                    ),
  twitch_url        public.http_url,
  instagram_url     public.http_url,
  youtube_url       public.http_url,
  tiktok_url        public.http_url,
  discord_url       public.http_url,
  twitch_cta_title  text check (char_length(twitch_cta_title) <= 120),
  footer_text       text check (char_length(footer_text) <= 1000),
  theme_primary     public.hex_color,
  theme_accent      public.hex_color,
  theme_background  public.hex_color,
  theme_surface     public.hex_color,
  theme_text        public.hex_color,
  updated_at        timestamptz not null default now()
);

comment on table public.site_settings is
  'Singleton row of admin-editable public content. NULL = fall back to code/env configuration.';

insert into public.site_settings (id) values (true);

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

create policy "site_settings: anyone can read"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "site_settings: admins can update"
  on public.site_settings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- No insert / delete: the single row always exists.
revoke all on table public.site_settings from anon, authenticated;
grant select on table public.site_settings to anon, authenticated;
grant update on table public.site_settings to authenticated;


-- ── Offers ────────────────────────────────────────────────────────────────

create table public.offers (
  id                uuid primary key default gen_random_uuid(),
  title             text not null check (char_length(btrim(title)) between 1 and 120),
  brand_name        text not null check (char_length(btrim(brand_name)) between 1 and 80),
  brand_logo        public.http_url,
  short_description text check (char_length(short_description) <= 280),
  description       text check (char_length(description) <= 4000),
  image             public.http_url,
  cta_text          text check (char_length(cta_text) <= 40),
  cta_url           public.http_url,
  promo_code        text check (char_length(promo_code) <= 40),
  terms             text check (char_length(terms) <= 4000),
  valid_from        timestamptz,
  valid_until       timestamptz,
  -- Admin override: keep showing the offer after valid_until has passed.
  show_after_expiry boolean not null default false,
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  -- Soft delete. Archived offers are never public but can be restored.
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint offers_valid_range check (
    valid_from is null or valid_until is null or valid_until > valid_from
  )
);

create index offers_public_listing_idx
  on public.offers (sort_order, created_at desc)
  where is_active and archived_at is null;

create index offers_admin_listing_idx
  on public.offers (archived_at, sort_order, created_at desc);

create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

alter table public.offers enable row level security;

-- The single definition of "live": active, not archived, started, and not
-- expired (unless the admin opted to keep it visible). Enforced by the
-- database, so an expired offer cannot be fetched even with a hand-written
-- API request.
create policy "offers: anyone can read live offers"
  on public.offers for select
  to anon, authenticated
  using (
    is_active
    and archived_at is null
    and (valid_from is null or valid_from <= now())
    and (show_after_expiry or valid_until is null or valid_until > now())
  );

create policy "offers: admins have full access"
  on public.offers for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on table public.offers from anon, authenticated;
grant select on table public.offers to anon, authenticated;
grant insert, update, delete on table public.offers to authenticated;

-- What the public site queries. Repeats the "live" rule so that a signed-in
-- admin browsing the public site sees exactly what visitors see.
-- security_invoker: the caller's RLS still applies.
create view public.live_offers
with (security_invoker = true)
as
  select *
  from public.offers
  where is_active
    and archived_at is null
    and (valid_from is null or valid_from <= now())
    and (show_after_expiry or valid_until is null or valid_until > now());

revoke all on table public.live_offers from anon, authenticated;
grant select on table public.live_offers to anon, authenticated;


-- ── Calendar events ───────────────────────────────────────────────────────
-- Timestamps are stored in UTC (timestamptz); the UI converts to the site
-- time zone (Europe/Tallinn by default).

create table public.calendar_events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(btrim(title)) between 1 and 120),
  description  text check (char_length(description) <= 2000),
  brand_name   text check (char_length(brand_name) <= 80),
  brand_logo   public.http_url,
  event_type   text not null default 'stream'
               check (event_type in ('stream', 'giveaway', 'tournament', 'special', 'other')),
  start_at     timestamptz not null,
  end_at       timestamptz,
  color        public.hex_color,
  is_sponsored boolean not null default false,
  cta_url      public.http_url,
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint calendar_events_time_range check (end_at is null or end_at >= start_at)
);

create index calendar_events_public_idx
  on public.calendar_events (start_at)
  where is_visible;

create index calendar_events_start_idx
  on public.calendar_events (start_at);

create trigger calendar_events_set_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

alter table public.calendar_events enable row level security;

create policy "calendar_events: anyone can read visible events"
  on public.calendar_events for select
  to anon, authenticated
  using (is_visible);

create policy "calendar_events: admins have full access"
  on public.calendar_events for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on table public.calendar_events from anon, authenticated;
grant select on table public.calendar_events to anon, authenticated;
grant insert, update, delete on table public.calendar_events to authenticated;


-- ── Contact submissions ───────────────────────────────────────────────────

create table public.contact_submissions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 2 and 120),
  company    text check (char_length(company) <= 160),
  email      text not null check (
               email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
               and char_length(email) <= 254
             ),
  message    text not null check (char_length(btrim(message)) between 10 and 4000),
  status     text not null default 'new' check (status in ('new', 'read', 'archived')),
  notes      text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contact_submissions_status_idx
  on public.contact_submissions (status, created_at desc);

create index contact_submissions_created_idx
  on public.contact_submissions (created_at desc);

-- Supports the per-sender rate limit below.
create index contact_submissions_email_idx
  on public.contact_submissions (email, created_at desc);

create trigger contact_submissions_set_updated_at
  before update on public.contact_submissions
  for each row execute function public.set_updated_at();

alter table public.contact_submissions enable row level security;

create policy "contact_submissions: anyone can submit"
  on public.contact_submissions for insert
  to anon, authenticated
  with check (status = 'new' and notes is null);

create policy "contact_submissions: admins can read"
  on public.contact_submissions for select
  to authenticated
  using ((select public.is_admin()));

create policy "contact_submissions: admins can update"
  on public.contact_submissions for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "contact_submissions: admins can delete"
  on public.contact_submissions for delete
  to authenticated
  using ((select public.is_admin()));

-- Column-level grants: visitors can only supply the four form fields, so
-- id / status / notes / timestamps always take their defaults. Admins can only
-- change status and notes — never rewrite what the sender wrote.
revoke all on table public.contact_submissions from anon, authenticated;
grant insert (name, company, email, message) on table public.contact_submissions to anon, authenticated;
grant select, delete on table public.contact_submissions to authenticated;
grant update (status, notes) on table public.contact_submissions to authenticated;


-- ── Contact form rate limiting ────────────────────────────────────────────
-- A static site has no server of its own, so abuse protection lives in the
-- database. Limits per rolling hour:
--     3  per e-mail address
--     5  per client IP (best effort, from the API gateway's headers)
--    40  in total (circuit breaker against distributed spam)
-- When a limit is hit the API answers HTTP 429.

create table public.contact_rate_log (
  id          bigint generated always as identity primary key,
  -- SHA-256 of the client IP: a pseudonymous key, purged after 24 hours.
  fingerprint text not null,
  created_at  timestamptz not null default now()
);

create index contact_rate_log_lookup_idx
  on public.contact_rate_log (fingerprint, created_at desc);

-- RLS on with no policies and no grants: reachable only from the SECURITY
-- DEFINER trigger below (and the service role).
alter table public.contact_rate_log enable row level security;
revoke all on table public.contact_rate_log from anon, authenticated;

create function public.contact_submissions_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  window_start timestamptz := now() - interval '1 hour';
  headers      json;
  client_ip    text;
  client_key   text;
begin
  new.name    := btrim(new.name);
  new.company := nullif(btrim(new.company), '');
  new.email   := lower(btrim(new.email));
  new.message := btrim(new.message);

  -- Direct database sessions (migrations, seed, SQL editor) are not limited.
  if coalesce((select auth.role()), '') not in ('anon', 'authenticated') then
    return new;
  end if;

  if (
    select count(*) from public.contact_submissions
    where email = new.email and created_at > window_start
  ) >= 3 then
    raise sqlstate 'PT429' using
      message = 'rate_limited',
      detail  = 'Too many submissions from this e-mail address. Try again later.';
  end if;

  if (
    select count(*) from public.contact_submissions
    where created_at > window_start
  ) >= 40 then
    raise sqlstate 'PT429' using
      message = 'rate_limited',
      detail  = 'The contact form is temporarily receiving too many submissions.';
  end if;

  headers   := nullif(current_setting('request.headers', true), '')::json;
  client_ip := nullif(btrim(coalesce(
    headers ->> 'cf-connecting-ip',
    split_part(headers ->> 'x-forwarded-for', ',', 1)
  )), '');

  if client_ip is not null then
    client_key := encode(sha256(convert_to(client_ip, 'UTF8')), 'hex');

    if (
      select count(*) from public.contact_rate_log
      where fingerprint = client_key and created_at > window_start
    ) >= 5 then
      raise sqlstate 'PT429' using
        message = 'rate_limited',
        detail  = 'Too many submissions from this network. Try again later.';
    end if;

    insert into public.contact_rate_log (fingerprint) values (client_key);
    delete from public.contact_rate_log where created_at < now() - interval '24 hours';
  end if;

  return new;
end;
$$;

revoke all on function public.contact_submissions_guard() from public, anon, authenticated;

create trigger contact_submissions_guard
  before insert on public.contact_submissions
  for each row execute function public.contact_submissions_guard();


-- ── Storage: public "media" bucket for admin image uploads ────────────────
-- Files are world-readable through their public URL (they are shown on the
-- public site anyway). Only admins can add, replace or remove files.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "media: admins can list files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

create policy "media: admins can upload files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "media: admins can update files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "media: admins can delete files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));


-- ── Service role ──────────────────────────────────────────────────────────
-- Server-side tooling only (dashboard, scripts, edge functions). It bypasses
-- RLS, and its key must never be shipped to a browser.

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
