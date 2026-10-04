import type { SiteConfig, StreamerConfig } from './types.ts'

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  STREAMER IDENTITY — the one file to edit when creating a new site
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Safe, typed, non-secret defaults for this deployment's streamer.
 *
 * Resolution order (later wins):
 *   1. this file
 *   2. `VITE_STREAMER_*` environment variables      (see .env.example)
 *   3. the `site_settings` row in the database      (edited in /admin/settings)
 *
 * Do not invent facts here: leave a field empty and it is simply not shown.
 */
export const streamerDefaults: StreamerConfig = {
  name: 'NIMP',
  displayName: 'NIMP',
  tagline: 'Twitch streamer',
  description: '',
  // Neutral placeholder — replace in /admin/settings or via VITE_STREAMER_ABOUT.
  aboutText:
    'Siia tuleb lühike tutvustus: kes striimib, mida ja millal eetris näeb.\n\nSeda teksti saab muuta halduspaneeli seadetes.',
  tags: [],
  image:
    'https://static-cdn.jtvnw.net/jtv_user_pictures/3e941dba-810a-4555-b6b6-57c2fa7603e2-profile_image-70x70.png',
  businessEmail: '',
  socials: {
    twitch: 'https://www.twitch.tv/nimp',
    instagram: '',
    youtube: '',
    tiktok: '',
    discord: '',
    facebook: '',
    x: '',
    steam: '',
  },
  heroLead: '',
  twitchCtaTitle: 'Vaata NIMPi live',
  footerText: '',
  theme: {
    primary: '#8f5bff',
    accent: '#c6f432',
    background: '#0b0a10',
    surface: '#15131d',
    text: '#f3f1f8',
  },
  // Home-page order. "calendar" directly followed by "upcoming" renders the
  // month grid and the upcoming list side by side.
  sections: [
    { id: 'about', visible: true },
    { id: 'offers', visible: true },
    { id: 'calendar', visible: true },
    { id: 'upcoming', visible: true },
    { id: 'twitch', visible: true },
    { id: 'collaboration', visible: true },
  ],
  twitchEmbed: true,
  siteUrl: '',
  headerAction: 'twitch',
  heroButtons: { twitch: true, collaboration: true },
  heroTeasers: { offers: true, nextEvent: true },
}

export const siteDefaults: SiteConfig = {
  url: '',
  timeZone: 'Europe/Tallinn',
}
