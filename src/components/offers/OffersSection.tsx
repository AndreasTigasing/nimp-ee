import { Tag } from 'lucide-react'
import { useState } from 'react'
import { Section } from '@/components/layout/Section'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState, StateMessage } from '@/components/ui/StateMessage'
import type { AsyncState } from '@/hooks/useAsync'
import { t } from '@/locales'
import type { Offer } from '@/types/database'
import { OfferCard } from './OfferCard'
import { OfferModal } from './OfferModal'

// auto-rows-fr: every row is as tall as the tallest one, so all cards are the
// same size no matter how much content each offer has.
const GRID = 'grid auto-rows-fr gap-5 sm:grid-cols-2 xl:grid-cols-3'

function OffersSkeleton() {
  return (
    <div role="status" aria-label={t.common.loading} className={GRID}>
      {[0, 1, 2].map((index) => (
        <div key={index} className="rounded-card border border-line bg-surface p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-2xl" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="mt-6 h-5 w-4/5" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-8 h-11 w-full rounded-control" />
        </div>
      ))}
    </div>
  )
}

type OffersSectionProps = {
  /** Live offers, loaded once by the page and shared with the hero. */
  offers: AsyncState<Offer[]>
}

export function OffersSection({ offers }: OffersSectionProps) {
  const [selected, setSelected] = useState<Offer | null>(null)
  const { data, error, isLoading, reload } = offers

  return (
    <Section
      id={t.anchors.offers}
      eyebrow={t.offers.eyebrow}
      title={t.offers.title}
      subtitle={t.offers.subtitle}
    >
      {data === undefined && isLoading && <OffersSkeleton />}

      {data === undefined && error && (
        <ErrorState title={t.offers.errorTitle} error={error} onRetry={reload} />
      )}

      {data?.length === 0 && (
        <StateMessage icon={Tag} title={t.offers.emptyTitle} text={t.offers.emptyText} />
      )}

      {data && data.length > 0 && (
        <ul className={GRID}>
          {data.map((offer) => (
            <li key={offer.id}>
              <OfferCard offer={offer} onShowDetails={setSelected} />
            </li>
          ))}
        </ul>
      )}

      <OfferModal offer={selected} onClose={() => setSelected(null)} />
    </Section>
  )
}
