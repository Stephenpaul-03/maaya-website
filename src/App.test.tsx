// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import RealApp from './App'
import { StationeryShopDetails } from './components/Stationery'
import { useSyncExternalStore } from 'react'

vi.mock('next/router', () => {
  const router = {
    push: async (path: string) => { window.location.hash = path; fireEvent(window, new HashChangeEvent('hashchange')); return true },
    replace: async () => true,
  }
  return { default: router, useRouter: () => router }
})
const subscribe = (callback: () => void) => { window.addEventListener('hashchange', callback); return () => window.removeEventListener('hashchange', callback) }
function App() {
  const route = useSyncExternalStore(subscribe, () => window.location.hash.slice(1) || '/', () => '/')
  return <RealApp route={route} />
}
import { inquiry, home, stationery } from './content'
import { readingLists } from './editorial'
import { books, languages } from './books'
import { offers } from './lib/offers'

beforeEach(() => {
  localStorage.clear()
  window.location.hash = '/'
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: query.includes('reduced-motion'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })) })
  window.scrollTo = vi.fn()
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
afterEach(cleanup)

async function openRoute(path: string) {
  window.location.hash = path
  fireEvent(window, new HashChangeEvent('hashchange'))
  await waitFor(() => expect(document.querySelector('#page-content[inert]')).toBeNull())
}
describe('bookshop journeys', () => {
  it('connects configured stationery shop details to working contact and map links', () => {
    const data = { ...stationery.shop, address: 'Test Shop\nChennai', hours: 'Mon–Sat · 10 am–7 pm', phone: '+91 98765 43210', email: 'shop@example.com', whatsapp: '919876543210', directionsUrl: 'https://www.google.com/maps?q=Chennai', mapEmbedUrl: 'https://www.google.com/maps?q=Chennai&output=embed' }
    render(<StationeryShopDetails data={data} />)
    expect(screen.getByRole('link', { name: data.phone }).getAttribute('href')).toBe('tel:+919876543210')
    expect(screen.getByRole('link', { name: data.email }).getAttribute('href')).toBe('mailto:shop@example.com')
    expect(screen.getByRole('link', { name: data.whatsappLabel }).getAttribute('href')).toBe('https://wa.me/919876543210')
    expect(screen.getByRole('link', { name: data.directionsLabel }).getAttribute('href')).toBe(data.directionsUrl)
    expect(screen.getByTitle(data.mapTitle).getAttribute('src')).toBe(data.mapEmbedUrl)
    expect(screen.queryByText(data.contactPending)).toBeNull()
  })

  it('gives the stationery shop its own shell and mobile navigation', () => {
    render(<RealApp route="/stationery" />)
    expect(screen.getAllByRole('banner')).toHaveLength(1)
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(stationery.hero.title)
    expect(screen.queryByRole('button', { name: 'Search books' })).toBeNull()
    expect(screen.queryByRole('link', { name: /My bookshelf/ })).toBeNull()
    expect(document.title).toBe(stationery.metadata.title)
    expect(screen.getByRole('heading', { name: stationery.shop.title })).toBeTruthy()
    const showcase = screen.getByRole('region', { name: stationery.showcase.title })
    expect(within(showcase).getAllByRole('article')).toHaveLength(8)
    for (const item of stationery.showcase.items) expect(within(showcase).getByRole('heading', { name: item.name })).toBeTruthy()
    expect(screen.getByText(stationery.shop.addressPending)).toBeTruthy()
    expect(screen.getByText(stationery.shop.hoursPending)).toBeTruthy()
    expect(screen.getByText(stationery.shop.contactPending)).toBeTruthy()
    expect(within(screen.getByRole('list', { name: stationery.value.comparison.usualLabel })).getAllByRole('listitem')).toHaveLength(5)
    expect(within(screen.getByRole('list', { name: stationery.value.comparison.directLabel })).getAllByRole('listitem')).toHaveLength(4)
    expect(document.querySelector('.stationery-header')?.hasAttribute('data-reveal')).toBe(false)
    expect(document.querySelector('main')?.hasAttribute('data-reveal')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Open stationery menu' }))
    const menu = screen.getByRole('navigation', { name: 'Stationery mobile navigation' })
    fireEvent.click(within(menu).getByRole('link', { name: stationery.nav.range }))
    expect(screen.queryByRole('navigation', { name: 'Stationery mobile navigation' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Open stationery menu' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('renders homepage curation in the saved order', () => {
    const ids = books.slice(0, 6).map(book => book.id).reverse()
    const slugs = readingLists.slice(0, 3).map(list => list.slug).reverse()
    render(<RealApp route="/" homeContent={{ ...home, hero: { ...home.hero, featuredBookIds: ids.slice(0, 3) }, collection: { ...home.collection, featuredBookIds: ids }, readingLists: { ...home.readingLists, featuredSlugs: slugs } }} />)
    const titles = [...document.querySelectorAll('.home-collection .book-card .book-title')].map(node => node.textContent)
    expect(titles).toEqual(ids.map(id => books.find(book => book.id === id)!.title))
    expect([...document.querySelectorAll('.home-lists .list-card')].map(node => node.getAttribute('href'))).toEqual(slugs.map(slug => '/reading-lists/' + slug))
    expect(document.querySelector('.hero-book-left')?.getAttribute('aria-label')).toContain(books.find(book => book.id === ids[0])!.title)
  })
  it('renders an unsaved journal through the real article layout', () => {
    render(<RealApp route="/journal/__draft" editorialDraft={{ kind: 'journal', entry: { slug: 'draft', title: 'Draft journal title', category: 'Notes', time: '2 min', intro: 'Draft intro', paragraphs: ['Unsaved paragraph'], book: books[0].id, artStyle: 'feather' } }} />)
    expect(document.querySelector('.article-page h1')?.textContent).toBe('Draft journal title')
    expect(document.querySelector('.article-body')?.textContent).toContain('Unsaved paragraph')
    expect(document.querySelector('.article-companion')?.textContent).toContain(books[0].title)
  })
  it('renders the unsaved reading-list card with its selected colour and books', () => {
    render(<RealApp route="/reading-lists" editorialDraft={{ kind: 'reading-lists', entry: { slug: 'draft', title: 'Draft list', label: 'Curated', description: 'Preview description', ids: [books[0].id], color: 'clay', icon: '✳' } }} />)
    expect(document.querySelectorAll('.list-card')).toHaveLength(1)
    expect(document.querySelector('.list-card.clay h2')?.textContent).toBe('Draft list')
    expect(document.querySelectorAll('.mini-shelf .cover')).toHaveLength(1)
  })
  it('limits the home preview to six books without reducing the full collection', async () => {
    render(<App />)
    expect(document.querySelectorAll('.home-collection .book-card')).toHaveLength(Math.min(6, books.length))
    await openRoute('/collection')
    await waitFor(() => expect(document.querySelectorAll('.catalog .book-card')).toHaveLength(books.length))
  })
  it('places shop information last before the footer without a repeated closing pitch', () => {
    render(<App />)
    const page = document.getElementById('page-content')!
    const sections = [...page.children].map(element => element.className)
    expect(sections.indexOf('shop-info')).toBeGreaterThan(sections.indexOf('hero'))
    expect(sections.at(-1)).toBe('shop-info')
    expect(sections.indexOf('collection home-collection')).toBeLessThan(sections.indexOf('home-lists'))
    expect(sections.indexOf('home-lists')).toBeLessThan(sections.indexOf('home-journal'))
    expect(document.querySelector('.closing, .manifesto')).toBeNull()
    expect(page.style.opacity).toBe('1')
    expect(document.querySelector<HTMLElement>('.book-card')!.style.opacity).toBe('1')
  })
  it('keeps homepage layout attached to the outgoing page until its exit completes', async () => {
    render(<App />)
    const outgoingPage = document.getElementById('page-content')!
    expect(outgoingPage.classList.contains('home-page')).toBe(true)
    window.location.hash = '/collection'
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(outgoingPage.classList.contains('home-page')).toBe(true)
    await waitFor(() => expect(document.getElementById('page-content')).not.toBe(outgoingPage))
    expect(document.getElementById('page-content')!.classList.contains('home-page')).toBe(false)
  })
  it('persists dark mode across remounts', async () => {
    const view = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
    expect(JSON.parse(localStorage.getItem('dog-ear-theme')!)).toBe('dark')
    view.unmount(); render(<App />)
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy()
  })
  it('filters the collection and opens full book pages through search', async () => {
    window.location.hash = '/collection'; render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Nature' }))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'The Creative Act' })).toBeNull())
    expect(screen.getByRole('link', { name: 'Braiding Sweetgrass' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Search books' }))
    const input = await screen.findByRole('textbox', { name: 'Search title, author, or genre' })
    fireEvent.change(input, { target: { value: 'Kawaguchi' } })
    fireEvent.click(screen.getByRole('button', { name: /Before the Coffee Gets Cold/ }))
    await screen.findByRole('heading', { level: 1, name: 'Before the Coffee Gets Cold' })
    expect(window.location.hash).toBe('#/book/2')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
  it('persists the purchase wishlist without reading controls and updates it when a book is removed', async () => {
    const view = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Save The Creative Act' }))
    await openRoute('/bookshelf')
    await screen.findByRole('heading', { name: 'The books you’d love to own.' })
    expect(screen.getByText('1 book on your wishlist')).toBeTruthy()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    view.unmount(); render(<App />)
    expect(screen.getByRole('link', { name: 'The Creative Act' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove The Creative Act' }))
    await screen.findByText('Your wishlist starts here.')
    expect(JSON.parse(localStorage.getItem('dog-ear-shelf')!)).toEqual([])
    expect((screen.getByRole('button', { name: inquiry.ui.button }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('keeps dialog mounted for its exit and restores focus after dismissing', async () => {
    render(<App />)
    const trigger = screen.getByRole('button', { name: 'Preview The Creative Act' })
    trigger.focus(); fireEvent.click(trigger)
    const dialog = await screen.findByRole('dialog')
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(trigger)
  })
  it('opens editorial destinations and saves a complete reading list', async () => {
    window.location.hash = '/reading-lists/a-quieter-weekend'; render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Save this reading list' }))
    expect(JSON.parse(localStorage.getItem('dog-ear-shelf')!)).toEqual([2, 3, 6])
    await openRoute('/journal/permission-to-read-slowly')
    await screen.findByRole('heading', { name: 'Permission to read slowly' })
    expect(screen.getByText(/Somewhere along the way/)).toBeTruthy()
    await openRoute('/about')
    await screen.findByRole('heading', { name: 'For the love of the page.' })
    expect(screen.getByText('Can I buy books here?')).toBeTruthy()
    await openRoute('/not-a-page')
    await screen.findByRole('heading', { name: 'This page wandered off.' })
  })
  it('links to a WhatsApp message for the entire wishlist while ignoring legacy reading data', async () => {
    localStorage.setItem('dog-ear-shelf', JSON.stringify([1, 2, 999]))
    localStorage.setItem('dog-ear-reading', JSON.stringify({
      1: { status: 'Reading', note: 'Private note that must not be shared' },
      2: { status: 'Want to read', note: '' },
    }))
    window.location.hash = '/bookshelf'
    render(<App />)
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    const link = screen.getByRole('link', { name: inquiry.ui.button }) as HTMLAnchorElement
    expect(link.target).toBe('_blank')
    const draft = new URL(link.href)
    expect(draft.origin).toBe('https://wa.me')
    expect(draft.pathname).toBe(`/${inquiry.businessNumber}`)
    expect(link.hasAttribute('download')).toBe(false)
    const emailLink = screen.getByRole('link', { name: inquiry.ui.emailButton }) as HTMLAnchorElement
    const emailDraft = new URL(emailLink.href)
    expect(emailDraft.protocol).toBe('mailto:')
    expect(decodeURIComponent(emailDraft.pathname)).toBe(inquiry.email.recipient)
    expect(emailLink.hasAttribute('download')).toBe(false)
    expect(emailLink.hasAttribute('target')).toBe(false)
    expect(emailDraft.searchParams.get('body')?.replaceAll('\r', '')).toBe(draft.searchParams.get('text'))
    expect(draft.searchParams.get('text')).toContain('The Creative Act — Rick Rubin')
    expect(draft.searchParams.get('text')).toContain('Before the Coffee Gets Cold — Toshikazu Kawaguchi')
    expect(draft.searchParams.get('text')).not.toContain('Private note')
    expect(draft.searchParams.get('text')).not.toContain('999')
    expect(screen.getByText('Ask our bookshop about all 2 saved books by WhatsApp or email.')).toBeTruthy()
  })
  it('disables the availability request on an empty shelf', () => {
    window.location.hash = '/bookshelf'
    render(<App />)
    expect((screen.getByRole('button', { name: inquiry.ui.button }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('link', { name: inquiry.ui.button })).toBeNull()
    expect((screen.getByRole('button', { name: inquiry.ui.emailButton }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('combines language and genre filters, searches native labels, and renders RTL titles', async () => {
    const arabic = languages.find(language => language.id === 'ar')!
    const fixture = { ...books[0], id: 99, title: 'كتاب للتجربة', genreId: 'fiction', genre: 'Fiction', languageIds: ['ar'], languageLabel: arabic.label, languageSearch: `${arabic.id} ${arabic.label} ${arabic.nativeLabel}`, primaryLanguage: arabic }
    books.push(fixture)
    try {
      window.location.hash = '/collection'
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Fiction' }))
      fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'ar' } })
      await waitFor(() => expect(screen.queryByRole('link', { name: 'Before the Coffee Gets Cold' })).toBeNull())
      const title = screen.getByRole('link', { name: fixture.title })
      expect(title.getAttribute('lang')).toBe('ar')
      expect(title.getAttribute('dir')).toBe('rtl')
      fireEvent.change(screen.getByRole('textbox', { name: 'Search collection' }), { target: { value: 'العربية' } })
      expect(screen.getByRole('link', { name: fixture.title })).toBeTruthy()
      fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'en' } })
      await screen.findByText('No books on this shelf just yet.')
      fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
      expect((screen.getByRole('combobox', { name: 'Language' }) as HTMLSelectElement).value).toBe('')
      expect((screen.getByRole('textbox', { name: 'Search collection' }) as HTMLInputElement).value).toBe('')
      await screen.findByRole('link', { name: 'The Creative Act' })
    } finally { cleanup(); books.pop() }
  })

  it('places the offers section at the configured homepage slot and can hide it', async () => {
    const originalPosition = offers.position
    const originalEnabled = offers.enabled
    try {
      offers.position = 'after-journal'
      const view = render(<App />)
      const journal = document.querySelector('.home-journal h2')!
      const deals = screen.getByRole('heading', { name: offers.title })
      expect(journal.compareDocumentPosition(deals) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(screen.getAllByRole('heading', { name: offers.title })).toHaveLength(1)
      offers.enabled = false
      view.rerender(<App />)
      await waitFor(() => expect(screen.queryByRole('heading', { name: offers.title })).toBeNull())
    } finally { cleanup(); offers.position = originalPosition; offers.enabled = originalEnabled }
  })
  it('copies an offer code and exposes its configurable terms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: offers.labels.copyCode }))
    expect(writeText).toHaveBeenCalledWith(offers.items[0].code)
    await screen.findByText(offers.labels.copied)
    expect(screen.getByText(offers.items[0].terms)).toBeTruthy()
  })

})
