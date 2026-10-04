-- What the header shows on the right, and which buttons the hero has.
-- NULL = the value from the code configuration.

alter table public.site_settings
  -- 'twitch'  = the "Vaata Twitchis" button
  -- 'socials' = the social media icons
  -- 'none'    = nothing
  add column header_action text check (header_action in ('twitch', 'socials', 'none')),
  add column hero_show_twitch_button boolean,
  add column hero_show_collab_button boolean;
