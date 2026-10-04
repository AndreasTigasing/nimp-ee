import { et } from '../locales/et.ts'
import type { SiteConfig, StreamerConfig } from './types.ts'

/*
 * Pure SEO helpers shared by the browser and the Vite build plugin.
 * Keep this file free of DOM access, `import.meta.env` and path aliases.
 */

const TWITCH_PROFILE_IMAGE =
  /^(https:\/\/static-cdn\.jtvnw\.net\/jtv_user_pictures\/.+-profile_image-)\d+x\d+(\.[a-z]+)$/i

export type ProfileImageSize = 70 | 150 | 300 | 600

/**
 * Twitch serves every profile image in several fixed sizes. Given any of those
 * URLs this returns the requested size; any other URL is returned unchanged.
 */
export function profileImageVariant(url: string, size: ProfileImageSize): string {
  return url.replace(TWITCH_PROFILE_IMAGE, `$1${size}x${size}$2`)
}

export type SeoMeta = {
  title: string
  description: string
  siteName: string
  /** Canonical URL, or empty string when the site URL is not configured. */
  url: string
  image: string
  icon: string
  touchIcon: string
  themeColor: string
  sameAs: string[]
}

export function buildSeoMeta(streamer: StreamerConfig, site: SiteConfig): SeoMeta {
  return {
    title: `${streamer.name} – ${et.meta.titleSuffix}`,
    description: streamer.description || et.meta.defaultDescription(streamer.displayName),
    siteName: streamer.name,
    url: site.url ? `${site.url}/` : '',
    image: profileImageVariant(streamer.image, 600),
    icon: profileImageVariant(streamer.image, 70),
    touchIcon: profileImageVariant(streamer.image, 300),
    themeColor: streamer.theme.background,
    sameAs: Object.values(streamer.socials).filter(Boolean),
  }
}

/** schema.org structured data describing the streamer. */
export function buildJsonLd(streamer: StreamerConfig, meta: SeoMeta): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: streamer.displayName,
    description: meta.description,
    image: meta.image,
    ...(meta.url ? { url: meta.url } : {}),
    ...(meta.sameAs.length > 0 ? { sameAs: meta.sameAs } : {}),
  }
}
