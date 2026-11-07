import { useEffect, useState, type MouseEvent } from 'react'
import App from '../App'
import type { PreviewDraft } from './DraftPreview'
import { Offers } from '../components/Offers'
import { activeOffers } from '../lib/offers'

const guardPreview = (event: MouseEvent) => {
  const target = event.target as Element
  if (target.closest('a, button') && !target.closest('.theme-toggle')) { event.preventDefault(); event.stopPropagation() }
}

export default function EditorialPreview() {
  const [preview, setPreview] = useState<{ draft: PreviewDraft; view: 'page' | 'card' }>()
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer) }, [])
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return
      if (event.data?.type === 'editor-preview-connect') { window.parent.postMessage({ type: 'editor-preview-ready' }, window.location.origin); return }
      if (event.data?.type !== 'editor-preview-draft') return
      const { draft, view } = event.data
      if (!draft?.entry || !['journal', 'reading-lists', 'offers', 'home'].includes(draft.kind) || !['page', 'card'].includes(view)) return
      setPreview({ draft, view })
    }
    window.addEventListener('message', receive)
    window.parent.postMessage({ type: 'editor-preview-ready' }, window.location.origin)
    return () => window.removeEventListener('message', receive)
  }, [])
  if (!preview) return <p style={{ padding: 32 }}>Waiting for your draft…</p>
  if (preview.draft.kind === 'home') return <div onClickCapture={guardPreview}><App route="/" homeContent={preview.draft.entry} previewMode /></div>
  if (preview.draft.kind === 'offers') return <main onClickCapture={guardPreview}>{activeOffers(preview.draft.entry, now).length === 0 && <div className="editor-preview-empty" role="status"><h2>No offers are visible</h2><p>{preview.draft.entry.enabled ? 'The coupons are paused, outside their schedule, or the list is empty.' : 'Show offers section is turned off.'}</p><p>Enable an offer or switch off “Preview whole section” to see the selected coupon’s design.</p></div>}<Offers position={preview.draft.entry.position} config={preview.draft.entry} /></main>
  const route = '/' + preview.draft.kind + (preview.view === 'page' ? '/__draft' : '')
  return <div onClickCapture={guardPreview}><App route={route} editorialDraft={preview.draft} previewMode /></div>
}
