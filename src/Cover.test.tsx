// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Cover } from './Cover'
import { books } from './books'
import { loadCoverManifest } from './lib/cover-cache'

vi.mock('./lib/cover-cache', async importOriginal => ({ ...await importOriginal<typeof import('./lib/cover-cache')>(), loadCoverManifest: vi.fn() }))
afterEach(cleanup)
it('renders a cached image and restores the illustrated fallback if it fails to load', async () => {
  const book = books[0]
  vi.mocked(loadCoverManifest).mockResolvedValue({ version: 1, books: { [book.id]: { status: 'ready', title: book.title, author: book.author, languageIds: book.languageIds, path: 'book-covers/example.jpg' } } })
  const { container } = render(<Cover book={book} />)
  await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('/book-covers/example.jpg'))
  fireEvent.error(container.querySelector('img')!)
  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelector('.cover-title')?.textContent).toBe(book.title)
})
