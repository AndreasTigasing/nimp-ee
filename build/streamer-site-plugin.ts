import { createHash } from 'node:crypto'
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { HtmlTagDescriptor, Plugin } from 'vite'
import { buildJsonLd, buildSeoMeta } from '../src/config/seo.ts'
import { paletteToCss } from '../src/config/theme.ts'
import type { ResolvedConfig } from '../src/config/types.ts'
import { et } from '../src/locales/et.ts'

type Options = {
  config: ResolvedConfig
  /** Vite `base`, always with leading and trailing slash. */
  base: string
  /** Origins the browser may call (Supabase, optional Twitch status endpoint). */
  apiOrigins: string[]
}

function metaName(name: string, content: string): HtmlTagDescriptor {
  return { tag: 'meta', attrs: { name, content }, injectTo: 'head' }
}

function metaProperty(property: string, content: string): HtmlTagDescriptor {
  return { tag: 'meta', attrs: { property, content }, injectTo: 'head' }
}

/** Returns the custom domain to publish in `CNAME`, or null for *.github.io / local builds. */
function customDomain(siteUrl: string): string | null {
  if (!siteUrl) return null
  try {
    const { hostname } = new URL(siteUrl)
    const isPlatformHost =
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.github.io')
    return isPlatformHost ? null : hostname
  } catch {
    return null
  }
}

/**
 * Content-Security-Policy for the production build. Static hosts such as GitHub
 * Pages cannot send response headers, so it ships as a <meta> tag.
 *
 * Scripts and styles may only come from the site itself; the single inline
 * <style> (the colour palette) is allowed by its hash. If you add a third-party
 * embed or script, extend the policy here.
 */
function contentSecurityPolicy(inlineStyle: string, apiOrigins: string[]): string {
  const styleHash = createHash('sha256').update(inlineStyle).digest('base64')
  // When the Supabase address is known at build time, only that origin may be
  // contacted. A pre-built package learns it from config.js after the build
  // (and it may be a custom or self-hosted domain), so any HTTPS API is allowed.
  const api = apiOrigins.length > 0 ? apiOrigins.join(' ') : 'https:'

  return [
    `default-src 'self'`,
    `script-src 'self'`,
    `style-src 'self' 'sha256-${styleHash}'`,
    // Brand logos and offer images are admin-provided URLs on arbitrary hosts.
    `img-src 'self' data: https: ${api}`,
    // Vite inlines very small font subsets as data: URIs.
    `font-src 'self' data:`,
    `connect-src 'self' ${api}`,
    // Twitch's embedded player, shown while the channel is live.
    `frame-src https://player.twitch.tv`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ]
    .map((directive) => directive.trim())
    .join('; ')
}

/**
 * Bakes the streamer configuration into the static build:
 *
 * - `<title>`, description, Open Graph / Twitter tags and JSON-LD in index.html,
 *   so crawlers and link previews work without running JavaScript
 * - the colour palette as CSS variables (no flash of unstyled colours)
 * - a Content-Security-Policy (production builds only)
 * - `404.html` (copy of index.html) so deep links such as /admin work on
 *   static hosts like GitHub Pages
 * - `robots.txt`, `sitemap.xml` and — for custom domains — `CNAME`
 */
export function streamerSitePlugin({ config, base, apiOrigins }: Options): Plugin {
  const { streamer, site } = config
  const meta = buildSeoMeta(streamer, site)
  const paletteCss = paletteToCss(streamer.theme)
  let outDir = 'dist'

  return {
    name: 'streamer-site',

    configResolved(resolved) {
      outDir = resolve(resolved.root, resolved.build.outDir)
    },

    transformIndexHtml(html, context) {
      const tags: HtmlTagDescriptor[] = [
        { tag: 'title', children: meta.title, injectTo: 'head' },
        metaName('description', meta.description),
        metaName('theme-color', meta.themeColor),
        { tag: 'link', attrs: { rel: 'icon', href: meta.icon }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: meta.touchIcon }, injectTo: 'head' },
        metaProperty('og:type', 'website'),
        metaProperty('og:site_name', meta.siteName),
        metaProperty('og:locale', et.meta.ogLocale),
        metaProperty('og:title', meta.title),
        metaProperty('og:description', meta.description),
        metaProperty('og:image', meta.image),
        metaName('twitter:card', 'summary'),
        metaName('twitter:title', meta.title),
        metaName('twitter:description', meta.description),
        metaName('twitter:image', meta.image),
        {
          tag: 'style',
          attrs: { id: 'theme-palette' },
          children: paletteCss,
          injectTo: 'head',
        },
        {
          tag: 'script',
          attrs: { type: 'application/ld+json' },
          // Escape "<" so the JSON can never close the script element.
          children: JSON.stringify(buildJsonLd(streamer, meta)).replaceAll('<', '\\u003c'),
          injectTo: 'head',
        },
      ]

      if (meta.url) {
        tags.push(
          { tag: 'link', attrs: { rel: 'canonical', href: meta.url }, injectTo: 'head' },
          metaProperty('og:url', meta.url),
        )
      }

      // Tags that must come first in <head>, in this order. The charset has to
      // be within the first bytes of the document, hence before the long policy.
      tags.push({ tag: 'meta', attrs: { charset: 'UTF-8' }, injectTo: 'head-prepend' })

      // The dev server injects inline scripts and styles (HMR), so the policy
      // is only added to production builds. It precedes everything it governs.
      if (!context.server) {
        tags.push({
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: contentSecurityPolicy(paletteCss, apiOrigins),
          },
          injectTo: 'head-prepend',
        })
      }

      // Runtime configuration (public/config.js): a plain file that can be
      // edited on the web server. Loaded before the application starts.
      tags.push({ tag: 'script', attrs: { src: `${base}config.js` }, injectTo: 'head-prepend' })

      return {
        html: html
          .replaceAll('__HTML_LANG__', et.meta.htmlLang)
          .replaceAll('__NOSCRIPT__', et.meta.noscript),
        tags,
      }
    },

    generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', `Disallow: ${base}admin`]
      if (meta.url) {
        robots.push('', `Sitemap: ${meta.url}sitemap.xml`)
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source:
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            `  <url><loc>${meta.url}</loc></url>\n` +
            '</urlset>\n',
        })
      }
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `${robots.join('\n')}\n` })

      const domain = customDomain(site.url)
      if (domain) {
        this.emitFile({ type: 'asset', fileName: 'CNAME', source: `${domain}\n` })
      }
    },

    writeBundle() {
      const indexHtml = resolve(outDir, 'index.html')
      if (existsSync(indexHtml)) {
        copyFileSync(indexHtml, resolve(outDir, '404.html'))
      }
    },
  }
}
