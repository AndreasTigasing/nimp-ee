export const SOCIAL_PLATFORMS = [
  'twitch',
  'instagram',
  'youtube',
  'tiktok',
  'discord',
  'facebook',
  'x',
  'steam',
] as const

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

/**
 * The five colours the whole UI is derived from. Every other shade (borders,
 * muted text, hover states…) is computed from these in `src/index.css`.
 */
export type ThemePalette = {
  /** Brand colour: primary buttons, links, highlights. */
  primary: string
  /** Secondary highlight: sponsored badges, promo codes, live indicator. */
  accent: string
  /** Page background. */
  background: string
  /** Card / panel background. */
  surface: string
  /** Main text colour. */
  text: string
}

/**
 * Home-page sections that can be reordered and hidden (the hero always comes
 * first and the footer last). Must match the CHECK constraints on
 * site_settings.section_order / hidden_sections in the database.
 */
export const SECTION_IDS = [
  'about',
  'offers',
  'calendar',
  'upcoming',
  'twitch',
  'collaboration',
] as const

export type SectionId = (typeof SECTION_IDS)[number]

export type SectionSetting = {
  id: SectionId
  visible: boolean
}

/** What the header shows on its right-hand side. */
export const HEADER_ACTIONS = ['twitch', 'socials', 'none'] as const

export type HeaderAction = (typeof HEADER_ACTIONS)[number]

export type StreamerConfig = {
  /** Short brand name: logo text, page title, copyright line. */
  name: string
  /** Name shown as the hero heading. */
  displayName: string
  /** One-liner under the name, e.g. "Twitch streamer". */
  tagline: string
  /** SEO meta description. Empty = generated from the name. */
  description: string
  /** "About" section body. Paragraphs are separated by blank lines. */
  aboutText: string
  /** Optional topic chips ("what do they stream?"). Empty = hidden. */
  tags: string[]
  /** Profile image URL. */
  image: string
  /** Public business contact e-mail. Empty = hidden. */
  businessEmail: string
  /** Social profile URLs. Empty string = that platform is hidden. */
  socials: Record<SocialPlatform, string>
  /** Intro sentence under the name in the hero. Empty = the default text of the locale. */
  heroLead: string
  /** Heading of the Twitch call-to-action band. Empty = neutral default. */
  twitchCtaTitle: string
  /** Extra free text shown in the footer (disclaimers etc.). */
  footerText: string
  theme: ThemePalette
  /** Home-page sections in display order. Every id appears exactly once. */
  sections: SectionSetting[]
  /**
   * Show the Twitch player on the site while the channel is live. Needs the
   * optional live-status module (VITE_TWITCH_STATUS_URL) to know when that is.
   */
  twitchEmbed: boolean
  /**
   * Public address set in the quick setup, e.g. https://nimp.ee. Only used for
   * the canonical link when the build does not know its own URL. Empty = unset.
   */
  siteUrl: string
  /** Header right-hand side: the Twitch button, the social icons, or nothing. */
  headerAction: HeaderAction
  /** Call-to-action buttons under the hero text. */
  heroButtons: {
    twitch: boolean
    collaboration: boolean
  }
  /** Info cards floating over the hero image. Each is also hidden when it has nothing to show. */
  heroTeasers: {
    /** Number of live offers. */
    offers: boolean
    /** The next calendar event. */
    nextEvent: boolean
  }
}

/** Deployment-level values that are never stored in the database. */
export type SiteConfig = {
  /** Canonical public URL without trailing slash, e.g. https://nimp.ee. Empty in local dev. */
  url: string
  /** IANA time zone every date on the site is displayed in. */
  timeZone: string
}

export type ResolvedConfig = {
  streamer: StreamerConfig
  site: SiteConfig
}
