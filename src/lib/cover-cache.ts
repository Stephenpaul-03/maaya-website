import type { Book } from '../books'
import { publicPath } from './site-url'

type Entry = { status?: string; title?: string; author?: string; languageIds?: string[]; path?: string }
type Manifest = { version?: number; books?: Record<string, Entry> }
let manifestRequest: Promise<Manifest> | undefined

export function loadCoverManifest(): Promise<Manifest> {
  // All cover instances share one request. The browser never contacts Google Books.
  manifestRequest ??= fetch(publicPath('/book-covers/manifest.json'))
    .then(response => response.ok ? response.json() : {})
    .catch(() => ({}))
  return manifestRequest
}

export function cachedCoverUrl(book: Book, manifest: Manifest): string | undefined {
  if (manifest?.version !== 1) return undefined
  const entry = manifest.books?.[book.id]
  if (!entry || entry.status !== 'ready' || entry.title !== book.title || entry.author !== book.author
    || JSON.stringify(entry.languageIds) !== JSON.stringify(book.languageIds) || typeof entry.path !== 'string') return undefined
  if (/^book-covers\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(entry.path)) return publicPath(`/${entry.path}`)
  // Future storage adapters can publish an HTTPS S3/CDN URL in the same manifest.
  try { const url = new URL(entry.path); if (url.protocol === 'https:' && !url.username && !url.password) return url.href } catch { /* Invalid entry falls back to the illustrated cover. */ }
}
