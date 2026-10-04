-- Facebook, X and Steam links, and switches for the two info cards on the hero image.

alter table public.site_settings
  add column facebook_url public.http_url,
  add column x_url        public.http_url,
  add column steam_url    public.http_url,
  -- "Aktiivseid pakkumisi" / "Järgmisena kalendris" cards over the hero image.
  -- NULL = the value from the code configuration.
  add column hero_show_offers     boolean,
  add column hero_show_next_event boolean;
