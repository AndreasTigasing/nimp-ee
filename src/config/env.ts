/*
 * Deployment environment. Everything here is PUBLIC: it is either inlined into
 * the JavaScript bundle (`VITE_*` variables) or served as a plain file
 * (`config.js`). Never put a secret (for example the Supabase service-role
 * key) in either place.
 *
 * Two sources, the first non-empty one wins:
 *   1. `config.js` next to index.html — editable on the web server without a
 *      rebuild (used by the pre-built package)
 *   2. `VITE_*` variables at build time (used by the GitHub Actions workflow
 *      and local development)
 */

function read(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

const runtime = window.__STREAMER_SITE__ ?? {}

const supabaseUrl = (read(runtime.supabaseUrl) || read(import.meta.env.VITE_SUPABASE_URL)).replace(
  /\/+$/,
  '',
)
const supabaseAnonKey =
  read(runtime.supabaseAnonKey) || read(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const env = {
  supabaseUrl,
  /** Public anon / publishable key. Access is restricted by Row Level Security. */
  supabaseAnonKey,
  isSupabaseConfigured: supabaseUrl !== '' && supabaseAnonKey !== '',
  /** Optional endpoint of the Twitch live-status module. Empty = module disabled. */
  twitchStatusUrl: read(runtime.twitchStatusUrl) || read(import.meta.env.VITE_TWITCH_STATUS_URL),
  /** Public Supabase Storage bucket used for admin image uploads. */
  mediaBucket: 'media',
} as const
