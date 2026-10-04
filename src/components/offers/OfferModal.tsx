import { ArrowUpRight, Clock } from 'lucide-react'
import { BrandMark } from '@/components/ui/BrandMark'
import { ButtonLink } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { offerValidityLabel } from '@/lib/offers'
import { safeUrl } from '@/lib/url'
import { t } from '@/locales'
import type { Offer } from '@/types/database'
import { PromoCode } from './PromoCode'

type OfferModalProps = {
  /** The offer to show, or null when the modal is closed. */
  offer: Offer | null
  onClose: () => void
}

export function OfferModal({ offer, onClose }: OfferModalProps) {
  const ctaUrl = safeUrl(offer?.cta_url)
  const image = safeUrl(offer?.image)

  return (
    <Dialog
      open={offer !== null}
      onClose={onClose}
      title={offer?.title ?? ''}
      footer={
        offer &&
        ctaUrl && (
          <ButtonLink href={ctaUrl} external sponsored className="max-sm:w-full">
            {offer.cta_text || t.offers.defaultCta}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </ButtonLink>
        )
      }
    >
      {offer && (
        <div className="flex flex-col gap-5">
          {image && (
            <img
              src={image}
              alt=""
              loading="lazy"
              className="aspect-[16/9] w-full rounded-2xl bg-raised object-cover"
            />
          )}

          <div className="flex items-center gap-3">
            <BrandMark name={offer.brand_name} logo={offer.brand_logo} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{offer.brand_name}</p>
              {offer.show_validity && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-subtle">
                  <Clock aria-hidden="true" className="size-3.5 shrink-0" />
                  {offerValidityLabel(offer)}
                </p>
              )}
            </div>
          </div>

          {(offer.description || offer.short_description) && (
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted sm:text-base">
              {offer.description || offer.short_description}
            </p>
          )}

          {offer.promo_code && <PromoCode code={offer.promo_code} />}

          {offer.terms && (
            <section aria-label={t.offers.terms} className="border-t border-line pt-4">
              <h3 className="text-xs font-bold tracking-[0.16em] text-subtle uppercase">
                {t.offers.terms}
              </h3>
              <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-subtle">
                {offer.terms}
              </p>
            </section>
          )}
        </div>
      )}
    </Dialog>
  )
}
