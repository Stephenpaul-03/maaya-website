import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { bestCover, coverCandidates, chooseVolume, downloadImage, imageUrl, syncCovers } from './sync-book-covers.mjs'

const book = { id: 1, title: 'The Creative Act', author: 'Rick Rubin', languageIds: ['en'], year: '2023' }
const volume = { id: 'example', volumeInfo: { title: book.title, authors: [book.author], language: 'en', imageLinks: { thumbnail: 'http://books.google.com/books/content?id=example' } } }
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
const directories = []
afterEach(async () => { await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true }))) })
async function setup() {
  const directory = await mkdtemp(path.join(tmpdir(), 'book-cover-test-'))
  directories.push(directory)
  return { directory, books: [book], apiKey: 'test-key', pause: async () => {}, log: () => {} }
}
const successfulFetch = () => vi.fn(async url => String(url).includes('googleapis.com')
  ? Response.json(new URL(url).pathname.endsWith('/volumes') ? { items: [volume] } : volume) : new Response(png, { headers: { 'Content-Type': 'image/png' } }))

describe('Google Books cover cache', () => {
  it('downloads once, persists bytes, and skips both Google requests on the next run', async () => {
    const options = await setup()
    const fetchImpl = successfulFetch()
    expect((await syncCovers({ ...options, fetchImpl })).downloaded).toBe(1)
    const manifest = JSON.parse(await readFile(path.join(options.directory, 'manifest.json'), 'utf8'))
    const file = path.join(options.directory, path.basename(manifest.books[1].path))
    expect(await readFile(file)).toEqual(png)
    expect(JSON.stringify(manifest)).not.toContain('test-key')
    expect((await syncCovers({ ...options, apiKey: undefined, fetchImpl })).cached).toBe(1)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    await unlink(file)
    expect((await syncCovers({ ...options, fetchImpl })).downloaded).toBe(1)
    expect(fetchImpl).toHaveBeenCalledTimes(6)
  })
  it('refetches when the catalog identity changes', async () => {
    const options = await setup()
    const fetchImpl = successfulFetch()
    await syncCovers({ ...options, fetchImpl })
    const next = await syncCovers({ ...options, books: [{ ...book, author: 'Another Author' }], fetchImpl })
    expect(next.missing).toBe(1)
    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })
  it('caches no-match results and offers a network-free dry run', async () => {
    const options = await setup()
    const fetchImpl = vi.fn(async () => Response.json({ totalItems: 0 }))
    expect((await syncCovers({ ...options, dryRun: true, fetchImpl })).planned).toBe(1)
    expect(fetchImpl).not.toHaveBeenCalled()
    await syncCovers({ ...options, fetchImpl })
    expect((await syncCovers({ ...options, fetchImpl })).missing).toBe(1)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await syncCovers({ ...options, refresh: true, fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
  it('retains the previous cache on download failure and stops on invalid credentials', async () => {
    const options = await setup()
    await syncCovers({ ...options, fetchImpl: successfulFetch() })
    const before = await readFile(path.join(options.directory, 'manifest.json'), 'utf8')
    const fetchImpl = vi.fn(async url => String(url).includes('googleapis.com') ? Response.json({ items: [volume] }) : new Response('<html>Error</html>'))
    expect((await syncCovers({ ...options, refresh: true, fetchImpl })).failed).toBe(1)
    expect(await readFile(path.join(options.directory, 'manifest.json'), 'utf8')).toBe(before)
    await expect(syncCovers({ ...options, refresh: true, fetchImpl: async () => new Response('', { status: 403 }) })).rejects.toThrow('HTTP 403')
    expect(await readFile(path.join(options.directory, 'manifest.json'), 'utf8')).toBe(before)
  })
  it('rejects unrelated books, unsafe URLs, and non-image responses', async () => {
    expect(chooseVolume(book, [{ ...volume, volumeInfo: { ...volume.volumeInfo, title: 'A different book' } }])).toBeUndefined()
    expect(chooseVolume(book, [{ ...volume, volumeInfo: { ...volume.volumeInfo, language: 'fr' } }])).toBeUndefined()
    expect(imageUrl('http://127.0.0.1/private')).toBeNull()
    expect(imageUrl('http://books.google.com/books/content?id=example')).toMatch(/^https:/)
    await expect(downloadImage(volume.volumeInfo.imageLinks.thumbnail, async () => new Response('<svg/>'))).rejects.toThrow('supported cover image')
  })
  it('retries temporary rate limits before downloading', async () => {
    const options = await setup()
    const success = successfulFetch()
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response('', { status: 429 })).mockImplementation(success)
    expect((await syncCovers({ ...options, fetchImpl })).downloaded).toBe(1)
    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })
  it('reads full metadata and prefers the largest published cover', async () => {
    const large = 'https://books.google.com/books/content?id=example&zoom=3'
    const fetchImpl = vi.fn(async url => String(url).includes('googleapis.com')
      ? Response.json({ ...volume, volumeInfo: { ...volume.volumeInfo, imageLinks: { ...volume.volumeInfo.imageLinks, large } } })
      : new Response(png))
    const result = await bestCover(volume, 'test-key', fetchImpl, async () => {})
    expect(result.imageSize).toBe('large')
    expect(result.source).toBe(large)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
  it('uses the previously matched volume when refreshed search results disappear', async () => {
    const options = await setup()
    await syncCovers({ ...options, fetchImpl: successfulFetch() })
    const fetchImpl = vi.fn(async url => new URL(url).pathname.endsWith('/volumes')
      ? Response.json({ items: [] }) : String(url).includes('googleapis.com') ? Response.json(volume) : new Response(png))
    expect((await syncCovers({ ...options, refresh: true, fetchImpl })).downloaded).toBe(1)
  })
  it('falls back when a larger cover fails and deduplicates identical URLs', async () => {
    const large = 'https://books.google.com/books/content?id=example&zoom=3'
    expect(coverCandidates({ large, medium: large })).toHaveLength(1)
    const fetchImpl = vi.fn(async url => String(url).includes('googleapis.com')
      ? Response.json({ ...volume, volumeInfo: { ...volume.volumeInfo, imageLinks: { ...volume.volumeInfo.imageLinks, large } } })
      : String(url) === large ? new Response('', { status: 404 }) : new Response(png))
    expect((await bestCover(volume, 'test-key', fetchImpl, async () => {})).imageSize).toBe('thumbnail')
  })
})
