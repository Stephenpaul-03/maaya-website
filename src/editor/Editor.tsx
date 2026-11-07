import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fieldsFrom, matchFields, displayText, normalized, changesFrom, type Snapshot, type Field } from './model'
import { CreateEditorial, type EditorialKind } from './CreateEditorial'
import { CouponEditor } from './CouponEditor'
import { HomepageEditor } from './HomepageEditor'
import { ContentDashboard } from './ContentDashboard'

const endpoint = '/__editor/api/content'
const protectedContent = '.book-card, .cover, .list-card, .journal-card, .offer-card, .article-page, .full-book, .book-detail, .wishlist-row, .home-journal, .list-detail-note'
const isProtected = (element: Element) => Boolean(element.closest(protectedContent) || (element.closest('main') && /\/(book|journal|reading-lists)\/[^/]+/.test(element.ownerDocument.location?.pathname ?? '')))
export default function Editor() {
  const iframe = useRef<HTMLIFrameElement>(null)
  const [snapshot, setSnapshot] = useState<Snapshot>()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [mobile, setMobile] = useState(false)
  const [editing, setEditing] = useState(true)
  const [frameVersion, setFrameVersion] = useState(0)
  const [candidates, setCandidates] = useState<Field[]>([])
  const [selected, setSelected] = useState<string>('')
  const [showFields, setShowFields] = useState(false)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('Loading content…')
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [published, setPublished] = useState(false)
  const [creating, setCreating] = useState<EditorialKind>()
  const [couponsOpen, setCouponsOpen] = useState(false)
  const [homepageOpen, setHomepageOpen] = useState(false)
  const [previewRoute, setPreviewRoute] = useState('/')
  const contentMode = snapshot?.mode === 'content'
  const fields = useMemo(() => snapshot?.mode === 'content' ? [] : fieldsFrom(snapshot?.content || {}), [snapshot])
  const changes = useMemo(() => changesFrom(fields, drafts), [fields, drafts])
  const field = fields.find(item => item.id === selected)
  const brandField = fields.find(item => item.file === 'site' && item.path.join('.') === 'brand.name')
  const brand = brandField ? drafts[brandField.id] ?? brandField.value : ''
  // Keep event handlers stable while the user types, without reloading the preview.
  const live = useRef({ fields, drafts, brand, editing })
  useEffect(() => { live.current = { fields, drafts, brand, editing: !contentMode && editing } }, [fields, drafts, brand, editing, contentMode])
  const bindings = useRef(new Map<Text, { field: Field; original: string }>())
  const clickedText = useRef<Text | null>(null)

  const load = useCallback(async () => {
    const response = await fetch(endpoint, { cache: 'no-store' })
    if (!response.ok) throw new Error('Start the editor with npm run edit.')
    const data: Snapshot = await response.json()
    setSnapshot(data)
    return data
  }, [])
  useEffect(() => { void load().then(data => setMessage(data.mode === 'content' ? 'Content curation mode. Use Homepage, Coupons, New journal or New reading list. Inline text editing is disabled.' : 'Double-click text to edit. Switch to Browse to navigate.')).catch(error => setMessage(error.message)) }, [load])
  useEffect(() => {
    if (!changes.length) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [changes.length])

  const preview = useCallback(() => {
    const doc = iframe.current?.contentDocument
    if (!doc?.body) return
    const { fields, drafts, brand } = live.current
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
    let node: Node | null
    while ((node = walker.nextNode())) {
      const text = node as Text
      if (text.parentElement && isProtected(text.parentElement)) continue
      if (text.parentElement?.closest('script, style, textarea, input, [data-editor-ui]')) continue
      let binding = bindings.current.get(text)
      if (!binding) {
        const matches = matchFields(text.nodeValue || '', fields, drafts, brand)
        if (matches.length !== 1) continue
        binding = { field: matches[0], original: text.nodeValue || '' }
        bindings.current.set(text, binding)
      }
      const next = displayText(drafts[binding.field.id] ?? binding.field.value, brand)
      const whitespace = /^(\s*)[\s\S]*?(\s*)$/.exec(binding.original)
      const value = `${whitespace?.[1] || ''}${next}${whitespace?.[2] || ''}`
      if (text.nodeValue !== value) text.nodeValue = value
    }
    for (const text of bindings.current.keys()) if (!text.isConnected) bindings.current.delete(text)
  }, [])
  useEffect(() => { preview() }, [preview, fields, drafts, brand, frameVersion])

  useEffect(() => {
    const doc = iframe.current?.contentDocument
    if (!doc?.body || !snapshot) return
    const fromElement = (target: Element) => {
      if (isProtected(target)) return []
      const { fields, drafts, brand } = live.current
      // Prefer the smallest displayed text segment (including authored line breaks).
      let element: Element | null = target
      for (let depth = 0; element && depth < 4; depth++, element = element.parentElement) {
        const matches = matchFields(element.textContent || '', fields, drafts, brand)
        if (matches.length) return matches
      }
      return []
    }
    const onDoubleClick = (event: MouseEvent) => {
      if (!live.current.editing || !(event.target instanceof (doc.defaultView!.Element))) return
      const target = event.target as Element
      if (isProtected(target)) { setMessage('Book, journal, reading-list and coupon content is protected. Use npm run edit:content or its source JSON.'); return }
      if (target.closest('input, textarea, select')) return
      let matches = fromElement(target)
      // For headings containing emphasis/spans, match the text node under the pointer.
      const rangeDoc = doc as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null }
      const range = rangeDoc.caretRangeFromPoint?.(event.clientX, event.clientY)
      if (!matches.length && range?.startContainer.nodeType === Node.TEXT_NODE) matches = matchFields(range.startContainer.nodeValue || '', live.current.fields, live.current.drafts, live.current.brand)
      if (!matches.length) { setMessage('Select an authored text label, or use Fields for links and composed text.'); return }
      event.preventDefault(); event.stopPropagation()
      setCandidates(matches); setSelected(matches.length === 1 ? matches[0].id : ''); setShowFields(false)
      if (matches.length === 1 && target.childNodes.length === 1 && target.firstChild?.nodeType === Node.TEXT_NODE) {
        bindings.current.set(target.firstChild as Text, { field: matches[0], original: target.textContent || '' })
      }
      clickedText.current = target.childNodes.length === 1 && target.firstChild?.nodeType === Node.TEXT_NODE ? target.firstChild as Text : range?.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer as Text : null
      if (matches.length === 1 && clickedText.current) {
        const item = matches[0]
        bindings.current.set(clickedText.current, { field: item, original: clickedText.current.nodeValue || '' })
        doc.querySelector('[data-editor-inline]')?.remove()
        const input = doc.createElement('textarea')
        const rect = target.getBoundingClientRect()
        const computed = doc.defaultView!.getComputedStyle(target)
        const start = live.current.drafts[item.id]
        input.value = start ?? item.value
        input.dataset.editorUi = ''
        input.dataset.editorInline = ''
        input.setAttribute('aria-label', `Edit ${item.file}.${item.path.join('.')}`)
        Object.assign(input.style, {
          position: 'fixed', zIndex: '9999', left: `${Math.max(8, Math.min(rect.left, doc.defaultView!.innerWidth - 250))}px`,
          top: `${Math.max(8, Math.min(rect.top, doc.defaultView!.innerHeight - 150))}px`,
          width: `${Math.min(Math.max(rect.width, 240), doc.defaultView!.innerWidth - 16)}px`,
          height: `${Math.min(Math.max(rect.height + 24, 100), 240)}px`,
          fontFamily: computed.fontFamily, fontSize: computed.fontSize, lineHeight: computed.lineHeight,
          color: 'var(--ink)', background: 'var(--paper)', padding: '8px', border: '2px solid #8b6518', borderRadius: '4px', boxShadow: '0 8px 30px #0003', resize: 'vertical',
        })
        input.addEventListener('input', () => setDrafts(current => ({ ...current, [item.id]: input.value })))
        input.addEventListener('blur', () => input.remove(), { once: true })
        input.addEventListener('keydown', event => {
          if (event.key === 'Escape') {
            setDrafts(current => { const next = { ...current }; if (start === undefined) delete next[item.id]; else next[item.id] = start; return next })
            input.remove()
          } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) input.blur()
        })
        doc.body.append(input); input.focus(); input.select()
      }
      setMessage(matches.length > 1 ? 'This text appears in several JSON fields. Choose the one to edit.' : 'Edit below; the preview updates as you type.')
    }
    const onClick = (event: MouseEvent) => {
      if (!live.current.editing) return
      if (event.target instanceof doc.defaultView!.Element && (event.target as Element).closest('a, button')) {
        event.preventDefault(); event.stopPropagation()
      }
    }
    const highlight = (event: MouseEvent) => {
      doc.querySelector('[data-editor-hover]')?.removeAttribute('data-editor-hover')
      if (live.current.editing && event.target instanceof doc.defaultView!.Element && fromElement(event.target as Element).length) (event.target as Element).setAttribute('data-editor-hover', '')
    }
    const style = doc.createElement('style')
    style.textContent = '[data-editor-hover]{outline:2px dashed #8b6518!important;outline-offset:4px;cursor:text!important} [data-reveal="pending"]{opacity:1!important}'
    doc.head.append(style)
    doc.addEventListener('dblclick', onDoubleClick, true)
    doc.addEventListener('click', onClick, true)
    doc.addEventListener('mouseover', highlight)
    const observer = new MutationObserver(preview)
    observer.observe(doc.body, { childList: true, subtree: true, characterData: true })
    preview()
    return () => {
      observer.disconnect(); style.remove(); doc.querySelector('[data-editor-inline]')?.remove()
      doc.removeEventListener('dblclick', onDoubleClick, true)
      doc.removeEventListener('click', onClick, true)
      doc.removeEventListener('mouseover', highlight)
      doc.querySelector('[data-editor-hover]')?.removeAttribute('data-editor-hover')
    }
  }, [snapshot, frameVersion, preview])

  const reloadFrame = () => { bindings.current.clear(); iframe.current?.contentWindow?.location.reload() }
  const save = async () => {
    if (!snapshot || !changes.length) return
    setSaving(true); setMessage('Validating and saving…')
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Editor-Token': snapshot.token }, body: JSON.stringify({ changes, revisions: snapshot.revisions }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Save failed.')
      setDrafts({}); setCandidates([]); setSelected(''); await load(); reloadFrame()
      setMessage(`Saved ${result.files.map((file: string) => `${file}.json`).join(', ')}.\nBackup: ${result.backup}`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Save failed; drafts retained.') }
    finally { setSaving(false) }
  }
  const discard = async () => {
    try { await load(); setDrafts({}); setSelected(''); setCandidates([]); setConfirmDiscard(false); reloadFrame(); setMessage('Reloaded content from disk.') }
    catch { setMessage('Could not reload. Your drafts are still available.') }
  }
  const publish = async () => {
    if (!snapshot || changes.length) return
    setConfirmPublish(false); setSaving(true); setMessage('Validating, committing and pushing saved content…')
    try {
      const response = await fetch('/__editor/api/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Editor-Token': snapshot.token },
        body: JSON.stringify({ confirm: 'publish-and-exit', revisions: snapshot.revisions }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Publishing failed.')
      setPublished(true)
      setMessage(`Published commit ${result.revision}. The local editor has stopped; you can close this tab. Check your hosting provider for deployment status.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Publishing failed. Local edits are retained.') }
    finally { setSaving(false) }
  }
  const visibleFields = fields.filter(item => normalized(`${item.file} ${item.path.join('.')} ${item.value}`).toLowerCase().includes(search.toLowerCase())).slice(0, 100)
  if (published) return <div className="live-editor"><p className="editor-status" role="status">{message}</p></div>
  return <div className={`live-editor ${contentMode ? 'content-editor' : ''}`}>
    <header className="editor-header"><strong>Margin · {contentMode ? 'Content studio' : 'Site text editor'}</strong>{snapshot && !contentMode && <label>Site preview<select aria-label="Site preview" value={previewRoute === '/stationery' ? '/stationery' : '/'} onChange={event => { bindings.current.clear(); setPreviewRoute(event.target.value) }}><option value="/">Bookstore</option><option value="/stationery">Maaya Stationery</option></select></label>}{snapshot && !contentMode && <div role="group" aria-label="Preview size"><button aria-pressed={!mobile} onClick={() => setMobile(false)}>Desktop</button><button aria-pressed={mobile} onClick={() => setMobile(true)}>Mobile · 390px</button></div>}<div className="editor-header-actions" role="group" aria-label="Publishing">{snapshot?.publishing?.enabled && <button className="editor-save" disabled={saving || changes.length > 0} onClick={() => setConfirmPublish(true)}>Publish &amp; exit</button>}</div></header>
    {!snapshot && <div className="editor-loading">Loading your workspace…</div>}
    {contentMode ? <ContentDashboard disabled={saving} onHomepage={() => setHomepageOpen(true)} onCoupons={() => setCouponsOpen(true)} onJournal={() => setCreating('journal')} onReadingList={() => setCreating('reading-lists')} /> : snapshot && <div className={`editor-preview ${mobile ? 'editor-mobile' : ''}`}><iframe ref={iframe} title="Bookstore live preview" src={previewRoute} onLoad={() => { bindings.current.clear(); setFrameVersion(value => value + 1) }} /></div>}
    {creating && snapshot && <CreateEditorial kind={creating} snapshot={snapshot} onClose={() => setCreating(undefined)} onCreated={async (route, backup) => {
      await load(); setCreating(undefined); setSelected(''); setCandidates([]); setShowFields(false)
      bindings.current.clear(); setPreviewRoute(route)
      setMessage(`Created locally: ${route}. Publish & exit when ready.\nBackup: ${backup}`)
    }} />}
    {couponsOpen && snapshot && <CouponEditor snapshot={snapshot} onClose={() => setCouponsOpen(false)} onSaved={async backup => {
      await load(); setCouponsOpen(false); setSelected(''); setCandidates([]); setShowFields(false)
      bindings.current.clear(); iframe.current?.contentWindow?.location.reload()
      setMessage(`Coupons saved locally. Publish & exit when ready.\nBackup: ${backup}`)
    }} />}
    {homepageOpen && snapshot && <HomepageEditor snapshot={snapshot} onClose={() => setHomepageOpen(false)} onSaved={async backup => {
      await load(); setHomepageOpen(false); setSelected(''); setCandidates([]); setShowFields(false)
      bindings.current.clear()
      if (previewRoute === '/') iframe.current?.contentWindow?.location.assign('/')
      else setPreviewRoute('/')
      setMessage(`Homepage selections saved locally. Publish & exit when ready.\nBackup: ${backup}`)
    }} />}
    <aside className="editor-tools" aria-label="Content editor">
      {confirmPublish && <div className="editor-confirm">Publish all saved JSON and referenced covers to {snapshot?.publishing?.repository}? They will be public if that repository is public. Review contact details first.<button disabled={saving} onClick={() => void publish()}>Confirm publish &amp; exit</button><button onClick={() => setConfirmPublish(false)}>Keep editing</button></div>}
      {(field || candidates.length > 1 || showFields) && <div className="editor-panel">
        <div className="editor-panel-heading"><strong>{showFields ? 'JSON text fields' : 'Edit text'}</strong><button aria-label="Close edit panel" onClick={() => { setSelected(''); setCandidates([]); setShowFields(false) }}>×</button></div>
        {showFields && <><input autoFocus aria-label="Find a JSON field" placeholder="Search text, file, or field…" value={search} onChange={event => setSearch(event.target.value)} /><div className="editor-field-list">{visibleFields.map(item => <button key={item.id} onClick={() => { setSelected(item.id); setCandidates([item]); setShowFields(false) }}><small>{item.file}.json · {item.path.join('.')}</small><span>{(drafts[item.id] ?? item.value) || '(empty)'}</span></button>)}</div></>}
        {!showFields && candidates.length > 1 && <label>Choose the source field<select value={selected} onChange={event => {
          setSelected(event.target.value)
          const chosen = fields.find(item => item.id === event.target.value)
          if (chosen && clickedText.current) bindings.current.set(clickedText.current, { field: chosen, original: clickedText.current.nodeValue || '' })
        }}><option value="">Select field…</option>{candidates.map(item => <option key={item.id} value={item.id}>{item.file}.json · {item.path.join('.')}</option>)}</select></label>}
        {!showFields && field && <><label htmlFor="editor-text">{field.file}.json · {field.path.join('.')}</label><textarea id="editor-text" key={field.id} value={drafts[field.id] ?? field.value} onChange={event => setDrafts(current => ({ ...current, [field.id]: event.target.value }))} /><small>Changes appear in the preview. Keep any {'{placeholders}'} intact.</small><button onClick={() => setDrafts(current => { const next = { ...current }; delete next[field.id]; return next })}>Reset this field</button></>}
      </div>}
      {!contentMode && <div className="editor-toolbar"><button aria-pressed={editing} onClick={() => setEditing(value => !value)}>{editing ? 'Editing' : 'Browse'}</button><button onClick={() => { setShowFields(value => !value); setSelected('') }}>Fields</button><button disabled={saving} onClick={() => changes.length ? setConfirmDiscard(true) : void discard()}>Reload / discard</button><button className="editor-save" disabled={!changes.length || saving} onClick={() => void save()}>{saving ? 'Saving…' : `Save${changes.length ? ` (${changes.length})` : ''}`}</button></div>}
      {confirmDiscard && <div className="editor-confirm">Discard your {changes.length} unsaved changes?<button onClick={() => void discard()}>Discard</button><button onClick={() => setConfirmDiscard(false)}>Keep editing</button></div>}
      <p className="editor-status" role="status">{message}</p>
    </aside>
  </div>
}
