/*
 * OPTIONAL — Twitch live status (Supabase Edge Function, Deno).
 *
 * The website works without this function. Deploy it only if you want the
 * "LIVE" badge. It keeps the Twitch API credentials on the server; the
 * browser only ever sees `{ live, title, game }`.
 *
 *   GET /functions/v1/twitch-status?channel=<login>
 *   → 200 { "live": true,  "title": "…", "game": "…" }
 *   → 200 { "live": false, "title": null, "game": null }
 *
 * Secrets (npx supabase secrets set NAME=value):
 *   TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET   from https://dev.twitch.tv/console
 *   TWITCH_ALLOWED_CHANNELS                  comma-separated logins this
 *                                            function may be asked about
 *   ALLOWED_ORIGIN (optional)                e.g. https://nimp.ee  (default *)
 */

const CLIENT_ID = Deno.env.get('TWITCH_CLIENT_ID') ?? ''
const CLIENT_SECRET = Deno.env.get('TWITCH_CLIENT_SECRET') ?? ''
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'
const ALLOWED_CHANNELS = (Deno.env.get('TWITCH_ALLOWED_CHANNELS') ?? '')
  .split(',')
  .map((channel) => channel.trim().toLowerCase())
  .filter(Boolean)

/** How long one answer is reused, to stay far below Twitch's rate limits. */
const CACHE_SECONDS = 60

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}

type Status = { live: boolean; title: string | null; game: string | null }

let appToken: { value: string; expiresAt: number } | null = null
const cache = new Map<string, { status: Status; expiresAt: number }>()

function json(body: unknown, status = 200, cacheSeconds = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : 'no-store',
    },
  })
}

/** App access token (client-credentials flow), cached until shortly before it expires. */
async function getAppToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && appToken && appToken.expiresAt > Date.now()) return appToken.value

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  })
  if (!response.ok) throw new Error(`Twitch token request failed: ${response.status}`)

  const { access_token, expires_in } = (await response.json()) as {
    access_token: string
    expires_in: number
  }
  appToken = { value: access_token, expiresAt: Date.now() + (expires_in - 300) * 1000 }
  return access_token
}

async function fetchStatus(channel: string): Promise<Status> {
  const request = async (token: string) =>
    await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`, {
      headers: { 'Client-Id': CLIENT_ID, Authorization: `Bearer ${token}` },
    })

  let response = await request(await getAppToken())
  // The token can be revoked before its expiry: refresh once and retry.
  if (response.status === 401) response = await request(await getAppToken(true))
  if (!response.ok) throw new Error(`Twitch streams request failed: ${response.status}`)

  const { data } = (await response.json()) as {
    data: { type: string; title: string; game_name: string }[]
  }
  const stream = data.find((entry) => entry.type === 'live')

  return {
    live: Boolean(stream),
    title: stream?.title ?? null,
    game: stream?.game_name ?? null,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405)

  if (!CLIENT_ID || !CLIENT_SECRET) return json({ error: 'not_configured' }, 503)

  const channel = new URL(request.url).searchParams.get('channel')?.trim().toLowerCase() ?? ''
  if (!/^[a-z0-9_]{3,25}$/.test(channel)) return json({ error: 'invalid_channel' }, 400)

  // Without an allow-list this endpoint would be a free Twitch API proxy for anyone.
  if (!ALLOWED_CHANNELS.includes(channel)) return json({ error: 'channel_not_allowed' }, 403)

  const cached = cache.get(channel)
  if (cached && cached.expiresAt > Date.now()) return json(cached.status, 200, CACHE_SECONDS)

  try {
    const status = await fetchStatus(channel)
    cache.set(channel, { status, expiresAt: Date.now() + CACHE_SECONDS * 1000 })
    return json(status, 200, CACHE_SECONDS)
  } catch (error) {
    console.error(error)
    return json({ error: 'twitch_unavailable' }, 502)
  }
})
