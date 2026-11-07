import { useEffect, useRef, useState } from 'react'
import type { EditorialDraft, HomeContent } from '../App'
import type { OffersConfig } from '../lib/offers'
export type PreviewDraft = EditorialDraft | { kind: 'offers'; entry: OffersConfig } | { kind: 'home'; entry: HomeContent }

export function DraftPreview({ draft }: { draft: PreviewDraft }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState({ width: 1200, height: 800 })
  const [mobile, setMobile] = useState(false)
  const [view, setView] = useState<'page' | 'card'>('page')
  const [ready, setReady] = useState(0)
  useEffect(() => {
    if (!viewport.current || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setBounds({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(viewport.current)
    return () => observer.disconnect()
  }, [])
  const width = mobile ? 390 : 1200
  const scale = Math.min(1, Math.max(1, bounds.width) / width)
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === 'editor-preview-ready') setReady(value => value + 1)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [])
  useEffect(() => {
    if (ready) frame.current?.contentWindow?.postMessage({ type: 'editor-preview-draft', draft, view }, window.location.origin)
  }, [draft, view, ready])
  return <section className="editor-draft-preview" aria-label="Live draft preview">
    <div className="editor-preview-controls">
      <div><strong>Live preview</strong><small>Unsaved · navigation and save actions are disabled</small></div>
      {(draft.kind === 'journal' || draft.kind === 'reading-lists') && <div role="group" aria-label="Preview content"><button type="button" aria-pressed={view === 'page'} onClick={() => setView('page')}>Page</button><button type="button" aria-pressed={view === 'card'} onClick={() => setView('card')}>Listing card</button></div>}
      <div role="group" aria-label="Draft preview size"><button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)}>Desktop preview</button><button type="button" aria-pressed={mobile} onClick={() => setMobile(true)}>Mobile preview</button></div>
    </div>
    <div className="editor-draft-viewport" ref={viewport}><iframe ref={frame} onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'editor-preview-connect' }, window.location.origin)} className={mobile ? 'draft-mobile' : ''} style={{ width, height: Math.max(1, bounds.height) / scale, transform: `translateX(-50%) scale(${scale})` }} src="/__editor-preview" title="Unsaved editorial preview" /></div>
    {!ready && <p role="status">Loading storefront preview…</p>}
  </section>
}
