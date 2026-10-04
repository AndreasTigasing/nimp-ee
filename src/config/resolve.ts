import { siteDefaults, streamerDefaults } from './streamer.defaults.ts'
import { mergePalette } from './theme.ts'
import type { ResolvedConfig, SiteConfig, StreamerConfig } from './types.ts'

/*
 * Pure env → config resolver. It is imported both by the app (with
 * `import.meta.env`) and by `vite.config.ts` (with `loadEnv`), so build-time
 * SEO tags and the runtime UI can never disagree. Keep it free of DOM access,
 * `import.meta.env` and path aliases.
 */

export type EnvRecord = Record<string, unknown>

/** Returns the trimmed value, or undefined when the variable is missing or blank. */
function read(env: EnvRecord, key: string): string | undefined {
  const value = env[key]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function readList(env: EnvRecord, key: string): string[] | undefined {
  return read(env, key)
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

/** Allows writing paragraph breaks as a literal `\n` inside a single-line env value. */
function readMultiline(env: EnvRecord, key: string): string | undefined {
  return read(env, key)?.replaceAll('\\n', '\n')
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone })
    return true
  } catch {
    return false
  }
}

export function resolveStreamerConfig(
  env: EnvRecord,
  defaults: StreamerConfig = streamerDefaults,
): StreamerConfig {
  const name = read(env, 'VITE_STREAMER_NAME')
  const displayName = read(env, 'VITE_STREAMER_DISPLAY_NAME')
  const identityOverridden = Boolean(name ?? displayName)

  return {
    name: name ?? displayName ?? defaults.name,
    displayName: displayName ?? name ?? defaults.displayName,
    tagline: read(env, 'VITE_STREAMER_TAGLINE') ?? defaults.tagline,
    description: read(env, 'VITE_STREAMER_DESCRIPTION') ?? defaults.description,
    aboutText: readMultiline(env, 'VITE_STREAMER_ABOUT') ?? defaults.aboutText,
    tags: readList(env, 'VITE_STREAMER_TAGS') ?? defaults.tags,
    image: read(env, 'VITE_STREAMER_IMAGE') ?? defaults.image,
    businessEmail: read(env, 'VITE_STREAMER_BUSINESS_EMAIL') ?? defaults.businessEmail,
    socials: {
      twitch: read(env, 'VITE_STREAMER_TWITCH_URL') ?? defaults.socials.twitch,
      instagram: read(env, 'VITE_STREAMER_INSTAGRAM_URL') ?? defaults.socials.instagram,
      youtube: read(env, 'VITE_STREAMER_YOUTUBE_URL') ?? defaults.socials.youtube,
      tiktok: read(env, 'VITE_STREAMER_TIKTOK_URL') ?? defaults.socials.tiktok,
      discord: read(env, 'VITE_STREAMER_DISCORD_URL') ?? defaults.socials.discord,
      facebook: read(env, 'VITE_STREAMER_FACEBOOK_URL') ?? defaults.socials.facebook,
      x: read(env, 'VITE_STREAMER_X_URL') ?? defaults.socials.x,
      steam: read(env, 'VITE_STREAMER_STEAM_URL') ?? defaults.socials.steam,
    },
    // The default heading contains the default streamer's name in a declined
    // form, so it must not leak onto a site whose name was changed via env only.
    heroLead: read(env, 'VITE_STREAMER_HERO_LEAD') ?? defaults.heroLead,
    twitchCtaTitle:
      read(env, 'VITE_STREAMER_TWITCH_CTA_TITLE') ??
      (identityOverridden ? '' : defaults.twitchCtaTitle),
    footerText: readMultiline(env, 'VITE_STREAMER_FOOTER_TEXT') ?? defaults.footerText,
    theme: mergePalette(defaults.theme, {
      primary: read(env, 'VITE_STREAMER_THEME_PRIMARY'),
      accent: read(env, 'VITE_STREAMER_THEME_ACCENT'),
      background: read(env, 'VITE_STREAMER_THEME_BACKGROUND'),
      surface: read(env, 'VITE_STREAMER_THEME_SURFACE'),
      text: read(env, 'VITE_STREAMER_THEME_TEXT'),
    }),
    sections: defaults.sections,
    twitchEmbed: defaults.twitchEmbed,
    siteUrl: defaults.siteUrl,
    headerAction: defaults.headerAction,
    heroButtons: defaults.heroButtons,
    heroTeasers: defaults.heroTeasers,
  }
}

export function resolveSiteConfig(env: EnvRecord, defaults: SiteConfig = siteDefaults): SiteConfig {
  const timeZone = read(env, 'VITE_SITE_TIMEZONE')
  return {
    url: (read(env, 'VITE_SITE_URL') ?? defaults.url).replace(/\/+$/, ''),
    timeZone: timeZone && isValidTimeZone(timeZone) ? timeZone : defaults.timeZone,
  }
}

export function resolveConfig(env: EnvRecord): ResolvedConfig {
  return {
    streamer: resolveStreamerConfig(env),
    site: resolveSiteConfig(env),
  }
}

/** Normalises a Vite `base` value: always starts and ends with a slash. */
export function normalizeBasePath(value: string | undefined): string {
  const trimmed = (value ?? '').trim().replace(/^\/+|\/+$/g, '')
  return trimmed === '' ? '/' : `/${trimmed}/`
}
