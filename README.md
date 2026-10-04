# Streamer Site Template

A reusable website for a streamer: **media kit + sponsorship portal + streaming calendar**, with a
protected admin panel. The first deployment is for the Estonian Twitch streamer **NIMP**
([nimp.ee](https://nimp.ee)), but nothing in the application logic is NIMP-specific — a new
streamer site is a matter of configuration and database content, not code changes.

- **Public site** — hero, about, live sponsorship offers, calendar of (sponsored) streams,
  Twitch call-to-action, collaboration form, footer.
- **Admin panel** (`/admin`) — dashboard, offers, calendar, contact submissions, settings
  (texts, social links, colour palette).
- **Hosting** — a static build on GitHub Pages plus Supabase (Postgres, Auth, Storage). No server
  of your own; free tiers are enough.

```
GitHub repository ──► GitHub Actions ──► static Vite build ──► GitHub Pages ──► nimp.ee
                                                │
                              browser ──────────┴──► Supabase (PostgreSQL · Auth · Storage · RLS)
```

## Contents

1. [Tech stack](#1-tech-stack)
2. [Project structure](#2-project-structure)
3. [Local development](#3-local-development)
4. [Creating the Supabase project](#4-creating-the-supabase-project)
5. [Environment variables](#5-environment-variables)
6. [Creating the first admin user](#6-creating-the-first-admin-user)
7. [Deploying with GitHub Actions and GitHub Pages](#7-deploying-with-github-actions-and-github-pages)
8. [Custom domain](#8-custom-domain)
9. [Creating another streamer site from this template](#9-creating-another-streamer-site-from-this-template)
10. [Configuration: code vs environment vs database](#10-configuration-code-vs-environment-vs-database)
11. [Database architecture](#11-database-architecture)
12. [Security considerations](#12-security-considerations)
13. [Optional: Twitch live status](#13-optional-twitch-live-status)
14. [Quality checks and tests](#14-quality-checks-and-tests)
15. [Design decisions](#15-design-decisions)

---

## 1. Tech stack

| Area       | Choice                                                                   |
| ---------- | ------------------------------------------------------------------------ |
| UI         | React 19, TypeScript (strict), Vite 8                                    |
| Styling    | Tailwind CSS 4, palette-driven design tokens, self-hosted variable fonts |
| Routing    | React Router (client-side, `BrowserRouter`)                              |
| Data       | Supabase: PostgreSQL, Auth, Storage, Row Level Security                  |
| Dates      | date-fns + `@date-fns/tz` (everything shown in one fixed time zone)      |
| Icons      | Lucide (UI) + Simple Icons (brand logos)                                 |
| Quality    | ESLint, Prettier, RLS integration test                                   |
| Deployment | GitHub Actions → GitHub Pages                                            |

Requirements: **Node.js 22+**. Docker is only needed if you want a local Supabase stack.

---

## 2. Project structure

```
.
├── .github/workflows/deploy.yml     Build + deploy to GitHub Pages
├── build/streamer-site-plugin.ts    Vite plugin: SEO tags, palette, CSP, 404.html, CNAME, robots, sitemap
├── scripts/test-rls.mjs             Security regression test for the database
├── supabase/
│   ├── migrations/                  Database schema, RLS policies, storage bucket
│   ├── seed.sql                     Clearly-marked demo data (safe to delete)
│   ├── functions/twitch-status/     OPTIONAL edge function (live badge)
│   └── config.toml                  Local Supabase stack configuration
├── src/
│   ├── config/
│   │   ├── streamer.defaults.ts     ★ The streamer's identity — edit this for a new site
│   │   ├── resolve.ts               env → config (shared by the app and the build)
│   │   ├── merge.ts                 config ← admin settings from the database
│   │   ├── theme.ts                 Palette → CSS variables, contrast helpers
│   │   ├── seo.ts                   Title / description / JSON-LD
│   │   └── env.ts                   Supabase URL + key, feature flags
│   ├── locales/et.ts                ★ Every user-facing string (Estonian)
│   ├── lib/                         supabase clients, dates/time zone, errors, validation, URLs
│   ├── services/                    ★ Data layer — the only place that talks to Supabase
│   │   ├── offers.ts  calendar.ts  contact.ts  settings.ts  auth.ts  media.ts
│   ├── types/database.ts            Database types (mirror of the migrations)
│   ├── hooks/                       useAsync, useActiveSection, usePageMeta
│   ├── providers/                   SiteConfigProvider (config + theme at runtime)
│   ├── components/
│   │   ├── ui/                      Button, Field, Dialog, Badge, Toast, states…
│   │   ├── layout/                  Layout, Header, MobileMenu, Footer, Section
│   │   ├── hero/  about/  offers/  calendar/  twitch/  collaboration/  social/
│   ├── modules/twitch-live/         OPTIONAL live-status module
│   ├── admin/                       Admin panel (lazy-loaded chunk)
│   │   ├── AuthProvider, RequireAdmin, LoginPage, AdminLayout, AdminSidebar
│   │   ├── Dashboard, OffersManager, OfferEditor, CalendarManager,
│   │   │   CalendarEventEditor, ContactSubmissions, SettingsManager
│   │   └── components/  hooks/
│   ├── pages/                       HomePage, NotFoundPage
│   ├── index.css                    Design tokens derived from the palette
│   ├── App.tsx  main.tsx
└── .env.example                     All supported environment variables, documented
```

Rules of the codebase:

- UI components never query Supabase directly — they call functions from `src/services`.
- UI components never read `streamerConfig` directly — they use `useSiteConfig()`, which also
  applies the admin's settings.
- No user-facing string is written inline — it lives in `src/locales`.
- No colour is hardcoded — everything derives from the five palette variables.

---

## 3. Local development

```bash
npm install
cp .env.example .env.local      # PowerShell: Copy-Item .env.example .env.local
npm run dev                     # http://localhost:5173
```

> **Windows PowerShell:** if `npm` fails with _"running scripts is disabled on this system"_, call
> the `.cmd` shims instead (`npm.cmd run dev`, `npx.cmd supabase start`), or allow local scripts
> once with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

Without Supabase credentials the site still runs: hero, about, Twitch CTA and footer render
normally, and the offers / calendar / form sections show friendly "unavailable" states.

You have two options for the backend during development.

### Option A — a hosted Supabase project

Follow [section 4](#4-creating-the-supabase-project) and put its URL and anon key into `.env.local`.

### Option B — a local Supabase stack (Docker)

```bash
npx supabase start       # first run downloads the Docker images
npx supabase status      # prints the local API URL and anon key
```

Put the printed values into `.env.local`:

```ini
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<ANON_KEY from `supabase status`>
```

`supabase start` applies the migrations and loads `supabase/seed.sql` (demo data). Useful commands:

```bash
npx supabase db reset    # drop everything, re-apply migrations + seed
npx supabase stop        # stop the stack (data is kept)
```

Local Studio (database UI, user management) runs at <http://127.0.0.1:54323>.

### Scripts

| Command                | What it does                                           |
| ---------------------- | ------------------------------------------------------ |
| `npm run dev`          | Dev server with hot reload                             |
| `npm run build`        | Type-check, then production build into `dist/`         |
| `npm run preview`      | Serve the production build locally                     |
| `npm run typecheck`    | TypeScript only                                        |
| `npm run lint`         | ESLint                                                 |
| `npm run format`       | Prettier (write)                                       |
| `npm run format:check` | Prettier (check only)                                  |
| `npm run test:rls`     | Database security test (needs the local stack running) |

---

## 4. Creating the Supabase project

1. Create a project at <https://supabase.com/dashboard> (the free plan is sufficient). Pick a
   region close to your audience (for Estonia: `eu-north-1` Stockholm or `eu-central-1` Frankfurt).
2. Apply the database schema — either way works:

   **With the CLI (recommended, repeatable):**

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push                  # applies supabase/migrations
   npx supabase db push --include-seed   # optional: also load the demo data
   ```

   **Or by hand:** run `npm run package` and paste the generated `release/database.sql` (all
   migrations in order, as one file) into _SQL Editor_ in the dashboard. Optionally run
   `supabase/seed.sql` afterwards.

3. **Sign-ups:** leave _Authentication → Sign In / Providers → Allow new users to sign up_ **on**
   until you have created the admin account in the first-run setup
   ([section 6](#6-creating-the-first-admin-user)), then turn it **off**. (A registered user who
   is not an admin has no rights anyway: see [security](#12-security-considerations).)
4. Copy the credentials from _Project Settings → API_: the **Project URL** and the
   **anon / publishable key**. Do **not** copy the `service_role` / secret key into this project.

### Removing the demo data

Everything in `seed.sql` is named "Demo …". Delete it in the admin panel, or run:

```sql
delete from public.offers          where brand_name like 'Demo%';
delete from public.calendar_events where title      like 'Demo%';
```

---

## 5. Environment variables

All variables are documented in [`.env.example`](.env.example). The essentials:

| Variable                 | Required | Purpose                                                           |
| ------------------------ | -------- | ----------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | yes      | Supabase project URL                                              |
| `VITE_SUPABASE_ANON_KEY` | yes      | Supabase anon / publishable key (public by design)                |
| `VITE_SITE_URL`          | no       | Canonical URL; set automatically by the deploy workflow           |
| `VITE_BASE_PATH`         | no       | Base path; set automatically by the deploy workflow               |
| `VITE_SITE_TIMEZONE`     | no       | Display time zone, default `Europe/Tallinn`                       |
| `VITE_STREAMER_*`        | no       | Override the streamer identity / palette from `streamer.defaults` |
| `VITE_TWITCH_STATUS_URL` | no       | Enables the optional live badge                                   |

> **Every `VITE_*` value is public.** Vite inlines them into the JavaScript bundle that visitors
> download. Never put a secret in one — in particular not the Supabase `service_role` key, and
> not a Twitch client secret. Hex colours must be quoted in `.env` files (`"#8f5bff"`), because
> an unquoted `#` starts a comment.

- **Locally:** `.env.local` (git-ignored).
- **In CI:** GitHub repository **variables** — see the next sections.

---

## 6. Creating the first admin user

Admins are regular Supabase Auth users whose id is listed in the `admin_users` table.

### First-run setup (the normal way)

While the site has no admin, opening `/admin` shows a quick setup:

1. **Account** — the one-time **setup code**, your e-mail (this is the user name) and a password.
   The code is in the Supabase dashboard: _Table Editor → `setup_state` → `setup_code`_
   (locally: `docker exec supabase_db_streamer-site psql -U postgres -c "select setup_code from setup_state"`).
2. **Site** — name, tagline, business e-mail, Twitch link.
3. **Domain** — the public address, plus the DNS steps for GitHub Pages or your own server.

Why a code: the site is static and public, so without it whoever opened `/admin` first could make
themselves the admin. Only someone with access to the Supabase project can read the code; it is
checked by the database (`claim_first_admin`), works once, and the setup closes for good as soon
as one admin exists. If Supabase asks for e-mail confirmation, click the link in the mail and
press "Loo konto" again (or switch off _Confirm email_ before the setup). Afterwards, turn off
_Allow new users to sign up_.

### Adding further admins, or doing it by hand

`admin_users` cannot be written through the API, so additional admins are added with SQL:

1. Dashboard → _Authentication → Users → Add user_ (tick _Auto Confirm User_).
2. _SQL Editor_:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

To revoke: `delete from public.admin_users where user_id = (select id from auth.users where email = '…');`  
To reset a password: _Authentication → Users → ⋯ → Send password recovery / Update user_.

---

## 7. Deploying with GitHub Actions and GitHub Pages

The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) installs
dependencies, lints, builds and publishes `dist/` to GitHub Pages on every push to `main`.

### 7.1 Push the code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<user>/<repository>.git
git push -u origin main
```

> On the free plan GitHub Pages requires a **public** repository. That is fine for this project:
> the repository contains no secrets (`.env*` files are git-ignored, and the anon key is public
> anyway).

### 7.2 Enable GitHub Pages

Repository → _Settings → Pages → Build and deployment → Source:_ **GitHub Actions**.

### 7.3 Add the configuration

Repository → _Settings → Secrets and variables → Actions → **Variables** → New repository variable_:

| Variable                 | Value                               |
| ------------------------ | ----------------------------------- |
| `VITE_SUPABASE_URL`      | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the anon / publishable key          |

The workflow forwards **every** repository variable whose name starts with `VITE_` to the build,
so any setting from `.env.example` can be added the same way — no workflow edits needed.
They are _variables_, not _secrets_, on purpose: they end up in public JavaScript anyway.

### 7.4 Deploy

Push to `main`, or run the workflow by hand: _Actions → Deploy to GitHub Pages → Run workflow_.
The site appears at `https://<user>.github.io/<repository>/`.

### How the base path is handled

A project site lives under `/<repository>/`, a custom domain under `/`. Nothing is hardcoded:
the workflow asks GitHub (`actions/configure-pages`) where the site will be served and passes
that to Vite as `VITE_BASE_PATH` / `VITE_SITE_URL`. Asset URLs, the router's `basename`,
in-page links, `robots.txt`, the sitemap and canonical tags all follow.

### Deep links (`/admin`) on a static host

GitHub Pages has no rewrite rules, so the build also writes `404.html` as a copy of `index.html`.
A direct visit to `/admin` is answered with that file and the client-side router takes over.
(The HTTP status of that first response is 404; this is invisible to users, and the admin
area is `noindex` anyway.)

### Alternative: a pre-built package for any web server

For installing without a build step — shared hosting, your own server, or handing the site to
someone non-technical:

```bash
npm run package
```

creates `release/` with

| In the package                | Purpose                                                           |
| ----------------------------- | ----------------------------------------------------------------- |
| `site/`                       | The built website. Its contents go to the web root.               |
| `database.sql`                | Every migration as one file, to paste into Supabase's SQL Editor. |
| `PAIGALDUS.md`                | Step-by-step installation guide (Estonian).                       |
| `streamer-site-<version>.zip` | All of the above in one file.                                     |

How it differs from the GitHub Actions build:

- **No project is baked in.** The Supabase URL and anon key are read at runtime from
  `site/config.js`, a plain file the installer edits on the server. (A build made with
  `VITE_SUPABASE_*` variables ignores an empty `config.js`, so both ways coexist.)
- **Served from the domain root.** A sub-folder install needs a build with `VITE_BASE_PATH`.
- **Apache works out of the box** via the bundled `.htaccess`; for Nginx add
  `try_files $uri $uri/ /index.html;`. `404.html` covers GitHub Pages.
- The Content-Security-Policy allows any HTTPS API (the project address is not known at build
  time); the GitHub Actions build restricts it to the configured Supabase origin.

After uploading, the owner opens `/admin` and completes the first-run setup
([section 6](#6-creating-the-first-admin-user)).

---

## 8. Custom domain

Example: `nimp.ee`.

1. **GitHub:** repository → _Settings → Pages → Custom domain_ → enter `nimp.ee` → _Save_.
2. **DNS** at your registrar / DNS host:

   | Type    | Name  | Value                                                                                      |
   | ------- | ----- | ------------------------------------------------------------------------------------------ |
   | `A`     | `@`   | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (four records)  |
   | `AAAA`  | `@`   | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
   | `CNAME` | `www` | `<user>.github.io.`                                                                        |

   Check propagation with `nslookup nimp.ee` (or `dig nimp.ee +short`).

3. Wait for GitHub's DNS check to pass, then tick **Enforce HTTPS** (the certificate is issued
   automatically; it can take up to an hour).
4. **Re-run the deploy workflow** (_Actions → Deploy to GitHub Pages → Run workflow_). The build
   now receives `/` as base path and `https://nimp.ee` as site URL, and emits a matching `CNAME`
   file, canonical URL and sitemap.
5. Recommended: verify the domain for your account (_GitHub → Settings → Pages → Add a domain_)
   so nobody else can claim it, and set _Supabase → Authentication → URL Configuration → Site URL_
   to `https://nimp.ee`.

The domain is **not** stored anywhere in the application code. The `CNAME` file is generated at
build time from the site URL, which in turn comes from the repository's Pages settings.

---

## 9. Creating another streamer site from this template

1. **Copy the repository** — GitHub → _Use this template_ (or fork / clone and push to a new repo).
2. **Create a new Supabase project** and apply the migrations ([section 4](#4-creating-the-supabase-project)).
   One Supabase project per streamer.
3. **Set the identity.** Either edit [`src/config/streamer.defaults.ts`](src/config/streamer.defaults.ts)
   (recommended — typed, reviewed, versioned) **or** set `VITE_STREAMER_*` repository variables
   and leave the file alone.
4. **Add repository variables** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   ([section 7.3](#73-add-the-configuration)).
5. **Enable Pages**, push, and optionally connect a domain ([sections 7](#7-deploying-with-github-actions-and-github-pages)–[8](#8-custom-domain)).
6. **Create the admin user** ([section 6](#6-creating-the-first-admin-user)) and fill in offers,
   events, about text and colours in `/admin`.

### Which values need changing

| What                                    | Where                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| Name, display name, tagline             | `streamer.defaults.ts` / `VITE_STREAMER_NAME`, `…_DISPLAY_NAME`, `…_TAGLINE` |
| Profile image                           | `streamer.defaults.ts` / `VITE_STREAMER_IMAGE`                               |
| Twitch + other social links             | `streamer.defaults.ts` / `VITE_STREAMER_*_URL`                               |
| Business e-mail                         | `streamer.defaults.ts` / `VITE_STREAMER_BUSINESS_EMAIL` / admin              |
| Twitch CTA heading ("Vaata NIMPi live") | `streamer.defaults.ts` / `VITE_STREAMER_TWITCH_CTA_TITLE` / admin            |
| Colour palette (5 colours)              | `streamer.defaults.ts` / `VITE_STREAMER_THEME_*` / admin                     |
| About text, topic tags, footer text     | admin (or defaults / env)                                                    |
| Supabase project                        | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`                                |
| Domain                                  | GitHub Pages settings + DNS                                                  |
| Time zone                               | `VITE_SITE_TIMEZONE` (default `Europe/Tallinn`)                              |
| UI language                             | `src/locales` (see below)                                                    |

**Twitch profile images:** give any size of the Twitch CDN URL (e.g. the `70x70` one); the site
derives the `300x300` / `600x600` variants for the hero and social previews automatically.

**Another language:** copy `src/locales/et.ts` to e.g. `en.ts`, translate the values, and switch
the two exports in `src/locales/index.ts` (strings + date-fns locale). TypeScript flags any
missing key.

**Changing the colour scheme:** change the five palette colours — in `streamer.defaults.ts`, via
`VITE_STREAMER_THEME_*`, or live in _Admin → Seaded → Värvipalett_. Every shade in the UI
(borders, muted text, hover states, button text colour) is computed from those five values in
[`src/index.css`](src/index.css) and [`src/config/theme.ts`](src/config/theme.ts).

**Changing the home-page layout:** the sections between the hero and the footer (about, offers,
calendar, upcoming events, Twitch, collaboration) can be reordered and hidden in
_Admin → Seaded → Avalehe sektsioonid_; the default order lives in `streamer.defaults.ts`.
The navigation and the shortcut links follow automatically. When "Tulekul" directly follows
"Kalender" the two are shown side by side; placed anywhere else, the upcoming list becomes a
full-width section of its own.

---

## 10. Configuration: code vs environment vs database

Configuration is resolved in three layers; a later layer overrides an earlier one, and an empty
value always means "fall back to the previous layer".

```
src/config/streamer.defaults.ts  →  VITE_* environment variables  →  site_settings (database)
        typed defaults                 per deployment, build time        admin-editable, runtime
```

| Layer           | Holds                                                                                                                                                                                                                                     | Changed by                          | Takes effect |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------ |
| **Code**        | Streamer identity defaults, palette, all UI strings                                                                                                                                                                                       | developer (commit)                  | next deploy  |
| **Environment** | Supabase URL + anon key, site URL, base path, time zone, identity overrides, optional Twitch status URL                                                                                                                                   | repository variables / `.env.local` | next build   |
| **Database**    | Display name, tagline, about text, tags, profile image, business e-mail, social links, Twitch CTA heading, footer text, palette, home-page section order / visibility, Twitch live embed switch — plus all offers, events and submissions | admin panel                         | immediately  |

Two consequences worth knowing:

- **SEO tags are static.** `<title>`, description, Open Graph tags and JSON-LD are baked into
  `index.html` at build time from the code + environment layers, because crawlers and link
  previews do not run JavaScript. If you rename the streamer in the admin panel, visitors see
  it instantly, but link previews keep the build-time name until you update the defaults / env
  and redeploy.
- **No secrets in the database settings.** `site_settings` is world-readable by design.

---

## 11. Database architecture

Schema: [`supabase/migrations/20261001000000_initial_schema.sql`](supabase/migrations/20261001000000_initial_schema.sql).
All primary keys are UUIDs, all timestamps are `timestamptz` stored in UTC, and every table has
Row Level Security enabled.

| Table / view          | Purpose                                                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `offers`              | Sponsorship offers. `is_active`, validity window, `show_after_expiry` override, `sort_order`, soft delete via `archived_at`, display options `label` / `show_validity`. |
| `live_offers` (view)  | What the public site reads: active, not archived, started, not expired.                                                                                                 |
| `calendar_events`     | Streams and events. `event_type`, `is_sponsored`, `is_visible`, optional colour and link.                                                                               |
| `contact_submissions` | Collaboration requests. `status`: `new` / `read` / `archived`, plus admin `notes`.                                                                                      |
| `site_settings`       | Single row of admin-editable public content (NULL = use the code/env value).                                                                                            |
| `admin_users`         | Which Auth users are admins.                                                                                                                                            |
| `contact_rate_log`    | Short-lived, pseudonymous counters for the contact-form rate limit.                                                                                                     |
| `storage: media`      | Public bucket for images uploaded in the admin panel (2 MB, images only).                                                                                               |

**Who can do what** (enforced by grants + RLS, verified by `npm run test:rls`):

| Object                | Visitor (anon)                  | Signed-in, not admin | Admin                                 |
| --------------------- | ------------------------------- | -------------------- | ------------------------------------- |
| `offers`              | read **live** offers only       | same as visitor      | full CRUD                             |
| `calendar_events`     | read **visible** events only    | same as visitor      | full CRUD                             |
| `contact_submissions` | insert (4 form fields), no read | same as visitor      | read, update `status`/`notes`, delete |
| `site_settings`       | read                            | read                 | read, update                          |
| `admin_users`         | —                               | own row only         | own row only (managed via SQL)        |
| `contact_rate_log`    | —                               | —                    | —                                     |
| `media` bucket        | read via public URL             | read via public URL  | upload, replace, delete               |

Notable details:

- **Expiry is enforced by the database.** The "live" rule is part of the RLS policy, so an
  expired or inactive offer cannot be fetched even with a hand-written API request. Offers stop
  showing the moment `valid_until` passes — unless the admin ticks _"Näita ka pärast aegumist"_.
- **Soft delete.** "Archive" hides an offer but keeps it; a restored offer comes back hidden.
  Permanent deletion is only offered for archived offers and asks for confirmation.
- **Constraints mirror the forms.** Lengths, e-mail format, `http(s)://`-only URLs
  (`http_url` domain), hex colours, valid date ranges and allowed enum values are all `CHECK`
  constraints; the client-side validation is only there for fast feedback.
- **Indexes** cover the public listings (partial indexes on live offers / visible events), the
  admin listings and the rate-limit lookups.
- **Time zone.** Timestamps are UTC in the database. The UI shows — and the admin forms accept —
  wall-clock time in the site time zone (`Europe/Tallinn`), independent of the visitor's device,
  including across daylight-saving changes.

When you change the schema, add a new file under `supabase/migrations/` and update
`src/types/database.ts` (or regenerate it with `npx supabase gen types typescript --local`).

---

## 12. Security considerations

- **The browser only ever holds the anon key.** It grants nothing by itself; every request is
  authorised in the database by Row Level Security. The `service_role` key is not used anywhere
  in this project — never add it to a `VITE_*` variable, a repository variable or the code.
- **The frontend is not trusted.** The admin UI hides itself from non-admins, but that is
  cosmetic: the same rules are enforced by RLS policies that call `is_admin()`. A signed-in user
  who is not in `admin_users` has exactly the rights of an anonymous visitor.
- **Admins cannot be created from the web.** `admin_users` has no insert/update/delete grants for
  API roles. Keep public sign-ups disabled as well.
- **Least-privilege grants.** Table privileges are granted explicitly and column by column where
  it matters: visitors can only supply `name`, `company`, `email`, `message` on a submission, and
  admins can only change `status` and `notes` — never rewrite what a sender wrote.
- **Injection-safe links.** Every URL from the database or configuration must match
  `^https?://` in the database _and_ passes through `safeUrl()` before it is rendered, so a
  `javascript:` link cannot reach an `href`. Offer links carry `rel="sponsored noopener noreferrer"`.
- **Content Security Policy.** Production builds include a CSP `<meta>` tag: scripts and styles
  only from the site itself, network requests only to the site and the configured Supabase
  origin. If you add a third-party script or embed, extend the policy in
  `build/streamer-site-plugin.ts`.
- **Contact form abuse.** A static site has no server, so protection lives in the database: a
  trigger rate-limits submissions per e-mail (3/hour), per client IP (5/hour, best effort) and
  globally (40/hour) and answers HTTP 429. The form adds a honeypot field, a minimum fill time
  and a per-browser cooldown against cheap bots. This is _basic_ protection; if the form gets
  targeted, put a CAPTCHA (e.g. Cloudflare Turnstile) in front of it via an edge function.
- **Personal data (GDPR).** Submissions contain names and e-mail addresses. They are readable by
  admins only, can be deleted from the admin panel, and the rate-limit log stores only a SHA-256
  of the client IP for at most 24 hours. Add a privacy notice appropriate for your use.
- **Uploads.** Only admins can upload; the bucket accepts images up to 2 MB and files get random
  names. Uploaded files are public by nature (they are shown on the site).
- **Supabase free plan:** projects are paused after about a week without activity. The public
  site degrades gracefully (hero, about, Twitch CTA and footer still work), but offers, calendar
  and form need the database — keep the project active or upgrade the plan.

---

## 13. Optional: Twitch live status

The site does not depend on the Twitch API. The Twitch link and profile image are plain
configuration, and by default the Twitch block shows a "follow on Twitch" link.

With the optional module enabled the site knows when the channel is live. It then shows a
**LIVE** badge and **embeds the stream itself** in the Twitch block; when the channel goes
offline the block returns to the follow link. The embed can be switched off in
_Admin → Seaded → Twitchi otseülekanne_ (the badge stays). To enable the module:

1. Register an application at <https://dev.twitch.tv/console> to get a client id and secret.
2. Deploy the edge function and its secrets (these stay on the server):

   ```bash
   npx supabase secrets set TWITCH_CLIENT_ID=… TWITCH_CLIENT_SECRET=… \
     TWITCH_ALLOWED_CHANNELS=nimp ALLOWED_ORIGIN=https://nimp.ee
   npx supabase functions deploy twitch-status
   ```

3. Add the repository variable
   `VITE_TWITCH_STATUS_URL=https://<project-ref>.supabase.co/functions/v1/twitch-status` and redeploy.

Without that variable the module is inert and no request is made. If the endpoint fails, the
site behaves as if the channel were offline. Code: `src/modules/twitch-live/` and
`supabase/functions/twitch-status/`.

Notes on the embedded player:

- It is Twitch's official player in an `<iframe>` and needs no credentials of its own. Twitch
  requires the embedding host name; it is read from the page, so localhost, `*.github.io` and a
  custom domain all work without configuration.
- It starts muted (browsers block autoplay with sound).
- If the channel carries a content classification label (for example _Gambling_), Twitch shows
  its own "Start Watching" confirmation inside the player. That is Twitch's rule and cannot be
  skipped by the embedding site.

### Moving content between projects (config export / import)

Everything the admin panel manages — settings, offers, calendar events and the uploaded images —
can be exported to one portable file and imported into any other Supabase project, for example
to carry locally prepared content to production:

```bash
npm run config:export -- backups/2026-10-03/site-config.json   # writes the file + a media/ folder
npm run config:import -- backups/2026-10-03/site-config.json   # add --replace to drop rows not in the file
```

Images are referenced as `media://…` in the file; the import uploads them to the target project's
`media` bucket and rewrites the references. Contact submissions and admin users are never
exported. Both commands use the local stack unless `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are set in the shell — the service-role key is a secret for your own
machine only (never a `VITE_*` variable, never committed). The `backups/` folder is git-ignored.

---

## 14. Quality checks and tests

```bash
npm run typecheck      # strict TypeScript
npm run lint           # ESLint (typescript-eslint strict, react-hooks, react-refresh)
npm run format:check   # Prettier
npm run build          # production build
```

**Database security test** — exercises grants and RLS as an anonymous visitor, a signed-in
non-admin and an admin (27 checks: visibility rules, write protection, column-level restrictions,
validation, rate limiting, storage):

```bash
npx supabase start
npx supabase db reset
npm run test:rls
```

It creates and removes its own users and rows, and refuses to run against a non-local database.
Run it whenever you touch a migration.

---

## 15. Design decisions

Choices made where the brief left room, and why.

- **PostgREST client for visitors, full SDK for admins.** The public site uses only the small
  `@supabase/postgrest-js` client; the full `supabase-js` SDK (auth, storage) is a separate chunk
  loaded when someone opens `/admin`. Visitors download roughly 200 kB less JavaScript.
- **`BrowserRouter` + `404.html`** instead of hash URLs, so `/admin` and `/admin/login` are real
  paths as specified, and it works unchanged on a custom domain or under `/<repository>/`.
- **Hand-written UI primitives** in the shadcn/ui style (`src/components/ui`) on native elements —
  e.g. the modal is a native `<dialog>` (built-in focus trap, Escape, top layer). This avoids the
  Radix dependency tree for the handful of components the site needs.
- **A custom month grid** built with date-fns rather than a calendar library: it is ~150 lines,
  fully themed by the palette, time-zone-correct and usable at 360 px.
- **One fixed display time zone.** Times read the same for every visitor ("19:00" is 19:00
  Tallinn time), which is what a streaming schedule needs.
- **Admins via an `admin_users` table** rather than JWT claims: simple to reason about, revocable
  instantly, and impossible to grant from the client.
- **Image fields accept a URL or an upload** to a public Supabase Storage bucket, so the owner
  does not need separate image hosting.
- **Self-hosted fonts** (`@fontsource-variable`): no third-party font requests.
- **No invented content.** About text is a neutral placeholder, topic tags and social links are
  hidden until provided, and the seed data is labelled "Demo".
- **Avatar as favicon.** The configured profile image doubles as the favicon and social preview.
