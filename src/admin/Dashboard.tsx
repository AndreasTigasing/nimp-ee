import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Inbox,
  Plus,
  Settings,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { buttonClasses } from '@/components/ui/button-styles'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAsync } from '@/hooks/useAsync'
import { errorMessage } from '@/lib/errors'
import { t } from '@/locales'
import { countUpcomingEvents } from '@/services/calendar'
import { countNewSubmissions } from '@/services/contact'
import { countLiveOffers } from '@/services/offers'
import { FormError } from './components/FormError'
import { PageHeader } from './components/PageHeader'

const copy = t.admin.dashboard

type StatCardProps = {
  label: string
  /** undefined = loading, null = unavailable. */
  value: number | null | undefined
  icon: LucideIcon
  to: string
  /** Draws attention when the value is above zero (e.g. unread submissions). */
  highlight?: boolean
}

function StatCard({ label, value, icon: Icon, to, highlight = false }: StatCardProps) {
  const emphasised = highlight && typeof value === 'number' && value > 0

  return (
    <Link
      to={to}
      className="group flex flex-col rounded-card border border-line bg-surface p-5 transition duration-200 hover:-translate-y-0.5 hover:border-line-strong"
    >
      <span
        className={
          emphasised
            ? 'grid size-11 place-items-center rounded-2xl bg-accent text-accent-ink'
            : 'grid size-11 place-items-center rounded-2xl bg-primary/14 text-primary-soft'
        }
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <p className="mt-5 text-sm font-semibold text-muted">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-2 h-10 w-16" />
      ) : (
        <p className="mt-1 font-display text-4xl font-bold tabular-nums">{value ?? '—'}</p>
      )}
      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-subtle transition-colors group-hover:text-fg">
        {copy.manage}
        <ArrowRight
          aria-hidden="true"
          className="size-3.5 transition group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  )
}

export function Dashboard() {
  const offers = useAsync('admin:count-offers', countLiveOffers)
  const events = useAsync('admin:count-events', countUpcomingEvents)
  const submissions = useAsync('admin:count-submissions', countNewSubmissions)
  const error = offers.error ?? events.error ?? submissions.error

  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      {error && (
        <FormError className="mb-6" message={`${copy.statsError}. ${errorMessage(error)}`} />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={copy.activeOffers}
          value={offers.error ? null : offers.data}
          icon={Tag}
          to="/admin/offers"
        />
        <StatCard
          label={copy.upcomingEvents}
          value={events.error ? null : events.data}
          icon={CalendarDays}
          to="/admin/calendar"
        />
        <StatCard
          label={copy.newSubmissions}
          value={submissions.error ? null : submissions.data}
          icon={Inbox}
          to="/admin/submissions"
          highlight
        />
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold">{copy.quickActions}</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link to="/admin/offers" state={{ create: true }} className={buttonClasses()}>
          <Plus aria-hidden="true" className="size-4" />
          {copy.addOffer}
        </Link>
        <Link
          to="/admin/calendar"
          state={{ create: true }}
          className={buttonClasses({ variant: 'secondary' })}
        >
          <CalendarPlus aria-hidden="true" className="size-4" />
          {copy.addEvent}
        </Link>
        <Link to="/admin/settings" className={buttonClasses({ variant: 'secondary' })}>
          <Settings aria-hidden="true" className="size-4" />
          {copy.editSettings}
        </Link>
      </div>
    </>
  )
}
