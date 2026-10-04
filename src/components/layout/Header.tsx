import { Menu, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { SocialLinks } from '@/components/social/SocialLinks'
import { ButtonLink } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/button-styles'
import { SocialIcon } from '@/components/ui/SocialIcon'
import { profileImageVariant } from '@/config/seo'
import { useActiveSection } from '@/hooks/useActiveSection'
import { cn } from '@/lib/cn'
import { safeUrl } from '@/lib/url'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'
import { MobileMenu } from './MobileMenu'
import { buildNavItems, sectionHref } from './nav'

const MOBILE_MENU_ID = 'mobile-menu'

export function Header() {
  const { config } = useSiteConfig()
  const navItems = useMemo(() => buildNavItems(config.sections), [config.sections])
  const navIds = useMemo(() => navItems.map((item) => item.id), [navItems])
  const activeId = useActiveSection(navIds)
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const twitchUrl = safeUrl(config.socials.twitch)

  return (
    <header className="sticky top-0 z-40 border-b border-line glass">
      <div className="container-page flex h-16 items-center gap-3">
        <a href={sectionHref(t.anchors.home)} className="flex min-w-0 items-center gap-3">
          <img
            src={profileImageVariant(config.image, 70)}
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-xl border border-line-strong object-cover"
          />
          <span className="truncate font-display text-base font-bold tracking-tight">
            {config.name}
          </span>
        </a>

        <nav aria-label={t.nav.label} className="mx-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeId === item.id
              return (
                <li key={item.id}>
                  <a
                    href={sectionHref(item.id)}
                    aria-current={isActive ? 'location' : undefined}
                    className={cn(
                      'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
                      isActive ? 'bg-fg/8 text-fg' : 'text-muted hover:text-fg',
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {config.headerAction === 'socials' && (
            <SocialLinks socials={config.socials} size="sm" className="max-lg:hidden" />
          )}
          {config.headerAction === 'twitch' && twitchUrl && (
            <ButtonLink href={twitchUrl} external size="sm" className="max-sm:hidden">
              <SocialIcon platform="twitch" className="size-4" />
              {t.nav.watchOnTwitch}
            </ButtonLink>
          )}
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls={MOBILE_MENU_ID}
            aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
            onClick={() => setMenuOpen((open) => !open)}
            className={buttonClasses({
              variant: 'secondary',
              size: 'icon',
              className: 'md:hidden',
            })}
          >
            {menuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </div>

      <MobileMenu
        id={MOBILE_MENU_ID}
        open={menuOpen}
        items={navItems}
        activeId={activeId}
        onClose={closeMenu}
      >
        {config.headerAction === 'socials' && <SocialLinks socials={config.socials} />}
        {config.headerAction === 'twitch' && twitchUrl && (
          <ButtonLink href={twitchUrl} external className="w-full" onClick={closeMenu}>
            <SocialIcon platform="twitch" className="size-4" />
            {t.nav.watchOnTwitch}
          </ButtonLink>
        )}
      </MobileMenu>
    </header>
  )
}
