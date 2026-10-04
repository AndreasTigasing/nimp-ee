-- Editable intro sentence under the name in the hero.
-- NULL = the default text from the code configuration / locale.

alter table public.site_settings
  add column hero_lead text check (char_length(hero_lead) <= 400);
