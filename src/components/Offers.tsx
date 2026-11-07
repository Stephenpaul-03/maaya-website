import { SiteLink as Link } from './SiteLink'
import { useEffect, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Check, Copy, Tag } from 'lucide-react'
import { Cover } from '../Cover'
import { findBook } from '../books'
import { activeOffers, offers, type Offer, type OffersConfig } from '../lib/offers'

function OfferCard({ offer, featured, labels }: { offer: Offer; featured: boolean; labels: OffersConfig['labels'] }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  useEffect(() => {
    if (copyState === 'idle') return
    const timer = window.setTimeout(() => setCopyState('idle'), 4000)
    return () => window.clearTimeout(timer)
  }, [copyState])
  return <article className={`offer-card ${offer.theme} ${featured ? 'offer-featured' : ''}`}>
    <div className="offer-card-top">{offer.badge && <span className="offer-badge"><Tag size={13} />{offer.badge}</span>}{offer.highlight && <span className="offer-highlight">{offer.highlight}</span>}</div>
    <div className="offer-main"><div><h3>{offer.title}</h3><p>{offer.description}</p></div>{offer.bookIds.length > 0 && <div className="mini-shelf offer-books" aria-hidden="true">{offer.bookIds.map(id => <Cover key={id} book={findBook(id)} />)}</div>}</div>
    {offer.terms && <details className="offer-terms"><summary>{labels.terms}</summary><p>{offer.terms}</p></details>}
    <div className="offer-actions">{offer.code && <div className="offer-code"><span>{labels.codeLabel}</span><div><code>{offer.code}</code><button className="icon-button" aria-label={labels.copyCode} onClick={async () => { try { await navigator.clipboard.writeText(offer.code); setCopyState('copied') } catch { setCopyState('failed') } }}>{copyState === 'copied' ? <Check size={15} /> : <Copy size={15} />}</button></div></div>}<Link className="text-button" href={offer.cta.href} target={offer.cta.newTab ? '_blank' : undefined} rel={offer.cta.newTab ? 'noopener noreferrer' : undefined}>{offer.cta.label}<ArrowRight size={17} /></Link></div>
    <span className="offer-copy-status" role="status" aria-live="polite">{copyState === 'copied' ? labels.copied : copyState === 'failed' ? labels.copyFailed : ''}</span>
  </article>
}

export function Offers({ position, config: offersConfig = offers }: { position: string; config?: OffersConfig }) {
  const offers = offersConfig
  const reduced = useReducedMotion()
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!offers.enabled || offers.position !== position) return
    const refresh = () => setNow(Date.now())
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [position, offers.enabled, offers.position])
  const visible = offers.position === position ? activeOffers(offers, now) : []
  return <AnimatePresence initial={false}>{visible.length > 0 && <motion.section key="offers" className={`offers-section offers-${position}`} aria-labelledby="offers-title" initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .25 }}>
    <div className="offers-heading">{offers.eyebrow && <div className="eyebrow">{offers.eyebrow}</div>}<h2 id="offers-title">{offers.title}</h2>{offers.description && <p>{offers.description}</p>}</div>
    <div className={`offers-grid offers-${offers.layout} ${offers.emphasizeFirst ? 'offers-hierarchy' : ''} ${offers.emphasizeFirst && offers.layout === 'grid' && offers.columns === 2 ? 'offers-pair' : ''}`} style={{ '--offer-columns': offers.columns } as CSSProperties}>{visible.map((offer, index) => <OfferCard labels={offers.labels} key={offer.id} offer={offer} featured={offers.emphasizeFirst && index === 0} />)}</div>
  </motion.section>}</AnimatePresence>
}
