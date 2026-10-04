import {
  CalendarDays,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  LogOut,
  Settings,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router'
import { profileImageVariant } from '@/config/seo'
import { cn } from '@/lib/cn'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'
import { signOut } from '@/services/auth'
import { useAuth } from './auth-context'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Match the path exactly (for the index route). */
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/admin', label: t.admin.nav.dashboard, icon: LayoutDashboard, end: true },
  { to: '/admin/offers', label: t.admin.nav.offers, icon: Tag },
  { to: '/admin/calendar', label: t.admin.nav.calendar, icon: CalendarDays },
  { to: '/admin/submissions', label: t.admin.nav.submissions, icon: Inbox },
  { to: '/admin/settings', label: t.admin.nav.settings, icon: Settings },
]

const itemClasses =
  'flex h-11 items-center gap-3 rounded-control px-3.5 text-sm font-semibold transition-colors'

type AdminSidebarProps = {
  /** Called after a link is chosen (closes the drawer on small screens). */
  onNavigate?: () => void
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const { config } = useSiteConfig()
  const { email } = useAuth()

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-3 px-2 pt-2">
        <img
          src={profileImageVariant(config.image, 70)}
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-xl border border-line-strong object-cover"
        />
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold">{config.name}</p>
          <p className="text-xs font-semibold tracking-wider text-subtle uppercase">
            {t.admin.title}
          </p>
        </div>
      </div>

      <nav aria-label={t.admin.nav.label} className="flex-1">
        <ul className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    itemClasses,
                    isActive ? 'bg-primary/16 text-fg' : 'text-muted hover:bg-fg/6 hover:text-fg',
                  )
                }
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col gap-1 border-t border-line pt-4">
        <a
          href={import.meta.env.BASE_URL}
          target="_blank"
          rel="noopener"
          className={cn(itemClasses, 'text-muted hover:bg-fg/6 hover:text-fg')}
        >
          <ExternalLink aria-hidden="true" className="size-5 shrink-0" />
          {t.admin.nav.viewSite}
        </a>
        <button
          type="button"
          onClick={() => void signOut()}
          className={cn(itemClasses, 'w-full text-left text-muted hover:bg-fg/6 hover:text-fg')}
        >
          <LogOut aria-hidden="true" className="size-5 shrink-0" />
          {t.admin.nav.signOut}
        </button>
        {email && <p className="truncate px-3.5 pt-2 text-xs text-subtle">{email}</p>}
      </div>
    </div>
  )
}
