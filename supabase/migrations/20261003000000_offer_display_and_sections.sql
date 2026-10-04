-- ═════════════════════════════════════════════════════════════════════════
--  Offer display options, home-page section layout, Twitch live embed switch
-- ═════════════════════════════════════════════════════════════════════════

-- ── Offers ────────────────────────────────────────────────────────────────

alter table public.offers
  -- Small heading above the brand name on the offer card.
  -- NULL = the default text ("Koostööpakkumine").
  add column label text check (char_length(label) <= 40),
  -- Whether the card shows the validity line ("Kehtib kuni …" / "Tähtajatu").
  -- Display only: expiry is enforced regardless.
  add column show_validity boolean not null default true;

-- `select *` in a view is expanded when the view is created, so the view must
-- be re-created to expose the new columns. Grants and RLS behaviour are kept.
create or replace view public.live_offers
with (security_invoker = true)
as
  select *
  from public.offers
  where is_active
    and archived_at is null
    and (valid_from is null or valid_from <= now())
    and (show_after_expiry or valid_until is null or valid_until > now());


-- ── Site settings ─────────────────────────────────────────────────────────

alter table public.site_settings
  -- Order of the home-page sections between the hero and the footer.
  -- NULL = the order from the code configuration. Unknown ids are rejected.
  add column section_order text[] check (
    section_order <@ array['about', 'offers', 'calendar', 'upcoming', 'twitch', 'collaboration']
  ),
  -- Sections that are not shown on the home page.
  add column hidden_sections text[] check (
    hidden_sections <@ array['about', 'offers', 'calendar', 'upcoming', 'twitch', 'collaboration']
  ),
  -- Show the Twitch player on the site while the channel is live.
  -- NULL = the value from the code configuration.
  add column twitch_embed_enabled boolean;
