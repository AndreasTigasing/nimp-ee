/*
 * Builds a ready-to-install package in ./release:
 *
 *   release/site/          the pre-built website — upload its CONTENTS to the web root
 *   release/database.sql   the whole database schema, to paste into Supabase's SQL Editor
 *   release/PAIGALDUS.md   step-by-step installation guide
 *   release/streamer-site-<version>.zip   all of the above in one file
 *
 * The site is built WITHOUT any Supabase address: the installer fills in
 * site/config.js on the server. Nothing project-specific or secret is baked in.
 *
 *   npm run package
 */
import { execSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const release = join(root, 'release')
const site = join(release, 'site')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const run = (command, env = {}) =>
  execSync(command, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } })

rmSync(release, { recursive: true, force: true })
mkdirSync(release, { recursive: true })

// 1. Website. Empty values override anything in .env.local, so the local
//    development database can never leak into the package. Served from "/".
console.log('› Building the website…')
run('npx tsc -b')
run(`npx vite build --outDir "${site}" --emptyOutDir`, {
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
  VITE_TWITCH_STATUS_URL: '',
  VITE_BASE_PATH: '',
  VITE_SITE_URL: '',
})
// The pristine template, in case a filled-in config.js exists in public/.
copyFileSync(join(root, 'public', 'config.js'), join(site, 'config.js'))
rmSync(join(site, 'CNAME'), { force: true })

// 2. Database: every migration, in order, as one file.
console.log('› Collecting the database schema…')
const migrations = join(root, 'supabase', 'migrations')
const sql = readdirSync(migrations)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => `-- ▶ ${file}\n\n${readFileSync(join(migrations, file), 'utf8').trim()}\n`)
writeFileSync(
  join(release, 'database.sql'),
  `-- Streamer site ${version} — complete database schema.\n` +
    '-- Run ONCE on a new Supabase project: Dashboard → SQL Editor → paste → Run.\n\n' +
    sql.join('\n\n'),
)

// 3. Guide.
copyFileSync(join(root, 'docs', 'PAIGALDUS.md'), join(release, 'PAIGALDUS.md'))

// 4. One zip. `tar -a` picks the format from the extension (built into
//    Windows 10+, macOS and BSD; GNU tar on Linux cannot write zip files).
const zip = `streamer-site-${version}.zip`
try {
  execSync(`tar -a -cf "${zip}" site database.sql PAIGALDUS.md`, { cwd: release, stdio: 'ignore' })
} catch {
  console.log('  (could not create the zip with tar — the release folder itself is complete)')
}

console.log(`\n✓ Package ready in ${release}`)
for (const entry of ['site', 'database.sql', 'PAIGALDUS.md', zip]) {
  if (existsSync(join(release, entry))) console.log(`    ${entry}`)
}
