/*
 * Export / import the site content as one portable config file.
 *
 *   node scripts/site-config.mjs export <file.json>
 *   node scripts/site-config.mjs import <file.json> [--replace]
 *
 * The file holds the admin settings, all offers and all calendar events.
 * Uploaded images are saved next to it in a `media/` folder and referenced as
 * `media://<path>`, so the file does not depend on any particular Supabase
 * project: on import the images are uploaded to the target project's `media`
 * bucket and the references become that project's URLs.
 *
 * Not included on purpose: contact submissions (personal data) and admin users.
 *
 * Connection: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY environment variables.
 * Without them the local stack (`npx supabase start`) is used. The service-role
 * key bypasses Row Level Security — use it only on your own machine and never
 * put it in a VITE_* variable or commit it.
 *
 * Import is additive by default: settings are overwritten, offers and events
 * are inserted or updated by id, and nothing else is touched. With --replace,
 * offers and events that are not in the file are deleted first.
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const FORMAT = 'streamer-site-config'
const VERSION = 1
const BUCKET = 'media'
const MEDIA_SCHEME = 'media://'

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

function localStatus() {
  try {
    const raw = execSync('npx supabase status -o json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return JSON.parse(raw.slice(raw.indexOf('{')))
  } catch {
    return {}
  }
}

function connect() {
  const status = process.env.SUPABASE_URL ? {} : localStatus()
  const url = (process.env.SUPABASE_URL ?? status.API_URL ?? '').replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? status.SERVICE_ROLE_KEY
  if (!url || !key) {
    fail(
      'No database connection. Start the local stack (npx supabase start) or set ' +
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return { client, url, mediaPrefix: `${url}/storage/v1/object/public/${BUCKET}/` }
}

/** Applies `mapString` to every string inside a JSON-like value. */
function mapStrings(value, mapString) {
  if (typeof value === 'string') return mapString(value)
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, mapString))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, mapStrings(item, mapString)]),
    )
  }
  return value
}

function unwrap({ data, error }, what) {
  if (error) fail(`${what} failed: ${error.message}`)
  return data
}

// ── export ────────────────────────────────────────────────────────────────

async function exportConfig(file) {
  const { client, url, mediaPrefix } = connect()
  const directory = dirname(resolve(file))

  const settingsRow = unwrap(
    await client.from('site_settings').select('*').single(),
    'Reading settings',
  )
  // Server-managed columns are not part of the configuration.
  const { id: _id, updated_at: _updatedAt, ...settings } = settingsRow
  const stripTimestamps = ({ created_at: _created, updated_at: _updated, ...row }) => row

  const offers = unwrap(
    await client.from('offers').select('*').order('sort_order').order('created_at'),
    'Reading offers',
  ).map(stripTimestamps)
  const calendarEvents = unwrap(
    await client.from('calendar_events').select('*').order('start_at'),
    'Reading calendar events',
  ).map(stripTimestamps)

  // Replace this project's storage URLs with portable media:// references
  // and download each referenced image.
  const mediaPaths = new Set()
  const portable = mapStrings({ settings, offers, calendarEvents }, (text) => {
    if (!text.startsWith(mediaPrefix)) return text
    const path = decodeURIComponent(text.slice(mediaPrefix.length))
    mediaPaths.add(path)
    return `${MEDIA_SCHEME}${path}`
  })

  for (const path of mediaPaths) {
    const response = await fetch(`${mediaPrefix}${path}`)
    if (!response.ok) fail(`Downloading ${path} failed: HTTP ${response.status}`)
    const target = join(directory, 'media', path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, Buffer.from(await response.arrayBuffer()))
  }

  const config = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    ...portable,
  }
  mkdirSync(directory, { recursive: true })
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`)

  console.log(`Exported from ${url}`)
  console.log(`  settings: 1, offers: ${offers.length}, calendar events: ${calendarEvents.length}`)
  console.log(`  images:   ${mediaPaths.size} → ${join(directory, 'media')}`)
  console.log(`  file:     ${resolve(file)}`)
}

// ── import ────────────────────────────────────────────────────────────────

async function importConfig(file, { replace }) {
  const directory = dirname(resolve(file))
  let config
  try {
    config = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    fail(`Cannot read ${file}: ${error.message}`)
  }
  if (config.format !== FORMAT) fail(`${file} is not a ${FORMAT} file.`)
  if (config.version > VERSION) fail(`${file} was made by a newer version of this script.`)

  const { client, url, mediaPrefix } = connect()

  // Upload every referenced image, then point the references at this project.
  const mediaPaths = new Set()
  mapStrings(config, (text) => {
    if (text.startsWith(MEDIA_SCHEME)) mediaPaths.add(text.slice(MEDIA_SCHEME.length))
    return text
  })
  for (const path of mediaPaths) {
    let bytes
    try {
      bytes = readFileSync(join(directory, 'media', path))
    } catch {
      fail(`Image missing next to the config file: media/${path}`)
    }
    const contentType = CONTENT_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream'
    const { error } = await client.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType, upsert: true })
    if (error) fail(`Uploading ${path} failed: ${error.message}`)
  }

  const {
    settings,
    offers = [],
    calendarEvents = [],
  } = mapStrings(
    { settings: config.settings, offers: config.offers, calendarEvents: config.calendarEvents },
    (text) =>
      text.startsWith(MEDIA_SCHEME)
        ? `${mediaPrefix}${text.slice(MEDIA_SCHEME.length).split('/').map(encodeURIComponent).join('/')}`
        : text,
  )

  if (settings) {
    unwrap(
      await client.from('site_settings').update(settings).eq('id', true).select(),
      'Writing settings',
    )
  }

  if (replace) {
    const keep = (rows) => `(${rows.map((row) => `"${row.id}"`).join(',')})`
    for (const [table, rows] of [
      ['offers', offers],
      ['calendar_events', calendarEvents],
    ]) {
      const query = client.from(table).delete()
      // Rows that are in the file are kept and updated below.
      const scoped =
        rows.length > 0 ? query.not('id', 'in', keep(rows)) : query.not('id', 'is', null)
      unwrap(await scoped.select('id'), `Clearing ${table}`)
    }
  }

  if (offers.length > 0)
    unwrap(await client.from('offers').upsert(offers).select('id'), 'Writing offers')
  if (calendarEvents.length > 0) {
    unwrap(
      await client.from('calendar_events').upsert(calendarEvents).select('id'),
      'Writing calendar events',
    )
  }

  console.log(`Imported into ${url}${replace ? ' (replace mode)' : ''}`)
  console.log(
    `  settings: ${settings ? 1 : 0}, offers: ${offers.length}, calendar events: ${calendarEvents.length}`,
  )
  console.log(`  images:   ${mediaPaths.size} uploaded`)
}

// ── command line ──────────────────────────────────────────────────────────

const [command, file, ...flags] = process.argv.slice(2)

if (command === 'export' && file) {
  await exportConfig(file)
} else if (command === 'import' && file) {
  await importConfig(file, { replace: flags.includes('--replace') })
} else {
  fail(
    'Usage:\n' +
      '  node scripts/site-config.mjs export <file.json>\n' +
      '  node scripts/site-config.mjs import <file.json> [--replace]',
  )
}
