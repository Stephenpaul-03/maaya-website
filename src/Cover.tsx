import type { Book } from './books'
import { useEffect, useState } from 'react'
import { cachedCoverUrl, loadCoverManifest } from './lib/cover-cache'
import cachedManifest from '../public/book-covers/manifest.json'
export function Cover({ book }: { book: Book }) {
  const [manifest, setManifest] = useState<Awaited<ReturnType<typeof loadCoverManifest>>>(cachedManifest)
  const [failedUrl, setFailedUrl] = useState<string>()
  useEffect(() => {
    let active = true
    void loadCoverManifest().then(data => { if (active) setManifest(data) })
    return () => { active = false }
  }, [])
  const url = cachedCoverUrl(book, manifest)
  return <div className={`cover ${book.style}`} aria-hidden="true"><span className="cover-author">{book.author}</span><span className="cover-title" lang={book.primaryLanguage.id} dir={book.primaryLanguage.direction}>{book.title}</span><span className="cover-art"><i /><i /><i /></span><span className="cover-footer">{book.cover.footer}</span>{url && url !== failedUrl && <img className="cached-cover-image" src={url} alt="" loading="lazy" decoding="async" onError={() => setFailedUrl(url)} />}</div>
}
