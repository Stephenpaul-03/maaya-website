import { describe, expect, it } from 'vitest'
import { activeOffers, offers, type OffersConfig } from './offers'

describe('scheduled offers', () => {
  const now = Date.parse('2026-09-21T12:00:00Z')
  const base = offers.items[0]
  it('honours enabled flags, start/end boundaries, editorial order, and limits', () => {
    const config: OffersConfig = { ...offers, maxVisible: 2, items: [
      { ...base, id: 'disabled', enabled: false },
      { ...base, id: 'future', startsAt: '2026-09-21T12:00:01Z' },
      { ...base, id: 'expired', endsAt: '2026-09-21T12:00:00Z' },
      { ...base, id: 'starting-now', startsAt: '2026-09-21T12:00:00Z' },
      { ...base, id: 'evergreen' },
      { ...base, id: 'over-limit' },
    ] }
    expect(activeOffers(config, now).map(offer => offer.id)).toEqual(['starting-now', 'evergreen'])
    expect(activeOffers({ ...config, enabled: false }, now)).toEqual([])
  })
  it('supports timezone offsets and hides invalid time windows defensively', () => {
    const config = { ...offers, items: [{ ...base, startsAt: '2026-09-21T17:30:00+05:30', endsAt: '2026-09-21T18:00:00+05:30' }] }
    expect(activeOffers(config, now)).toHaveLength(1)
    expect(activeOffers(config, now + 30 * 60 * 1000)).toHaveLength(0)
    expect(activeOffers({ ...offers, items: [{ ...base, startsAt: 'invalid' }] }, now)).toEqual([])
  })
})
