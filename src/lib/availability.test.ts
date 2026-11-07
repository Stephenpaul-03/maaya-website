import { describe, expect, it } from 'vitest'
import { buildAvailabilityUrl, buildEmailAvailabilityUrl } from './availability'
import { inquiry, site } from '../content'

describe('WhatsApp availability request', () => {
  const book = { id: 42, title: 'Tea & Time? #1', author: 'Zoë García', languageLabel: 'English, Tamil' }
  it('creates a wa.me chat with the full encoded wishlist message', () => {
    const href = buildAvailabilityUrl([book])!
    const url = new URL(href)
    expect(url.origin).toBe('https://wa.me')
    expect(url.pathname).toBe(`/${inquiry.businessNumber}`)
    expect([...url.searchParams.keys()]).toEqual(['text'])
    const message = url.searchParams.get('text')!
    expect(message).toContain(`Hello ${site.brand.name} team,`)
    expect(message).toContain('1. Tea & Time? #1 — Zoë García (English, Tamil)')
    expect(message).toContain('\n\n')
    expect(message).toContain('Please let me know which titles are available, their prices, and the available editions.')
    expect(href).toContain('%20')
    expect(href).toContain('%0A')
    expect(url.hash).toBe('')
  })
  it('uses the configured number and message template and removes duplicate entries', () => {
    const config = { ...inquiry, businessNumber: '12025550123', body: { ...inquiry.body, introduction: '{count} titles for {brand}' } }
    const url = new URL(buildAvailabilityUrl([book, book], config)!)
    expect(url.pathname).toBe('/12025550123')
    expect(url.searchParams.get('text')).toContain(`1 titles for ${site.brand.name}`)
    expect(url.searchParams.get('text')?.match(/Tea & Time/g)).toHaveLength(1)
  })
  it('does not create a request without books or a valid international number', () => {
    expect(buildAvailabilityUrl([])).toBeNull()
    for (const businessNumber of ['', '+91 6380609162', 'invalid', '0123456789', '12345', '1234567890123456', '1234567?text=bad']) {
      expect(buildAvailabilityUrl([book], { ...inquiry, businessNumber })).toBeNull()
    }
  })
  it('keeps different language editions separate and preserves native-script titles', () => {
    const arabic = { id: 50, title: 'كتاب', author: 'كاتب', languageLabel: 'Arabic' }
    const english = { id: 51, title: 'كتاب', author: 'كاتب', languageLabel: 'English' }
    const body = new URL(buildAvailabilityUrl([arabic, english])!).searchParams.get('text')!
    expect(body).toContain('1. كتاب — كاتب (Arabic)')
    expect(body).toContain('2. كتاب — كاتب (English)')
  })
})

describe('email availability request', () => {
  const book = { id: 42, title: 'Tea & Time? #1', author: 'Zoë García', languageLabel: 'English, Tamil' }
  it('uses mailto with recipient, encoded subject, and the same wishlist as WhatsApp', () => {
    const email = new URL(buildEmailAvailabilityUrl([book])!)
    const chat = new URL(buildAvailabilityUrl([book])!)
    expect(email.protocol).toBe('mailto:')
    expect(decodeURIComponent(email.pathname)).toBe(inquiry.email.recipient)
    expect(email.searchParams.get('subject')).toContain(site.brand.name)
    expect(email.searchParams.get('body')?.replaceAll('\r', '')).toBe(chat.searchParams.get('text'))
    expect(email.hash).toBe('')
    expect([...email.searchParams.keys()]).toEqual(['subject', 'body'])
  })
  it('keeps the channels independent and rejects empty or malformed email recipients', () => {
    expect(buildEmailAvailabilityUrl([], inquiry)).toBeNull()
    expect(buildEmailAvailabilityUrl([book], { ...inquiry, businessNumber: '' })).not.toBeNull()
    for (const recipient of ['', 'invalid', 'a@example.com\r\nBcc:b@example.com']) {
      const config = { ...inquiry, email: { ...inquiry.email, recipient } }
      expect(buildEmailAvailabilityUrl([book], config)).toBeNull()
      expect(buildAvailabilityUrl([book], config)).not.toBeNull()
    }
  })
})
