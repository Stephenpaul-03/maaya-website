import content from '../../.cache/content/offers.json'

export type Offer = Omit<(typeof content.items)[number], 'startsAt' | 'endsAt'> & {
  startsAt: string | null
  endsAt: string | null
}
export type OffersConfig = Omit<typeof content, 'items'> & { items: Offer[] }
export const offers: OffersConfig = content

/** Preserve editorial order; scheduled windows include the start and exclude the end. */
export function activeOffers(config: OffersConfig, now = Date.now()): Offer[] {
  if (!config.enabled) return []
  return config.items.filter(offer => offer.enabled
    && (offer.startsAt === null || Date.parse(offer.startsAt) <= now)
    && (offer.endsAt === null || now < Date.parse(offer.endsAt)))
    .slice(0, config.maxVisible)
}
