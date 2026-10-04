import { ArrowUp, Mail } from 'lucide-react'
import { SocialLinks } from '@/components/social/SocialLinks'
import { isEmail } from '@/lib/validation'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'
import { sectionHref } from './nav'

export function Footer() {
  const { config } = useSiteConfig()
  const email = isEmail(config.businessEmail) ? config.businessEmail : null

  return (
    <footer className="border-t border-line">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <p className="font-display text-xl font-bold tracking-tight">{config.name}</p>
          <p className="mt-1 text-sm text-muted">{config.tagline}</p>

          {email && (
            <p className="mt-6 text-sm">
              <span className="block text-xs font-semibold tracking-wider text-subtle uppercase">
                {t.footer.businessEmail}
              </span>
              <a
                href={`mailto:${email}`}
                className="mt-1.5 inline-flex items-center gap-2 font-semibold break-all transition-colors hover:text-primary-soft"
              >
                <Mail aria-hidden="true" className="size-4 shrink-0 text-primary-soft" />
                {email}
              </a>
            </p>
          )}

          {config.footerText && (
            <p className="mt-6 max-w-xl text-xs leading-relaxed whitespace-pre-line text-subtle">
              {config.footerText}
            </p>
          )}
        </div>

        <SocialLinks socials={config.socials} />
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-subtle">
          <p>
            © {new Date().getFullYear()} {config.name}. {t.footer.rights}
          </p>
          <a
            href={sectionHref(t.anchors.home)}
            className="inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-fg"
          >
            {t.footer.backToTop}
            <ArrowUp aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </div>
    </footer>
  )
}
