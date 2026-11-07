import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Snapshot } from './model'
import { DraftPreview } from './DraftPreview'
import { EditorWorkspace } from './EditorWorkspace'
import type { EditorialDraft } from '../App'

export type EditorialKind = 'journal' | 'reading-lists'
export const slugFromTitle = (title: string) => title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
type CatalogBook = { id: number; title: string; author: string }

export function CreateEditorial({ kind, snapshot, onClose, onCreated }: {
  kind: EditorialKind; snapshot: Snapshot; onClose: () => void
  onCreated: (route: string, backup: string) => Promise<void>
}) {
  const journal = kind === 'journal'
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [customSlug, setCustomSlug] = useState(false)
  const [label, setLabel] = useState(journal ? 'From the journal' : 'A reading list')
  const [description, setDescription] = useState('')
  const [body, setBody] = useState('')
  const [time, setTime] = useState('5 min read')
  const [style, setStyle] = useState(journal ? 'book' : 'sage')
  const [icon, setIcon] = useState('✳')
  const [ids, setIds] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const books = (snapshot.content.catalog as { books: CatalogBook[] } | undefined)?.books ?? []
  const entries = journal
    ? (snapshot.content.journal as { articles: { slug: string }[] } | undefined)?.articles
    : (snapshot.content['reading-lists'] as { lists: { slug: string }[] } | undefined)?.lists
  const dirty = Boolean(title || slug || description || body || ids.length)
  const draft: EditorialDraft = journal
    ? { kind: 'journal', entry: { slug: slug || 'your-title', title: title || 'Your journal title', category: label, time, intro: description || 'Your introduction will appear here.', paragraphs: body.trim() ? body.split(/\n\s*\n/).filter(text => text.trim()) : ['Start writing to see your article take shape.'], book: ids[0] ?? books[0]?.id, artStyle: style } }
    : { kind: 'reading-lists', entry: { slug: slug || 'your-title', title: title || 'Your reading list title', label, description: description || 'Describe this collection of books.', ids, color: style, icon } }
  useEffect(() => {
    const dialog = dialogRef.current!
    const previous = document.activeElement as HTMLElement | null
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    dialog.querySelector('input')?.focus()
    return () => { if (typeof dialog.close === 'function') dialog.close(); previous?.focus() }
  }, [])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    if (!title.trim() || !description.trim() || !label.trim() || (journal && (!time.trim() || !body.trim())) || (!journal && !icon.trim())) { setError('Complete all required text fields.'); return }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { setError('Use lowercase letters, numbers and single hyphens for the URL slug.'); return }
    if (entries?.some(entry => entry.slug === slug)) { setError('That URL slug already exists. Choose a different one.'); return }
    if (!ids.length) { setError(journal ? 'Choose a companion book.' : 'Choose at least one book.'); return }
    const entry = journal
      ? { slug, title: title.trim(), category: label.trim(), time: time.trim(), intro: description.trim(), paragraphs: body.split(/\n\s*\n/).map(text => text.trim()).filter(Boolean), book: ids[0], artStyle: style }
      : { slug, title: title.trim(), label: label.trim(), description: description.trim(), ids, color: style, icon: icon.trim() }
    setSaving(true); setError('')
    try {
      const response = await fetch('/__editor/api/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Editor-Token': snapshot.token },
        body: JSON.stringify({ creation: { kind, entry }, revisions: snapshot.revisions }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not create the entry.')
      await onCreated('/' + kind + '/' + slug, result.backup)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save. Your draft is still here.') }
    finally { setSaving(false) }
  }
  return <dialog ref={dialogRef} className="editor-create" aria-labelledby="editor-create-title" onCancel={event => { event.preventDefault(); setError('Use Discard draft to close without saving.') }}>
    <header className="editor-create-heading"><div><small>CONTENT STUDIO</small><h2 id="editor-create-title">{journal ? 'New journal entry' : 'New reading list'}</h2></div><p>Draft locally. Publish when you’re ready.</p></header>
    <EditorWorkspace>
    <form id="editor-create-form" onSubmit={event => void submit(event)}>
      <h3>Content &amp; details</h3><p>The preview updates as you type. Creating saves to local JSON only.</p>
      <fieldset disabled={saving}>
        <label>Title<input required maxLength={200} value={title} onChange={event => { setTitle(event.target.value); if (!customSlug) setSlug(slugFromTitle(event.target.value)) }} /></label>
        <label>URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={120} value={slug} onChange={event => { setCustomSlug(true); setSlug(event.target.value) }} /></label>
        <small>/{kind}/{slug || 'your-title'}</small>
        <label>{journal ? 'Category' : 'Eyebrow label'}<input required maxLength={200} value={label} onChange={event => setLabel(event.target.value)} /></label>
        <label>{journal ? 'Introduction' : 'Description'}<textarea required maxLength={20000} value={description} onChange={event => setDescription(event.target.value)} /></label>
        {journal ? <>
          <label>Reading time<input required maxLength={100} value={time} onChange={event => setTime(event.target.value)} /></label>
          <label>Article text<textarea className="editor-article-body" required maxLength={100000} value={body} onChange={event => setBody(event.target.value)} /></label>
          <small>Separate paragraphs with a blank line.</small>
          <label>Illustration<select value={style} onChange={event => setStyle(event.target.value)}>{['book', 'bookmark', 'feather'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        </> : <>
          <label>Card colour<select value={style} onChange={event => setStyle(event.target.value)}>{['sage', 'butter', 'clay'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Card symbol<input required maxLength={20} value={icon} onChange={event => setIcon(event.target.value)} /></label>
        </>}
        <fieldset className="editor-book-picker"><legend>{journal ? 'Companion book' : 'Books in this list'}</legend>
          <label>Find a book<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <div className="editor-book-options">{books.filter(book => (book.title + ' ' + book.author).toLowerCase().includes(search.toLowerCase())).map(book => <label key={book.id}>
            <input type={journal ? 'radio' : 'checkbox'} name="editor-books" checked={ids.includes(book.id)} onChange={() => setIds(current => journal ? [book.id] : current.includes(book.id) ? current.filter(id => id !== book.id) : [...current, book.id])} />
            <span>{book.title}<small>{book.author}</small></span>
          </label>)}</div>
          {!journal && ids.length > 0 && <ol className="editor-selected-books">{ids.map((id, index) => <li key={id}><span>{books.find(book => book.id === id)?.title}</span><button type="button" disabled={index === 0} aria-label={`Move ${books.find(book => book.id === id)?.title} earlier`} onClick={() => setIds(current => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next })}>↑</button><button type="button" disabled={index === ids.length - 1} aria-label={`Move ${books.find(book => book.id === id)?.title} later`} onClick={() => setIds(current => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next })}>↓</button></li>)}</ol>}
        </fieldset>
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </form>
    <DraftPreview draft={draft} />
    </EditorWorkspace>
    <footer className="editor-create-actions"><span>Unsaved draft · nothing published</span><button type="button" disabled={saving} onClick={onClose}>Discard draft</button><button form="editor-create-form" type="submit" className="editor-save" disabled={saving}>{saving ? 'Creating…' : 'Create & preview'}</button></footer>
  </dialog>
}
