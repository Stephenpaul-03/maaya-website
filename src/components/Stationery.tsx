import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, ArrowUp, Package, Pencil, Paperclip, Scissors, Menu, X, Check, CornerDownRight, MapPin, Clock, Phone, Mail, MessageCircle } from 'lucide-react'
import { MotionConfig, useReducedMotion } from 'motion/react'
import { SiteLink as Link } from './SiteLink'
import { stationery as copy } from '../content'
import { observeScrollReveals } from '../lib/scroll-reveal'

export function StationeryCard() {
  return <aside className="stationery-promo"><div><span className="eyebrow">{copy.promo.eyebrow}</span><h2>{copy.promo.title}</h2><p>{copy.promo.text}</p></div><Link href="/stationery">{copy.promo.link}<ArrowUpRight size={20} /></Link></aside>
}
function LineBreaks({ children }: { children: string }) {
  return <>{children.split('\n').map((line, index) => <span key={index}>{index > 0 && <br />}{line}</span>)}</>
}
function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`stationery-reveal ${className}`}>{children}</div>
}
export function Stationery() {
  const [menuOpen, setMenuOpen] = useState(false)
  const reduced = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    document.title = copy.metadata.title
    const meta = document.querySelector('meta[name="theme-color"]')
    const previous = meta?.getAttribute('content')
    meta?.setAttribute('content', '#183bdb')
    window.scrollTo({ top: 0, behavior: 'instant' })
    return () => { if (previous) meta?.setAttribute('content', previous) }
  }, [])
  useLayoutEffect(() => {
    if (root.current && !reduced) return observeScrollReveals(root.current, {
      targets: '.stationery-hero-copy, .supply-art, .stationery-reveal, .supply-category, .stationery-product-card, .stationery-use-cases > article, .stationery-shop-details > div, .stationery-shop-map, .stationery-footer-top > *, .stationery-footer-bottom',
    })
  }, [reduced])
  const links = [{ href: '#stationery-range', label: copy.nav.range }, { href: '#stationery-value', label: copy.nav.value }, { href: '#stationery-shop', label: copy.nav.visit }]
  const logo = <><span className="stationery-logo-mark" aria-hidden="true">m<span>↗</span></span><span>{copy.brand.name}<small>{copy.brand.descriptor}</small></span></>
  return <MotionConfig reducedMotion="user"><div className="stationery-site" id="stationery-top" ref={root}>
    <Link className="skip-link" href="#stationery-main">Skip to content</Link>
    <header className="stationery-header"><Link className="stationery-logo" href="/stationery" aria-label={copy.brand.homeLabel}>{logo}</Link><nav className="stationery-desktop-nav" aria-label="Stationery navigation">{links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav><Link href="/" className="stationery-bookshop-link">{copy.nav.books}<ArrowUpRight size={16} /></Link><button className="stationery-menu-toggle" aria-label={menuOpen ? 'Close stationery menu' : 'Open stationery menu'} aria-expanded={menuOpen} aria-controls="stationery-mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      {menuOpen && <nav className="stationery-mobile-nav" id="stationery-mobile-nav" aria-label="Stationery mobile navigation" onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); root.current?.querySelector<HTMLButtonElement>('.stationery-menu-toggle')?.focus() } }}>{links.map(link => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}<ArrowRight size={18} /></a>)}<Link href="/">{copy.nav.books}<ArrowUpRight size={18} /></Link></nav>}
    </header>
    <main className="stationery-main" id="stationery-main" tabIndex={-1}>
      <section className="stationery-hero"><div className="stationery-hero-copy"><span className="stationery-kicker">{copy.hero.eyebrow}</span><h1><span>{copy.hero.title}</span><span className="stationery-hero-accent">{copy.hero.accent}<svg viewBox="0 0 600 20" preserveAspectRatio="none" aria-hidden="true"><path className="stationery-underline" d="M4 13 Q290 -1 594 10" fill="none" stroke="currentColor" strokeWidth="8" /></svg></span></h1><p>{copy.hero.text}</p><div className="stationery-hero-actions"><a className="stationery-button" href="#stationery-range">{copy.hero.cta}<ArrowUpRight size={20} /></a><a className="stationery-subtle-link" href="#stationery-value">{copy.hero.secondary}<ArrowRight size={16} /></a></div><span className="stationery-footnote"><span />{copy.hero.note}</span></div>
        <div className="supply-art" aria-hidden="true"><span className="supply-coordinate">M / 001 — EVERYDAY GOODS</span><div className="supply-orbit" /><div className="supply-notebook"><span>{copy.hero.notebook}</span><div className="notebook-star">✳</div><small>MAAYA / STATIONERY</small></div><div className="supply-pencil" /><div className="supply-pencil supply-pencil-second" /><Paperclip className="supply-clip" size={80} strokeWidth={1.6} /><span className="supply-stamp"><LineBreaks>{copy.hero.stamp}</LineBreaks></span><div className="supply-label"><LineBreaks>{copy.hero.artLabel}</LineBreaks></div><span className="supply-art-bottom">WRITE. MAKE. REPEAT. ↗</span></div>
      </section>
      <div className="stationery-strip"><div className="stationery-strip-track">{[0, 1].map(repeat => <div className="stationery-strip-group" key={repeat} aria-hidden={repeat === 1 ? true : undefined}>{copy.strip.map(item => <span key={item}><span aria-hidden="true">✳</span>{item}</span>)}</div>)}</div></div>
      <section id="stationery-range" className="stationery-range stationery-section"><Reveal className="stationery-section-heading"><span className="stationery-kicker">{copy.range.eyebrow}</span><div><h2>{copy.range.title}</h2><p>{copy.range.text}</p></div></Reveal><div className="supply-categories">{copy.range.items.map((item, index) => { const Icon = [Pencil, Package, Paperclip, Scissors][index]; return <article key={item.label} className={`supply-category category-${index}`}><div className="supply-category-art" aria-hidden="true"><span>0{index + 1}</span><Icon size={76} strokeWidth={1} /><ArrowUpRight size={22} /></div><span className="stationery-kicker">{item.label}</span><h3>{item.title}</h3><p>{item.text}</p></article> })}</div></section>
      <StationeryShowcase />
      <section id="stationery-value" className="stationery-value stationery-section" aria-labelledby="stationery-value-title">
        <Reveal className="stationery-value-copy">
          <span className="stationery-kicker">{copy.value.eyebrow}</span>
          <h2 id="stationery-value-title"><LineBreaks>{copy.value.title}</LineBreaks></h2>
          <p>{copy.value.text}</p>
          <div className="stationery-value-steps">{copy.value.steps.map((step, index) => <article key={index}><span>0{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></article>)}</div>
        </Reveal>
        <Reveal className="stationery-comparison">
          <div className="stationery-comparison-heading"><h3>{copy.value.comparison.title}</h3><Scissors size={25} strokeWidth={1.3} aria-hidden="true" /></div>
          <div className="stationery-chain">
            <span className="stationery-kicker">{copy.value.comparison.usualLabel}</span>
            <ol aria-label={copy.value.comparison.usualLabel}>{copy.value.comparison.usualRoute.map((step, index) => <li key={index} className={index === 2 || index === 3 ? 'chain-extra' : undefined}><span>{step}</span>{index < copy.value.comparison.usualRoute.length - 1 && <ArrowRight size={16} aria-hidden="true" />}</li>)}</ol>
            <p>{copy.value.comparison.usualNote}</p>
          </div>
          <div className="stationery-chain chain-direct">
            <span className="stationery-kicker">{copy.value.comparison.directLabel}</span>
            <ol aria-label={copy.value.comparison.directLabel}>{copy.value.comparison.directRoute.map((step, index) => <li key={index}><span>{step}</span>{index < copy.value.comparison.directRoute.length - 1 && <ArrowRight size={16} aria-hidden="true" />}</li>)}</ol>
            <p>{copy.value.comparison.directNote}</p>
          </div>
          <div className="stationery-comparison-takeaway"><Scissors size={21} aria-hidden="true" /><div><strong>{copy.value.caption}</strong><span>{copy.value.comparison.removedLabel} · {copy.value.comparison.removedNote}</span></div></div>
          <small>{copy.value.comparison.note}</small>
        </Reveal>
      </section>
      <section className="stationery-lists stationery-section"><Reveal><span className="stationery-kicker">{copy.lists.eyebrow}</span><h2><LineBreaks>{copy.lists.title}</LineBreaks></h2></Reveal><div className="stationery-use-cases">{copy.lists.items.map((item, index) => <article key={index}><span className="stationery-use-number">0{index + 1}<CornerDownRight size={27} /></span><span className="stationery-kicker">{item.tag}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>
      <section id="stationery-visit" className="stationery-visit stationery-section"><Reveal><span className="stationery-kicker">{copy.visit.eyebrow}</span><h2><LineBreaks>{copy.visit.title}</LineBreaks></h2><p>{copy.visit.text}</p><div className="stationery-contact-pending"><span aria-hidden="true">↗</span><p>{copy.visit.pending}</p></div></Reveal><Reveal className="stationery-list-wrap"><div className="stationery-list"><div className="stationery-list-tape" /><strong>{copy.visit.checklistTitle}</strong>{copy.visit.checklist.map(item => <span key={item}><Check size={18} />{item}</span>)}<p>{copy.visit.note}</p><span className="stationery-list-signature">{copy.brand.name} ↗</span></div></Reveal></section>
      <StationeryShopDetails />
    </main>
    <footer className="stationery-footer"><div className="stationery-footer-top"><div><Link className="stationery-logo" href="/stationery" aria-label={copy.brand.homeLabel}>{logo}</Link><p>{copy.footer.tagline}</p></div><nav aria-label="Stationery footer navigation">{links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav><div className="stationery-footer-sister"><span>{copy.footer.sister}</span><Link href="/collection">{copy.footer.books}<ArrowUpRight size={18} /></Link></div></div><div className="stationery-footer-bottom"><span>© {new Date().getFullYear()} {copy.footer.copyright}</span><a href="#stationery-top">{copy.footer.top}<ArrowUp size={16} /></a></div></footer>
  </div></MotionConfig>
}

export function StationeryShopDetails({ data = copy.shop }: { data?: typeof copy.shop }) {
  const hasContact = data.phone || data.email || data.whatsapp
  return <section id="stationery-shop" className="stationery-shop stationery-section" aria-labelledby="stationery-shop-title">
    <Reveal><span className="stationery-kicker">{data.eyebrow}</span><h2 id="stationery-shop-title">{data.title}</h2><p className="stationery-shop-intro">{data.intro}</p></Reveal>
    <div className="stationery-shop-card"><div className="stationery-shop-details"><div><MapPin size={23} aria-hidden="true" /><h3>{data.addressLabel}</h3>{data.address ? <address>{data.address}</address> : <p>{data.addressPending}</p>}{data.directionsUrl && <Link className="stationery-shop-action" href={data.directionsUrl} target="_blank" rel="noopener noreferrer">{data.directionsLabel}<ArrowUpRight size={16} /></Link>}</div><div><Clock size={23} aria-hidden="true" /><h3>{data.hoursLabel}</h3><p className="stationery-shop-hours">{data.hours || data.hoursPending}</p></div><div><MessageCircle size={23} aria-hidden="true" /><h3>{data.contactLabel}</h3><p>{data.contactText}</p><div className="stationery-shop-contacts">{data.phone && <Link href={`tel:${data.phone.replace(/[ ()-]/g, '')}`}><Phone size={16} />{data.phone}</Link>}{data.email && <Link href={`mailto:${data.email}`}><Mail size={16} />{data.email}</Link>}{data.whatsapp && <Link href={`https://wa.me/${data.whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} />{data.whatsappLabel}<ArrowUpRight size={15} /></Link>}</div>{!hasContact && <p className="stationery-shop-pending">{data.contactPending}</p>}</div></div><div className="stationery-shop-map">{data.mapEmbedUrl ? <iframe src={data.mapEmbedUrl} title={data.mapTitle} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /> : <div><MapPin size={48} strokeWidth={1} aria-hidden="true" /><strong>{copy.brand.name} {copy.brand.descriptor}</strong><p>{data.mapPending}</p></div>}</div></div>
  </section>
}

function ProductArt({ index }: { index: number }) {
  const art = [
    <g key="notebook"><rect x="38" y="20" width="88" height="116" rx="4" fill="#183bdb" /><path d="M49 20v116" stroke="#10267e" strokeWidth="6" /><rect x="66" y="44" width="43" height="25" fill="#fce767" /><path d="M71 53h33M71 60h24" stroke="#172b69" strokeWidth="2" /><path d="M68 112h37" stroke="#f8f6ee" strokeWidth="2" /></g>,
    <g key="pens" transform="rotate(25 80 80)">{[50, 77, 104].map((x, i) => <g key={x}><rect x={x} y="30" width="10" height="91" rx="3" fill={['#183bdb','#172b69','#d35a4e'][i]} /><path d={`M${x} 121l5 13 5-13`} fill="#bcbfc6" /><rect x={x - 1} y="20" width="12" height="38" rx="3" fill={['#183bdb','#172b69','#d35a4e'][i]} /><path d={`M${x+9} 24v27`} stroke="#f8f6ee" strokeWidth="2" /></g>)}</g>,
    <g key="pencils" transform="rotate(-20 80 80)">{[48, 72, 96].map((x, i) => <g key={x}><path d={`M${x} 121l6 17 6-17`} fill="#cfab79" /><path d={`M${x+4} 132l2 6 2-6`} fill="#172b69" /><path d={`M${x} 34h12v87h-12z`} fill={['#e9b844','#7eb69b','#e8977e'][i]} /><path d={`M${x+4} 34v87`} stroke="#ffffff50" strokeWidth="3" /><rect x={x} y="23" width="12" height="14" rx="2" fill="#eab8af" /></g>)}</g>,
    <g key="markers" transform="rotate(18 80 80)">{[46, 89].map((x,i) => <g key={x}><rect x={x} y="48" width="25" height="73" rx="5" fill={i ? '#f098ae' : '#fce767'} /><rect x={x} y="25" width="25" height="38" rx="4" fill={i ? '#dd688d' : '#dabd35'} /><rect x={x+7} y="79" width="11" height="22" rx="2" fill="#fff9" /><path d={`M${x+20} 29v28`} stroke="#172b6933" strokeWidth="3" /></g>)}</g>,
    <g key="files"><path d="M23 43h48l12 12h57v75H23z" fill="#bd885a" /><path d="M20 58h124l-14 75H30z" fill="#e1b982" /><path d="M39 40h76v62H39z" fill="#fffdf7" /><path d="M49 54h52M49 64h43M49 74h49" stroke="#a4b3c6" strokeWidth="2" /><path d="M20 76h124l-14 57H30z" fill="#eacb97" /></g>,
    <g key="notes"><path d="M39 44h93v89H39z" fill="#c4ae38" /><path d="M35 38h93v89H35z" fill="#ebd356" /><path d="M31 32h93v89H31z" fill="#fce767" /><path d="M31 32h93v23H31z" fill="#e7cf52" /><path d="M97 121l27-27v27z" fill="#e5c548" /><path d="M54 72h46M54 84h34" stroke="#c3aa35" strokeWidth="2" /></g>,
    <g key="clips" fill="none" strokeWidth="6" strokeLinecap="round">{[0,1,2].map((n) => <path key={n} d="M-10-23v46a15 15 0 0030 0v-52a10 10 0 00-20 0v47a5 5 0 0010 0v-38" stroke={['#183bdb','#bd7159','#639581'][n]} transform={`translate(${47+n*34} ${78+(n%2)*12}) rotate(${[-25,10,35][n]})`} />)}</g>,
    <g key="scissors" transform="rotate(-20 80 80)"><path d="M77 83L58 20q-9 1-5 20l17 50M86 83l19-63q9 1 5 20L93 90" fill="#c0c9d5" stroke="#8798ad" strokeWidth="2" /><circle cx="81" cy="80" r="5" fill="#172b69" /><ellipse cx="61" cy="111" rx="14" ry="22" fill="none" stroke="#183bdb" strokeWidth="10" /><ellipse cx="103" cy="111" rx="14" ry="22" fill="none" stroke="#183bdb" strokeWidth="10" /><path d="M71 94l6-11M93 94l-7-11" stroke="#183bdb" strokeWidth="8" /></g>,
  ]
  return <svg viewBox="0 0 164 164" aria-hidden="true" focusable="false"><ellipse cx="82" cy="143" rx="49" ry="5" fill="#172b6910" />{art[index]}</svg>
}
function StationeryShowcase() {
  return <section className="stationery-showcase stationery-section" aria-labelledby="stationery-showcase-title"><Reveal className="stationery-section-heading"><span className="stationery-kicker">{copy.showcase.eyebrow}</span><div><h2 id="stationery-showcase-title">{copy.showcase.title}</h2><p>{copy.showcase.text}</p></div></Reveal><div className="stationery-product-grid">{copy.showcase.items.map((item, index) => <article className={`stationery-product-card product-${index}`} key={index}><div className="stationery-product-art"><ProductArt index={index} /></div><span className="stationery-kicker">{item.category}</span><h3>{item.name}</h3><p>{item.description}</p></article>)}</div><p className="stationery-showcase-note">{copy.showcase.note}</p></section>
}
