import { resolveConfig } from './resolve'

/**
 * Build-time configuration: typed defaults overlaid with `VITE_*` env values.
 *
 * UI components should NOT import `streamerConfig` directly — use the
 * `useSiteConfig()` hook, which additionally applies the admin-editable
 * settings stored in the database.
 */
const resolved = resolveConfig(import.meta.env)

export const streamerConfig = resolved.streamer
export const siteConfig = resolved.site
