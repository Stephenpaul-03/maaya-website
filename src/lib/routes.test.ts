import { describe, expect, it } from 'vitest'
import { routes, pageMetadata } from './routes'
import { books } from '../books'
describe('pre-rendered routes and metadata', () => {
  it('includes every catalog book as a real route without hashes', () => {
    for (const book of books) expect(routes).toContain('/book/' + book.id)
    expect(new Set(routes).size).toBe(routes.length)
    expect(routes.every(route => !route.includes('#'))).toBe(true)
  })
  it('provides book-specific metadata and structured data', () => {
    const metadata = pageMetadata('/book/1')
    expect(metadata.title).toContain(books[0].title)
    expect(metadata.description).toBe(books[0].description)
    expect(metadata.book?.['@type']).toBe('Book')
    expect(metadata.noindex).toBe(false)
  })
  it('keeps personal shelves and unknown routes out of search results', () => {
    expect(pageMetadata('/bookshelf').noindex).toBe(true)
    expect(pageMetadata('/missing').noindex).toBe(true)
  })
})
