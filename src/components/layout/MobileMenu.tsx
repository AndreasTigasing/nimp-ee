import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { t } from '@/locales'
import { sectionHref, type NavItem } from './nav'

type MobileMenuProps = {
  id: string
  items: NavItem[]
  open: boolean
  activeId: string | null
  onClose: () => void
  /** Shown under the links: the Twitch button or the social icons, per the admin setting. */
  children?: ReactNode
}

/** Navigation panel that drops down under the header on small screens. */
export function MobileMenu({ id, items, open, activeId, onClose, children }: MobileMenuProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    // Close when the viewport grows into the desktop layout.
    const desktop = window.matchMedia('(min-width: 48rem)')

    document.addEventListener('keydown', onKeyDown)
    desktop.addEventListener('change', onClose)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      desktop.removeEventListener('change', onClose)
    }
  }, [open, onClose])

  return (
    <div
      id={id}
      hidden={!open}
      className="absolute inset-x-0 top-full animate-fade border-b border-line bg-bg shadow-card md:hidden"
    >
      <nav aria-label={t.nav.label} className="container-page py-4">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const isActive = activeId === item.id
            return (
              <li key={item.id}>
                <a
                  href={sectionHref(item.id)}
                  onClick={onClose}
                  aria-current={isActive ? 'location' : undefined}
                  className={cn(
                    'flex h-12 items-center rounded-control px-4 text-base font-semibold transition-colors',
                    isActive ? 'bg-fg/8 text-fg' : 'text-muted hover:bg-fg/5 hover:text-fg',
                  )}
                >
                  {item.label}
                </a>
              </li>
            )
          })}
        </ul>
        <div className="mt-4 empty:hidden">{children}</div>
      </nav>
    </div>
  )
}
