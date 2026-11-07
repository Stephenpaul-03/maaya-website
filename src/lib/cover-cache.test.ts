import { describe, expect, it } from 'vitest'
import { books } from '../books'
import { cachedCoverUrl } from './cover-cache'

describe('cached cover URLs', () => {
  const book = books[0]
  const entry = { status: 'ready', title: book.title, author: book.author, languageIds: book.languageIds, path: 'book-covers/1-example.png' }
  it('uses local cached assets and supports a future HTTPS storage URL', () => {
    expect(cachedCoverUrl(book, { version: 1, books: { [book.id]: entry } })).toBe('/book-covers/1-example.png')
    expect(cachedCoverUrl(book, { version: 1, books: { [book.id]: { ...entry, path: 'https://cdn.example.com/cover.png' } } })).toBe('https://cdn.example.com/cover.png')
  })
  it('rejects stale, missing, malformed, and unsafe records', () => {
    expect(cachedCoverUrl(book, {})).toBeUndefined()
    for (const change of [{ author: 'Other Author' }, { languageIds: ['fr'] }, { status: 'missing' }, { path: 'javascript:alert(1)' }, { path: '../cover.png' }]) {
      expect(cachedCoverUrl(book, { version: 1, books: { [book.id]: { ...entry, ...change } } })).toBeUndefined()
    }
  })
})
