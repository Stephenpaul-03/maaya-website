// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HomepageEditor } from './HomepageEditor'
import home from '../../.cache/content/home.json'
import catalog from '../../.cache/content/catalog.json'
import lists from '../../.cache/content/reading-lists.json'
import journal from '../../.cache/content/journal.json'
const snapshot = { content: { home, catalog, 'reading-lists': lists, journal }, revisions: { home: 'h', catalog: 'c', journal: 'j', 'reading-lists': 'l' }, token: 'local-token' }
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('explains an old server HTML response without losing the journal selection', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<!doctype html><h1>404</h1>', { status: 404, headers: { 'Content-Type': 'text/html' } })))
  const onSaved = vi.fn()
  render(<HomepageEditor snapshot={snapshot} onSaved={onSaved} onClose={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Journal article'), { target: { value: 'the-art-of-noticing' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save homepage' }))
  await screen.findByText(/run npm run edit again/)
  expect((screen.getByLabelText('Journal article') as HTMLSelectElement).value).toBe('the-art-of-noticing')
  expect(onSaved).not.toHaveBeenCalled()
})
it('collects all homepage choices in one save and retains their order', async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ backup: 'homepage-backup' }))
  vi.stubGlobal('fetch', fetchMock)
  const onSaved = vi.fn().mockResolvedValue(undefined)
  render(<HomepageEditor snapshot={snapshot} onSaved={onSaved} onClose={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Move Hero books 1 later' }))
  fireEvent.click(screen.getByRole('button', { name: 'Move Collection books 1 later' }))
  fireEvent.click(screen.getByRole('button', { name: 'Move Reading lists 1 later' }))
  const article = journal.articles.find(item => item.slug !== home.journal.featuredArticleSlug)!
  fireEvent.change(screen.getByLabelText('Journal article'), { target: { value: article.slug } })
  expect(fetchMock).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Save homepage' }))
  await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith('homepage-backup'))
  expect(fetchMock.mock.calls[0][0]).toBe('/__editor/api/homepage')
  const body = JSON.parse(fetchMock.mock.calls[0][1].body)
  expect(body.homepage).toEqual({ heroBookIds: [home.hero.featuredBookIds[1], home.hero.featuredBookIds[0], home.hero.featuredBookIds[2]], collectionBookIds: [2, 1, 3, 4, 5, 6], readingListSlugs: [lists.lists[1].slug, lists.lists[0].slug, lists.lists[2].slug], journalSlug: article.slug })
})
it('keeps choices on save failure and confirms discarding them', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Catalog changed on disk.' }, { status: 400 })))
  const onClose = vi.fn()
  render(<HomepageEditor snapshot={snapshot} onSaved={vi.fn()} onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Move Collection books 1 later' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save homepage' }))
  await screen.findByText('Catalog changed on disk.')
  expect((screen.getByLabelText('Collection books · 1') as HTMLSelectElement).value).toBe('2')
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(onClose).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
  expect(onClose).toHaveBeenCalledOnce()
})
