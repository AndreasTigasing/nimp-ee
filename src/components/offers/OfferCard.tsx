import { ArrowUpRight, Clock } from 'lucide-react'
import { BrandMark } from '@/components/ui/BrandMark'
import { ButtonLink } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/button-styles'
import { offerValidityLabel } from '@/lib/offers'
import { safeUrl } from '@/lib/url'
import { t } from '@/locales'
import type { Offer } from '@/types/database'
import { PromoCode } from './PromoCode'

type OfferCardProps = {
  offer: Offer
  onShowDetails: (offer: Offer) => void
}

export function OfferCard({ offer, onShowDetails }: OfferCardProps) {
  const ctaUrl = safeUrl(offer.cta_url)
  const image = safeUrl(offer.image)
  const hasDetails = Boolean(offer.description || offer.terms)

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-line-strong">
      {image && (
        <div className="aspect-[16/9] overflow-hidden bg-raised">
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <BrandMark name={offer.brand_name} logo={offer.brand_logo} />
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-subtle uppercase">
              {offer.label || t.offers.sponsoredNote}
            </p>
            <p className="truncate text-sm font-bold">{offer.brand_name}</p>
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg leading-snug font-semibold text-balance-safe">
            {offer.title}
          </h3>
          {offer.short_description && (
            <p className="mt-2 text-sm leading-relaxed text-muted">{offer.short_description}</p>
          )}
        </div>

        {/* Pinned to the bottom of the card. The promo code sits directly above
            the buttons, so in a row of equal-height cards the codes line up no
            matter how long the text above is or whether the validity is shown. */}
        <div className="mt-auto flex flex-col gap-4 pt-1">
          {offer.show_validity && (
            <p className="flex items-center gap-2 text-xs font-medium text-subtle">
              <Clock aria-hidden="true" className="size-3.5 shrink-0" />
              {offerValidityLabel(offer)}
            </p>
          )}

          {offer.promo_code && <PromoCode code={offer.promo_code} />}

          {(ctaUrl || hasDetails) && (
            // Always a single row (a long button text is cut off rather than
            // wrapped), so the row has the same height on every card.
            <div className="flex gap-2">
              {ctaUrl && (
                <ButtonLink
                  href={ctaUrl}
                  external
                  sponsored
                  className="min-w-0 flex-1 shrink! px-4"
                >
                  <span className="truncate">{offer.cta_text || t.offers.defaultCta}</span>
                  <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
                </ButtonLink>
              )}
              {hasDetails && (
                <button
                  type="button"
                  onClick={() => onShowDetails(offer)}
                  aria-haspopup="dialog"
                  className={buttonClasses({
                    variant: 'secondary',
                    className: ctaUrl ? undefined : 'flex-1',
                  })}
                >
                  {t.offers.details}
                  <span className="sr-only">: {offer.title}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
