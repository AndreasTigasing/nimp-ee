-- ═════════════════════════════════════════════════════════════════════════
--  DEMO DATA — safe to delete
-- ═════════════════════════════════════════════════════════════════════════
--  Clearly fake offers and events so the interface can be tested. Nothing
--  here represents a real partnership. Dates are relative to "now", so the
--  demo always shows upcoming events no matter when it is loaded.
--
--  Loaded automatically by `npx supabase db reset` (local development).
--  For a hosted project run it once from the SQL editor — or skip it.
--
--  Remove all demo rows later with:
--      delete from public.offers          where brand_name like 'Demo%';
--      delete from public.calendar_events where title      like 'Demo%';
-- ═════════════════════════════════════════════════════════════════════════

insert into public.offers
  (title, brand_name, short_description, description, cta_text, cta_url, promo_code, terms,
   valid_from, valid_until, is_active, sort_order)
values
  (
    'Demo koostöö: sooduskood',
    'Demo Brand',
    'See on näidispakkumine. Asenda see halduspaneelis päris pakkumisega.',
    E'See on näidispakkumine, mis näitab, kuidas pakkumise kaart ja detailvaade välja näevad.\n\nPäris pakkumise lisamiseks ava halduspaneel ja vali „Pakkumised“.',
    'Vaata pakkumist',
    'https://example.com/demo-pakkumine',
    'DEMO10',
    'Näidistingimused: pakkumine ei ole päris ega anna mingeid õigusi.',
    now() - interval '1 day',
    now() + interval '45 days',
    true,
    10
  ),
  (
    'Demo koostöö: tähtajatu pakkumine',
    'Demo Partner',
    'Näidis ilma sooduskoodi ja lõpptähtajata.',
    'Näidispakkumine, millel ei ole sooduskoodi ega kehtivusaega.',
    null,
    'https://example.com/demo-partner',
    null,
    null,
    null,
    null,
    true,
    20
  ),
  (
    'Demo koostöö: aegunud pakkumine',
    'Demo Brand',
    'Aegunud näidis – avalikul lehel seda ei kuvata.',
    'See pakkumine on aegunud ja on nähtav ainult halduspaneelis.',
    null,
    'https://example.com/demo-aegunud',
    'DEMOOLD',
    null,
    now() - interval '60 days',
    now() - interval '2 days',
    true,
    30
  );

insert into public.calendar_events
  (title, description, brand_name, event_type, start_at, end_at, is_sponsored, cta_url, is_visible)
values
  (
    'Demo koostööstriim',
    'Näidissündmus: sponsoreeritud striim.',
    'Demo Brand',
    'stream',
    date_trunc('day', now()) + interval '2 days 17 hours',
    date_trunc('day', now()) + interval '2 days 20 hours',
    true,
    'https://example.com/demo-pakkumine',
    true
  ),
  (
    'Demo tavastriim',
    'Näidissündmus: tavaline striim ilma sponsorita.',
    null,
    'stream',
    date_trunc('day', now()) + interval '5 days 16 hours',
    date_trunc('day', now()) + interval '5 days 19 hours',
    false,
    null,
    true
  ),
  (
    'Demo loosimine',
    'Näidissündmus: loosimine vaatajatele.',
    'Demo Partner',
    'giveaway',
    date_trunc('day', now()) + interval '9 days 18 hours',
    date_trunc('day', now()) + interval '9 days 19 hours 30 minutes',
    true,
    null,
    true
  ),
  (
    'Demo eriüritus',
    'Näidissündmus järgmisel kuul.',
    null,
    'special',
    date_trunc('day', now()) + interval '24 days 15 hours',
    date_trunc('day', now()) + interval '24 days 21 hours',
    false,
    null,
    true
  ),
  (
    'Demo peidetud sündmus',
    'Peidetud näidis – avalikul lehel seda ei kuvata.',
    'Demo Brand',
    'stream',
    date_trunc('day', now()) + interval '12 days 17 hours',
    null,
    true,
    null,
    false
  );
