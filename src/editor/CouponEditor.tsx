import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { OffersConfig, Offer } from '../lib/offers'
import type { Snapshot } from './model'
import { DraftPreview } from './DraftPreview'
import { EditorWorkspace } from './EditorWorkspace'
import { EditorSwitch } from './EditorSwitch'

const localTime = (value: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
export function CouponEditor({ snapshot, onClose, onSaved }: { snapshot: Snapshot; onClose: () => void; onSaved: (backup: string) => Promise<void> }) {
  const original = snapshot.content.offers as OffersConfig
  const [config, setConfig] = useState<OffersConfig>(() => structuredClone(original))
  const [selected, setSelected] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [remove, setRemove] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [previewAll, setPreviewAll] = useState(true)
  const dialog = useRef<HTMLDialogElement>(null)
  const dirty = JSON.stringify(config) !== JSON.stringify(original)
  const offer = config.items[selected]
  const books = (snapshot.content.catalog as { books: { id: number; title: string }[] }).books
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    if (element.showModal) element.showModal(); else element.setAttribute('open', '')
    element.querySelector('button')?.focus()
    return () => { element.close?.(); previous?.focus() }
  }, [])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const close = () => { if (saving) return; if (dirty) setDiscard(true); else onClose() }
  const update = (values: Partial<Offer>) => setConfig(current => ({ ...current, items: current.items.map((item, index) => index === selected ? { ...item, ...values } : item) }))
  const add = () => {
    let index = 1
    while (config.items.some(item => item.id === `coupon-${index}`)) index++
    setConfig({ ...config, items: [...config.items, { id: `coupon-${index}`, enabled: false, badge: 'NEW OFFER', title: 'New coupon', highlight: '', description: 'Describe your offer.', theme: 'sage', code: '', terms: '', cta: { label: 'Browse books', href: '/collection', newTab: false }, bookIds: [], startsAt: null, endsAt: null }] })
    setSelected(config.items.length); setRemove(false)
  }
  const move = (direction: number) => {
    const items = [...config.items], next = selected + direction
    ;[items[selected], items[next]] = [items[next], items[selected]]
    setConfig({ ...config, items }); setSelected(next)
  }
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return
    setSaving(true); setError('')
    try {
      const response = await fetch('/__editor/api/offers', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Editor-Token': snapshot.token }, body: JSON.stringify({ offers: config, revisions: snapshot.revisions }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save coupons.')
      await onSaved(result.backup)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save. Your draft is retained.') }
    finally { setSaving(false) }
  }
  const preview = previewAll ? config : { ...config, enabled: true, items: offer ? [{ ...offer, enabled: true, startsAt: null, endsAt: null }] : [] }
  return <dialog ref={dialog} className="editor-create" aria-labelledby="coupon-editor-title" onCancel={event => { event.preventDefault(); close() }}>
    <header className="editor-create-heading"><div><small>CONTENT STUDIO</small><h2 id="coupon-editor-title">Coupons &amp; offers</h2></div><p>Promotional content only — this does not configure checkout discounts.</p></header>
    <EditorWorkspace>
      <form id="coupon-form" onSubmit={event => void save(event)}>
        <fieldset disabled={saving}>
          <div className="coupon-list-heading"><h3>Your coupons ({config.items.length})</h3><button type="button" onClick={add}>Add coupon</button></div>
          <div className="coupon-list" role="group" aria-label="Choose a coupon">{config.items.map((item, index) => <button type="button" key={index} aria-pressed={selected === index} onClick={() => { setSelected(index); setRemove(false) }}><strong>{item.title || 'Untitled coupon'}</strong><small>{item.code || 'No code'} · {item.enabled ? 'Enabled' : 'Paused'}</small></button>)}</div>
          {!offer && <p>No coupons yet. Add one to get started.</p>}
          {offer && <>
            <div className="coupon-item-actions"><button type="button" disabled={selected === 0} onClick={() => move(-1)}>Move earlier</button><button type="button" disabled={selected === config.items.length - 1} onClick={() => move(1)}>Move later</button><button type="button" onClick={() => setRemove(true)}>Remove coupon</button></div>
            {remove && <div className="editor-confirm" role="alert">Remove “{offer.title}”? It is only deleted from JSON when you save.<button type="button" onClick={() => { setConfig({ ...config, items: config.items.filter((_, index) => index !== selected) }); setSelected(Math.max(0, selected - 1)); setRemove(false) }}>Confirm removal</button><button type="button" onClick={() => setRemove(false)}>Keep coupon</button></div>}
            <EditorSwitch label="Enable this coupon" checked={offer.enabled} onChange={enabled => update({ enabled })} />
            {(['id', 'title', 'badge', 'highlight', 'code', 'description', 'terms'] as const).map(key => <label key={key}>{({ id: 'Coupon ID', title: 'Coupon title', badge: 'Badge', highlight: 'Discount / highlight', code: 'Coupon code', description: 'Description', terms: 'Terms & conditions' })[key]}{key === 'description' || key === 'terms' ? <textarea required={key === 'description'} maxLength={20000} value={offer[key]} onChange={event => update({ [key]: event.target.value })} /> : <input required={key === 'id' || key === 'title'} pattern={key === 'id' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined} maxLength={500} value={offer[key]} onChange={event => update({ [key]: event.target.value })} />}</label>)}
            <label>Card colour<select value={offer.theme} onChange={event => update({ theme: event.target.value })}>{['sage', 'butter', 'clay'].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Button label<input required value={offer.cta.label} onChange={event => update({ cta: { ...offer.cta, label: event.target.value } })} /></label>
            <label>Button link<input required value={offer.cta.href} onChange={event => update({ cta: { ...offer.cta, href: event.target.value } })} /></label><small>Use a site path such as /collection, or an https:// link.</small>
            <EditorSwitch label="Open link in a new tab" checked={offer.cta.newTab} onChange={newTab => update({ cta: { ...offer.cta, newTab } })} />
            <div key={selected}>{(['startsAt', 'endsAt'] as const).map(key => <label key={key}>{key === 'startsAt' ? 'Starts at' : 'Ends at'}<input type="datetime-local" value={localTime(offer[key])} onChange={event => update({ [key]: event.target.value ? new Date(event.target.value).toISOString() : null })} /></label>)}</div>
            <small>Times use your computer’s timezone. Leave blank for no start/end limit.</small>
            <fieldset className="editor-book-picker"><legend>Featured books (up to 3)</legend><div className="editor-book-options">{books.map(book => <label key={book.id}><input type="checkbox" checked={offer.bookIds.includes(book.id)} disabled={!offer.bookIds.includes(book.id) && offer.bookIds.length >= 3} onChange={() => update({ bookIds: offer.bookIds.includes(book.id) ? offer.bookIds.filter(id => id !== book.id) : [...offer.bookIds, book.id] })} />{book.title}</label>)}</div></fieldset>
          </>}
          <details className="coupon-settings"><summary>Homepage section settings</summary>
            <EditorSwitch label="Show offers section" checked={config.enabled} onChange={enabled => setConfig({ ...config, enabled })} />
            {(['title', 'eyebrow', 'description'] as const).map(key => <label key={key}>Section {key}<input required={key === 'title'} value={config[key]} onChange={event => setConfig({ ...config, [key]: event.target.value })} /></label>)}
            <label>Position<select value={config.position} onChange={event => setConfig({ ...config, position: event.target.value })}>{['before-hero', 'after-hero', 'after-collection', 'after-reading-lists', 'after-journal'].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Layout<select value={config.layout} onChange={event => setConfig({ ...config, layout: event.target.value })}><option>grid</option><option>stack</option></select></label>
            <label>Columns<input type="number" required min={1} max={3} value={config.columns} onChange={event => setConfig({ ...config, columns: Number(event.target.value) })} /></label>
            <label>Maximum visible<input type="number" required min={1} max={12} value={config.maxVisible} onChange={event => setConfig({ ...config, maxVisible: Number(event.target.value) })} /></label>
            <EditorSwitch label="Emphasize first offer" checked={config.emphasizeFirst} onChange={emphasizeFirst => setConfig({ ...config, emphasizeFirst })} />
          </details>
        </fieldset>
        {error && <p role="alert">{error}</p>}
      </form>
      <div className="coupon-preview"><div className="coupon-preview-mode"><EditorSwitch label="Preview whole section" checked={previewAll} onChange={setPreviewAll} /><small>{previewAll ? 'Live visibility: enabled flags, schedules and display limits all apply. Turn off to design just the selected coupon.' : 'Design preview: the selected coupon is shown even when paused or outside its schedule. Visibility changes apply in whole-section preview.'}</small></div><DraftPreview draft={{ kind: 'offers', entry: preview }} /></div>
    </EditorWorkspace>
    <footer className="editor-create-actions"><span>{dirty ? 'Unsaved changes' : 'No changes'} · publish separately</span>{discard ? <div role="alert">Discard unsaved coupon changes?<button type="button" disabled={saving} onClick={onClose}>Discard changes</button><button type="button" onClick={() => setDiscard(false)}>Keep editing</button></div> : <button type="button" disabled={saving} onClick={close}>Close</button>}<button type="submit" form="coupon-form" className="editor-save" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save coupons'}</button></footer>
  </dialog>
}
