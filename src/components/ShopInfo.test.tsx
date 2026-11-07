// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import content from '../../.cache/content/shop.json'
import { ShopInfo, type ShopContent } from './ShopInfo'

afterEach(cleanup)
describe('shared shop information', () => {
  it('shows honest placeholders without fake contact links or an unrelated map', () => {
    const empty: ShopContent = {
      ...content,
      contact: { ...content.contact, phone: '', email: '', whatsapp: '', socials: [] },
      visit: { ...content.visit, address: [], hours: [], directionsUrl: '', mapEmbedUrl: '' },
    }
    render(<ShopInfo data={empty} />)
    expect(screen.getByText(content.visit.mapPending)).toBeTruthy()
    expect(screen.getByText(content.contact.pending)).toBeTruthy()
    expect(document.querySelector('iframe')).toBeNull()
    expect(document.querySelector('a[href^="tel:"], a[href^="mailto:"]')).toBeNull()
    expect(screen.getByRole('link', { name: content.storyLink }).getAttribute('href')).toBe('/about')
    expect(screen.queryByText(content.courier.details)).toBeNull()
  })

  it('renders complete demo details in the default preview', () => {
    render(<ShopInfo />)
    expect(screen.getByText(content.demoNotice)).toBeTruthy()
    expect(screen.getByText(content.visit.address[1])).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Instagram' })).toBeTruthy()
    expect(screen.getByRole('link', { name: content.contact.email })).toBeTruthy()
    expect(screen.getByRole('link', { name: content.visit.directionsLabel })).toBeTruthy()
    expect(screen.getByTitle(content.visit.mapTitle).getAttribute('src')).toBe(content.visit.mapEmbedUrl)
  })

  it('activates the map and contact links from configured content on the detailed page', () => {
    const configured: ShopContent = {
      ...content,
      contact: { ...content.contact, phone: '+91 12345 67890', email: 'shop@example.com', whatsapp: '911234567890', socials: [{ label: 'Instagram', url: 'https://www.instagram.com/example/' }] },
      visit: { ...content.visit, address: ['Example address'], hours: ['Monday–Saturday, 10–6'], directionsUrl: 'https://maps.google.com/', mapEmbedUrl: 'https://www.google.com/maps/embed?pb=example' },
    }
    render(<ShopInfo detailed data={configured} />)
    expect(screen.getByRole('link', { name: configured.contact.phone }).getAttribute('href')).toBe('tel:+911234567890')
    expect(screen.getByRole('link', { name: configured.contact.email }).getAttribute('href')).toBe('mailto:shop@example.com')
    expect(screen.getByRole('link', { name: configured.contact.whatsappLabel }).getAttribute('href')).toBe('https://wa.me/911234567890')
    expect(screen.getByRole('link', { name: 'Instagram' }).getAttribute('href')).toBe(configured.contact.socials[0].url)
    expect(screen.getByTitle(configured.visit.mapTitle).getAttribute('src')).toBe(configured.visit.mapEmbedUrl)
    expect(screen.getByText('Example address')).toBeTruthy()
    expect(screen.getByText(configured.courier.details)).toBeTruthy()
    expect(screen.queryByRole('link', { name: configured.storyLink })).toBeNull()
  })
})
