import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { HomeContent } from '../App'
import type { Snapshot } from './model'
import { DraftPreview } from './DraftPreview'
import { EditorWorkspace } from './EditorWorkspace'

type Choice = { value: string; label: string }
function Slots({ title, hint, values, options, onChange }: { title: string; hint: string; values: string[]; options: Choice[]; onChange: (values: string[]) => void }) {
  const move = (index: number, direction: number) => {
    const next = [...values]
    ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
    onChange(next)
  }
  return <fieldset className="homepage-slot-group"><legend>{title}</legend><p>{hint}</p>{values.map((value, index) => <div className="homepage-slot" key={index}>
    <label>{title} · {index + 1}<select required value={value} onChange={event => onChange(values.map((item, position) => position === index ? event.target.value : item))}><option value="">Select…</option>{options.map(option => <option key={option.value} value={option.value} disabled={option.value !== value && values.includes(option.value)}>{option.label}</option>)}</select></label>
    <button type="button" disabled={index === 0} aria-label={`Move ${title} ${index + 1} earlier`} onClick={() => move(index, -1)}>↑</button><button type="button" disabled={index === values.length - 1} aria-label={`Move ${title} ${index + 1} later`} onClick={() => move(index, 1)}>↓</button>
  </div>)}</fieldset>
}
export function HomepageEditor({ snapshot, onClose, onSaved }: { snapshot: Snapshot; onClose: () => void; onSaved: (backup: string) => Promise<void> }) {
  const original = snapshot.content.home as HomeContent
  const books = (snapshot.content.catalog as { books: { id: number; title: string; author: string }[] }).books
  const lists = (snapshot.content['reading-lists'] as { lists: { slug: string; title: string }[] }).lists
  const articles = (snapshot.content.journal as { articles: { slug: string; title: string; intro: string }[] }).articles
  const initial = {
    hero: original.hero.featuredBookIds.map(String),
    collection: (original.collection.featuredBookIds ?? books.slice(0, 6).map(book => book.id)).map(String),
    lists: original.readingLists.featuredSlugs ?? lists.slice(0, 3).map(list => list.slug),
    journal: original.journal.featuredArticleSlug,
  }
  const [selection, setSelection] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [discard, setDiscard] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const dirty = JSON.stringify(selection) !== JSON.stringify(initial)
  const close = () => { if (saving) return; if (dirty) setDiscard(true); else onClose() }
  useEffect(() => {
    const element = dialog.current!, previous = document.activeElement as HTMLElement | null
    if (element.showModal) element.showModal(); else element.setAttribute('open', '')
    element.querySelector('select')?.focus()
    return () => { element.close?.(); previous?.focus() }
  }, [])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const article = articles.find(item => item.slug === selection.journal)
  const preview: HomeContent = {
    ...original,
    hero: { ...original.hero, featuredBookIds: selection.hero.filter(Boolean).map(Number) },
    collection: { ...original.collection, featuredBookIds: selection.collection.filter(Boolean).map(Number) },
    readingLists: { ...original.readingLists, featuredSlugs: selection.lists.filter(Boolean) },
    journal: { ...original.journal, featuredArticleSlug: selection.journal, ...(article && selection.journal !== original.journal.featuredArticleSlug ? { titleLine: article.title, emphasis: '', description: [article.intro] } : {}) },
  }
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return
    if (selection.hero.filter(Boolean).length !== 3 || selection.collection.filter(Boolean).length !== 6 || selection.lists.filter(Boolean).length !== 3 || !article) { setError('Choose 3 hero books, 6 collection books, 3 reading lists and 1 journal.'); return }
    setSaving(true); setError('')
    try {
      const response = await fetch('/__editor/api/homepage', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Editor-Token': snapshot.token }, body: JSON.stringify({ revisions: snapshot.revisions, homepage: { heroBookIds: selection.hero.map(Number), collectionBookIds: selection.collection.map(Number), readingListSlugs: selection.lists, journalSlug: selection.journal } }) })
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The editor server did not return JSON. It may be running an older version. Note your unsaved selections, stop the editor with Ctrl+C, run npm run edit again, and reopen the editor before saving.')
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save homepage selections.')
      await onSaved(result.backup)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save. Your selections are retained.') }
    finally { setSaving(false) }
  }
  const bookOptions = books.map(book => ({ value: String(book.id), label: `${book.title} — ${book.author}` }))
  const fill = (values: string[], count: number) => Array.from({ length: count }, (_, index) => values[index] ?? '')
  return <dialog ref={dialog} className="editor-create" aria-labelledby="homepage-editor-title" onCancel={event => { event.preventDefault(); close() }}>
    <header className="editor-create-heading"><div><small>CONTENT STUDIO</small><h2 id="homepage-editor-title">Homepage selections</h2></div><p>Choose the content. Arrange its order. Preview together.</p></header>
    <EditorWorkspace><form id="homepage-form" onSubmit={event => void save(event)}><fieldset disabled={saving}>
      <Slots title="Hero books" hint="Three books, left → centre → right. Books can also appear in the collection below." values={fill(selection.hero, 3)} options={bookOptions} onChange={hero => setSelection({ ...selection, hero })} />
      <Slots title="Collection books" hint="Six books in display order. Smaller screens show the first four; the full catalogue stays unchanged." values={fill(selection.collection, 6)} options={bookOptions} onChange={collection => setSelection({ ...selection, collection })} />
      <Slots title="Reading lists" hint="Three featured lists in display order. Create additional lists using New reading list." values={fill(selection.lists, 3)} options={lists.map(list => ({ value: list.slug, label: list.title }))} onChange={lists => setSelection({ ...selection, lists })} />
      <fieldset className="homepage-slot-group"><legend>Featured journal</legend><label>Journal article<select required value={selection.journal} onChange={event => setSelection({ ...selection, journal: event.target.value })}>{articles.map(article => <option key={article.slug} value={article.slug}>{article.title}</option>)}</select></label><p>Choosing a different article replaces the homepage journal heading and description with that article’s title and introduction.</p></fieldset>
    </fieldset>{error && <p role="alert">{error}</p>}</form><DraftPreview draft={{ kind: 'home', entry: preview }} /></EditorWorkspace>
    <footer className="editor-create-actions"><span>{dirty ? 'Unsaved selections' : 'Current selections'} · publish separately</span>{discard ? <div role="alert">Discard homepage changes?<button type="button" onClick={onClose}>Discard changes</button><button type="button" onClick={() => setDiscard(false)}>Keep editing</button></div> : <button type="button" disabled={saving} onClick={close}>Close</button>}<button type="submit" form="homepage-form" className="editor-save" disabled={saving}>{saving ? 'Saving…' : 'Save homepage'}</button></footer>
  </dialog>
}
