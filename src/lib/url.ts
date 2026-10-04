/**
 * Returns the URL only if it is an absolute http(s) link, otherwise undefined.
 *
 * Every database- or config-provided URL passes through this before being
 * used as an `href` / `src`, so a `javascript:` or `data:` value can never be
 * rendered even if it somehow got past the database constraints.
 */
export function safeUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch {
    return undefined
  }
}

/** Human-friendly host for display, e.g. "example.com". */
export function displayHost(value: string | null | undefined): string {
  const url = safeUrl(value)
  if (!url) return ''
  return new URL(url).hostname.replace(/^www\./, '')
}

/** Extracts the channel login from a Twitch URL, e.g. "https://www.twitch.tv/nimp/about" → "nimp". */
export function twitchChannel(value: string | null | undefined): string {
  const url = safeUrl(value)
  if (!url) return ''
  const { hostname, pathname } = new URL(url)
  if (!/(^|\.)twitch\.tv$/i.test(hostname)) return ''
  return pathname.split('/').filter(Boolean)[0]?.toLowerCase() ?? ''
}
