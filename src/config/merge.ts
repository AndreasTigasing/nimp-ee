import type { SiteSettings } from '@/types/database'
import { resolveSections } from './sections'
import { mergePalette } from './theme'
import { HEADER_ACTIONS, type HeaderAction, type StreamerConfig } from './types'

function isHeaderAction(value: unknown): value is HeaderAction {
  return typeof value === 'string' && (HEADER_ACTIONS as readonly string[]).includes(value)
}

function pick(value: string | null | undefined, fallback: string): string {
  return value && value.trim() !== '' ? value.trim() : fallback
}

/**
 * Final configuration layer: overlays the admin-editable database settings on
 * top of the build-time (defaults + env) configuration. A NULL / empty column
 * means "keep the build-time value".
 */
export function applySiteSettings(
  base: StreamerConfig,
  settings: SiteSettings | null,
): StreamerConfig {
  if (!settings) return base

  return {
    ...base,
    // A display name set in the admin panel renames the whole site.
    name: pick(settings.display_name, base.name),
    displayName: pick(settings.display_name, base.displayName),
    tagline: pick(settings.tagline, base.tagline),
    aboutText: pick(settings.about_text, base.aboutText),
    tags: settings.tags && settings.tags.length > 0 ? settings.tags : base.tags,
    image: pick(settings.profile_image_url, base.image),
    businessEmail: pick(settings.business_email, base.businessEmail),
    socials: {
      twitch: pick(settings.twitch_url, base.socials.twitch),
      instagram: pick(settings.instagram_url, base.socials.instagram),
      youtube: pick(settings.youtube_url, base.socials.youtube),
      tiktok: pick(settings.tiktok_url, base.socials.tiktok),
      discord: pick(settings.discord_url, base.socials.discord),
      facebook: pick(settings.facebook_url, base.socials.facebook),
      x: pick(settings.x_url, base.socials.x),
      steam: pick(settings.steam_url, base.socials.steam),
    },
    heroLead: pick(settings.hero_lead, base.heroLead),
    twitchCtaTitle: pick(
      settings.twitch_cta_title,
      // The build-time heading may contain the old name — drop it on rename.
      settings.display_name ? '' : base.twitchCtaTitle,
    ),
    footerText: pick(settings.footer_text, base.footerText),
    theme: mergePalette(base.theme, {
      primary: settings.theme_primary,
      accent: settings.theme_accent,
      background: settings.theme_background,
      surface: settings.theme_surface,
      text: settings.theme_text,
    }),
    sections: resolveSections(base.sections, settings.section_order, settings.hidden_sections),
    twitchEmbed: settings.twitch_embed_enabled ?? base.twitchEmbed,
    siteUrl: pick(settings.site_url, base.siteUrl).replace(/\/+$/, ''),
    headerAction: isHeaderAction(settings.header_action)
      ? settings.header_action
      : base.headerAction,
    heroButtons: {
      twitch: settings.hero_show_twitch_button ?? base.heroButtons.twitch,
      collaboration: settings.hero_show_collab_button ?? base.heroButtons.collaboration,
    },
    heroTeasers: {
      offers: settings.hero_show_offers ?? base.heroTeasers.offers,
      nextEvent: settings.hero_show_next_event ?? base.heroTeasers.nextEvent,
    },
  }
}
