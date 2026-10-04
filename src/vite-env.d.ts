/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SITE_URL?: string
  readonly VITE_SITE_TIMEZONE?: string
  readonly VITE_BASE_PATH?: string
  readonly VITE_TWITCH_STATUS_URL?: string
  readonly VITE_STREAMER_NAME?: string
  readonly VITE_STREAMER_DISPLAY_NAME?: string
  readonly VITE_STREAMER_TAGLINE?: string
  readonly VITE_STREAMER_DESCRIPTION?: string
  readonly VITE_STREAMER_ABOUT?: string
  readonly VITE_STREAMER_TAGS?: string
  readonly VITE_STREAMER_IMAGE?: string
  readonly VITE_STREAMER_BUSINESS_EMAIL?: string
  readonly VITE_STREAMER_TWITCH_URL?: string
  readonly VITE_STREAMER_INSTAGRAM_URL?: string
  readonly VITE_STREAMER_YOUTUBE_URL?: string
  readonly VITE_STREAMER_TIKTOK_URL?: string
  readonly VITE_STREAMER_DISCORD_URL?: string
  readonly VITE_STREAMER_FACEBOOK_URL?: string
  readonly VITE_STREAMER_X_URL?: string
  readonly VITE_STREAMER_STEAM_URL?: string
  readonly VITE_STREAMER_HERO_LEAD?: string
  readonly VITE_STREAMER_TWITCH_CTA_TITLE?: string
  readonly VITE_STREAMER_FOOTER_TEXT?: string
  readonly VITE_STREAMER_THEME_PRIMARY?: string
  readonly VITE_STREAMER_THEME_ACCENT?: string
  readonly VITE_STREAMER_THEME_BACKGROUND?: string
  readonly VITE_STREAMER_THEME_SURFACE?: string
  readonly VITE_STREAMER_THEME_TEXT?: string
}

interface Window {
  /** Runtime configuration from /config.js (see public/config.js). */
  __STREAMER_SITE__?: {
    supabaseUrl?: string
    supabaseAnonKey?: string
    twitchStatusUrl?: string
  }
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
