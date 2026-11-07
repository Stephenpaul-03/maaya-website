import { SiteLink as Link } from './SiteLink'
import { ArrowUpRight, ArrowRight, MapPin, Mail, Phone, MessageCircle, Truck } from 'lucide-react'
import content from '../../.cache/content/shop.json'
import { format, site } from '../content'

export type ShopContent = Omit<typeof content, 'contact' | 'visit'> & {
  contact: Omit<typeof content.contact, 'socials'> & { socials: { label: string; url: string }[] }
  visit: Omit<typeof content.visit, 'address' | 'hours'> & { address: string[]; hours: string[] }
}
const branded = (text: string) => format(text, { brand: site.brand.name })

export function ShopChapters() {
  return <section className="shop-chapters" aria-label="Our story in more detail">
    {content.chapters.map(chapter => <article key={chapter.label}>
      <div className="eyebrow">{chapter.label}</div>
      <h2>{chapter.title}</h2><p>{branded(chapter.text)}</p>
    </article>)}
  </section>
}

export function ShopInfo({ detailed = false, data = content }: { detailed?: boolean; data?: ShopContent }) {
  const { contact, visit, courier } = data
  const hasContact = contact.phone || contact.email || contact.whatsapp
  return <section className="shop-info" aria-labelledby="shop-info-title">
    {data.demoNotice && <p className="shop-demo-notice">{data.demoNotice}</p>}
    <div className="shop-intro">
      <div><div className="eyebrow">{data.eyebrow}</div><h2 id="shop-info-title">{data.title}</h2><p>{branded(data.intro)}</p></div>
      {!detailed && <Link href="/about" className="text-button">{data.storyLink}<ArrowRight size={17} /></Link>}
    </div>
    <div className="shop-visit-grid">
      <div className="shop-details">
        <div className="shop-detail-block">
          <MapPin size={21} aria-hidden="true" /><h3>{visit.title}</h3>
          {visit.address.length > 0 ? <address>{visit.address.map(line => <span key={line}>{line}</span>)}</address> : <p>{visit.pending}</p>}
          {visit.hours.length > 0 && <div className="shop-hours"><h4>{visit.hoursLabel}</h4>{visit.hours.map(line => <p key={line}>{line}</p>)}</div>}
          {visit.directionsUrl && <Link className="shop-action-button shop-directions-button" href={visit.directionsUrl} target="_blank" rel="noopener noreferrer">{visit.directionsLabel}<ArrowUpRight size={16} /></Link>}
        </div>
        <div className="shop-detail-block">
          <MessageCircle size={21} aria-hidden="true" /><h3>{contact.title}</h3><p>{contact.description}</p>
          <div className="shop-contact-links">
            {contact.phone && <Link className="shop-action-button" href={`tel:${contact.phone.replace(/[ ()-]/g, '')}`}><Phone size={16} />{contact.phone}</Link>}
            {contact.email && <Link className="shop-action-button" href={`mailto:${contact.email}`}><Mail size={16} />{contact.email}</Link>}
            {contact.whatsapp && <Link className="shop-action-button" href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} />{contact.whatsappLabel}<ArrowUpRight size={15} /></Link>}
          </div>
          {!hasContact && <p className="shop-pending">{contact.pending}</p>}
          <h4>{contact.socialTitle}</h4>
          {contact.socials.length > 0 ? <div className="shop-socials">{contact.socials.map(social => <Link className="shop-action-button shop-social-button" key={social.url} href={social.url} target="_blank" rel="noopener noreferrer">{social.label}<ArrowUpRight size={14} /></Link>)}</div> : <p className="shop-pending">{contact.socialPending}</p>}
        </div>
      </div>
      <div className="shop-map">
        {visit.mapEmbedUrl ? <iframe src={visit.mapEmbedUrl} title={visit.mapTitle} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /> : <div className="shop-map-placeholder"><MapPin size={38} strokeWidth={1} aria-hidden="true" /><span>{site.brand.name}</span><p>{visit.mapPending}</p></div>}
      </div>
    </div>
    <div className="shop-courier"><Truck size={30} strokeWidth={1.3} aria-hidden="true" /><div><div className="eyebrow">{courier.badge}</div><h3>{courier.title}</h3><p>{courier.summary}</p>{detailed && <p>{courier.details}</p>}</div><Link className="text-button" href="/collection">{courier.linkLabel}<ArrowRight size={17} /></Link></div>
  </section>
}
