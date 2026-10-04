import { t } from '@/locales'
import type { Offer } from '@/types/database'
import { formatShortDate } from './datetime'

export type OfferStatus = 'live' | 'inactive' | 'scheduled' | 'expired' | 'archived'

/** Mirrors the "live" rule enforced by RLS in the database (see the migration). */
export function offerStatus(offer: Offer, now: number = Date.now()): OfferStatus {
  if (offer.archived_at) return 'archived'
  if (!offer.is_active) return 'inactive'
  if (offer.valid_from && new Date(offer.valid_from).getTime() > now) return 'scheduled'
  if (
    offer.valid_until &&
    new Date(offer.valid_until).getTime() <= now &&
    !offer.show_after_expiry
  ) {
    return 'expired'
  }
  return 'live'
}

/** "Kehtib kuni 31.12.2026" etc. */
export function offerValidityLabel(offer: Pick<Offer, 'valid_from' | 'valid_until'>): string {
  const { valid_from: from, valid_until: until } = offer
  const started = !from || new Date(from).getTime() <= Date.now()

  if (until && (started || !from)) return t.offers.validUntil(formatShortDate(until))
  if (from && until) return t.offers.validBetween(formatShortDate(from), formatShortDate(until))
  if (from && !started) return t.offers.validFrom(formatShortDate(from))
  return t.offers.noExpiry
}
