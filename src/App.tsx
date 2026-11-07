import Router, { useRouter } from 'next/router'
import { SiteLink as Link } from './components/SiteLink'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, MotionConfig, useIsPresent, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowLeft, ArrowRight, Bookmark, BookOpen, Check, Search, Shuffle, X, Moon, Sun, Menu, Feather, Copy, MessageCircle, Mail } from 'lucide-react'
import { books, genres, languages, matchesBookSearch, findBook, type Book } from './books'
import { Cover } from './Cover'
import { Stationery, StationeryCard } from './components/Stationery'
import { Offers } from './components/Offers'
import { ShopInfo, ShopChapters } from './components/ShopInfo'
import { articles, readingLists } from './editorial'
import { site, home as defaultHome, about, pages, ui, inquiry, format } from './content'
import { buildAvailabilityUrl, buildEmailAvailabilityUrl } from './lib/availability'
import { observeScrollReveals } from './lib/scroll-reveal'

const navigate = (path: string) => { void Router.push(path, undefined, { scroll: false }) }
function readStorage<T,>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) || 'null'); return validate(value) ? value : fallback } catch { return fallback }
}
const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: .22 } }
const withBrand = (text: string) => format(text, { brand: site.brand.name })
function Lines({ lines }: { lines: string[] }) {
  return <>{lines.map((line, index) => <span key={index}>{index > 0 && <br />}{line}</span>)}</>
}
function Page({ children, homePage }: { children: ReactNode; homePage: boolean }) {
  const pageRef = useRef<HTMLDivElement>(null)
  const present = useIsPresent()
  const reduced = useReducedMotion()
  useLayoutEffect(() => {
    if (!reduced && pageRef.current) return observeScrollReveals(pageRef.current)
  }, [reduced])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.getElementById('page-content')?.focus({ preventScroll: true }) }, [])
  return <motion.div ref={pageRef} id="page-content" className={homePage ? 'home-page' : undefined} tabIndex={-1} inert={!present} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .28, ease: 'easeInOut' }}>{children}</motion.div>
}
function PageHeading({ label, title, text }: { label: string; title: string; text: string }) {
  return <div className="page-heading"><div className="eyebrow">{label}</div><h1>{title}</h1><p>{text}</p></div>
}
function Overlay({ children, title, close }: { children: ReactNode; title: string; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const present = useIsPresent()
  const reduced = useReducedMotion()
  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    const oldOverflow = document.body.style.overflow
    const element = ref.current
    element?.showModal(); document.body.style.overflow = 'hidden'
    return () => { element?.close(); document.body.style.overflow = oldOverflow; if (previous?.isConnected) previous.focus() }
  }, [])
  return <motion.dialog ref={ref} aria-label={title} className={present ? 'animated-dialog' : 'animated-dialog leaving'} initial={{ opacity: 0, y: reduced ? 0 : 22, scale: reduced ? 1 : .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduced ? 0 : 14, scale: reduced ? 1 : .98 }} transition={{ duration: reduced ? 0 : .2 }} onCancel={e => { e.preventDefault(); close() }} onClick={e => { if (e.target === ref.current) close() }}><button className="dialog-close icon-button" aria-label={ui.accessibility.closeDialog} onClick={close}><X size={22} /></button>{children}</motion.dialog>
}
export type EditorialDraft = { kind: 'journal'; entry: (typeof articles)[number] } | { kind: 'reading-lists'; entry: (typeof readingLists)[number] }
export type HomeContent = Omit<typeof defaultHome, 'collection' | 'readingLists'> & {
  collection: Omit<typeof defaultHome.collection, 'featuredBookIds'> & { featuredBookIds?: number[] }
  readingLists: Omit<typeof defaultHome.readingLists, 'featuredSlugs'> & { featuredSlugs?: string[] }
}
function BookstoreApp({ route = '/', editorialDraft, homeContent = defaultHome, previewMode = false }: { route?: string; editorialDraft?: EditorialDraft; homeContent?: HomeContent; previewMode?: boolean }) {
  const home = homeContent
  const router = useRouter()
  useEffect(() => {
    if (window.location.hash.startsWith('#/')) void router.replace(window.location.hash.slice(1))
  }, [router])
  const reduced = useReducedMotion()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [saved, setSaved] = useState<number[]>([])
  const [storageReady, setStorageReady] = useState(false)
  useEffect(() => {
    setTheme(readStorage('dog-ear-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', (v): v is 'light' | 'dark' => v === 'light' || v === 'dark'))
    setSaved(readStorage('dog-ear-shelf', [], (v): v is number[] => Array.isArray(v) && v.every(id => typeof id === 'number')))
    setStorageReady(true)
  }, [])
  const [selected, setSelected] = useState<Book | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const savedBooks = books.filter(book => saved.includes(book.id))
  useEffect(() => { if (!storageReady) return; document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#19231e' : '#faf9f6'); if (previewMode) return; try { localStorage.setItem('dog-ear-theme', JSON.stringify(theme)) } catch { /* Session state remains available. */ } }, [theme, storageReady, previewMode])
  useEffect(() => { if (!storageReady || previewMode) return; try { localStorage.setItem('dog-ear-shelf', JSON.stringify(saved)) } catch { /* Session state remains available. */ } }, [saved, storageReady, previewMode])
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer) } }, [toast])
  useEffect(() => {
    const title = books.find(book => route === `/book/${book.id}`)?.title
      ?? readingLists.find(list => route === `/reading-lists/${list.slug}`)?.title
      ?? articles.find(article => route === `/journal/${article.slug}`)?.title
      ?? ({ '/collection': pages.collection.title, '/bookshelf': pages.bookshelf.title, '/reading-lists': pages.readingLists.title, '/journal': pages.journal.title, '/stationery': 'Maaya Stationery', '/about': pages.about.title } as Record<string, string>)[route]
      ?? pages.notFound.title
    document.title = route === '/' ? site.metadata.title : `${site.brand.name} — ${title}`
  }, [route])
  const go = (path: string) => { setMenuOpen(false); setSearchOpen(false); setSelected(null); navigate(path) }
  const toggleSave = (id: number) => { const exists = saved.includes(id); setSaved(old => exists ? old.filter(i => i !== id) : [...old, id]); setToast(exists ? ui.feedback.removed : ui.feedback.saved) }
  const nav = site.navigation
  const grid = (items: Book[]) => <BookGrid items={items} saved={saved} onSave={toggleSave} onPreview={setSelected} />
  const book = route.startsWith('/book/') ? books.find(b => String(b.id) === route.split('/')[2]) : undefined
  const list = editorialDraft?.kind === 'reading-lists' ? editorialDraft.entry : readingLists.find(l => route === `/reading-lists/${l.slug}`)
  const article = editorialDraft?.kind === 'journal' ? editorialDraft.entry : articles.find(a => route === `/journal/${a.slug}`)
  let content: ReactNode
  if (route === '/') content = <>
    <Offers position="before-hero" />
    <HomeHero home={home} onPreview={setSelected} />
    <Offers position="after-hero" />
    <section className="collection home-collection"><div className="section-heading"><div><div className="eyebrow">{home.collection.eyebrow}</div><h2>{home.collection.title}</h2><p className="collection-intro">{home.collection.description}</p></div><Link className="primary-button" href="/collection">{home.collection.linkLabel}<ArrowRight size={17} /></Link></div>{grid((home.collection.featuredBookIds ?? books.slice(0, 6).map(book => book.id)).map(findBook))}</section>
    <Offers position="after-collection" />
    <section className="home-lists"><div className="section-heading"><div><div className="eyebrow">{home.readingLists.eyebrow}</div><h2>{home.readingLists.title}</h2></div><Link href="/reading-lists" className="text-button">{home.readingLists.linkLabel}<ArrowRight size={16} /></Link></div><ListCards lists={(home.readingLists.featuredSlugs ?? readingLists.slice(0, 3).map(list => list.slug)).map(slug => readingLists.find(list => list.slug === slug)!)} /></section>
    <Offers position="after-reading-lists" />
    <section className="home-journal"><div><div className="eyebrow">{home.journal.eyebrow}</div><h2>{home.journal.titleLine}{home.journal.emphasis && <><br /><em>{home.journal.emphasis}</em></>}</h2><p><Lines lines={home.journal.description} /></p><Link href={`/journal/${home.journal.featuredArticleSlug}`} className="text-button">{home.journal.linkLabel}<ArrowRight size={16} /></Link></div><div className="journal-illustration" aria-hidden="true"><BookOpen strokeWidth={.6} /><span>{home.journal.illustrationLabel}</span></div></section>
    <Offers position="after-journal" />
    <StationeryCard />
    <ShopInfo />
  </>
  else if (route === '/collection') content = <><PageHeading {...pages.collection} /><Collection saved={saved} onSave={toggleSave} onPreview={setSelected} /></>
  else if (route === '/bookshelf') content = <><PageHeading {...pages.bookshelf} /><Shelf saved={savedBooks.map(book => book.id)} onSave={toggleSave} onPreview={setSelected} /></>
  else if (route === '/reading-lists') content = <><PageHeading {...pages.readingLists} /><ListCards large lists={editorialDraft?.kind === 'reading-lists' ? [editorialDraft.entry] : undefined} /><div className="editorial-note"><Feather size={24} /><p><Lines lines={ui.readingLists.editorialNote} /></p></div></>
  else if (list) content = <>
    <Link className="back-button" href="/reading-lists"><ArrowLeft size={15} />{ui.readingLists.back}</Link><PageHeading label={list.label} title={list.title} text={list.description} />
    <div className="list-detail-note"><span>{list.icon}</span><p><Lines lines={ui.readingLists.detailNote.map(line => format(line, { count: list.ids.length }))} /></p><button className="primary-button" onClick={() => { setSaved(old => [...new Set([...old, ...list.ids])]); setToast(format(ui.feedback.listSaved, { count: list.ids.length })) }}><Bookmark size={16} />{ui.readingLists.save}</button></div>{grid(list.ids.map(findBook))}
  </>
  else if (route === '/journal') content = <><PageHeading {...pages.journal} /><div className="journal-grid">{(editorialDraft?.kind === 'journal' ? [editorialDraft.entry] : articles).map((a, i) => <Link className={`journal-card journal-${i % 3}`} key={a.slug} href={`/journal/${a.slug}`}><div className="journal-art" aria-hidden="true">{a.artStyle === 'book' ? <BookOpen /> : a.artStyle === 'bookmark' ? <Bookmark /> : <Feather />}<span>{String(i + 1).padStart(2, '0')}</span></div><div className="eyebrow">{a.category}<span className="read-time">{a.time}</span></div><h2>{a.title}</h2><p>{a.intro}</p><span className="text-button">{ui.journal.read}<ArrowRight size={16} /></span></Link>)}</div></>
  else if (article) content = <article className="article-page"><Link className="back-button" href="/journal"><ArrowLeft size={15} />{ui.journal.back}</Link><PageHeading label={`${article.category} · ${article.time}`} title={article.title} text={article.intro} /><div className="article-byline"><span className="author-monogram">{site.brand.monogram}</span><span>{withBrand(ui.journal.byline)}<br /><small>{ui.journal.bylineNote}</small></span></div><div className="article-body">{article.paragraphs.map((p, index) => <p key={index}>{p}</p>)}<span className="article-end" aria-hidden="true">✳</span></div><div className="article-companion"><div><div className="eyebrow">{ui.journal.companionLabel}</div><h3>{findBook(article.book).title}</h3><Link className="text-button" href={`/book/${article.book}`}>{ui.journal.companionLink}<ArrowRight size={16} /></Link></div><Cover book={findBook(article.book)} /></div></article>
  else if (route === '/about') content = <><PageHeading {...pages.about} /><div className="story-layout"><div className="story-art"><span>{site.brand.name}</span><BookOpen strokeWidth={.7} /><em><Lines lines={about.illustrationLines} /></em></div><div className="story-copy"><h2><Lines lines={about.story.title} /></h2>{about.story.paragraphs.map((p, index) => <p key={index}>{withBrand(p)}</p>)}<Link className="text-button" href="/collection">{about.story.linkLabel}<ArrowRight size={16} /></Link></div></div><ShopChapters /><div className="values-grid">{about.values.map(value => <div key={value.id}><span className="eyebrow">{value.id}</span><h3>{value.title}</h3><p>{value.text}</p></div>)}</div><ShopInfo detailed /><section className="faq"><div><div className="eyebrow">{about.faq.eyebrow}</div><h2>{about.faq.title}</h2></div><div>{about.faq.items.map(({ question, answer }) => <details key={question}><summary>{question}<span>+</span></summary><p>{withBrand(answer)}</p></details>)}</div></section></>
  else if (book) content = <><Link className="back-button" href="/collection"><ArrowLeft size={15} />{ui.book.back}</Link><section className="full-book"><div className={`full-book-art stage-${book.style}`}><Cover book={book} /><span>{ui.book.artCaption}</span></div><div className="full-book-copy"><div className="eyebrow">{book.genre} · {book.year}</div><h1 lang={book.primaryLanguage.id} dir={book.primaryLanguage.direction}>{book.title}</h1><p className="full-author">{format(ui.common.byAuthor, { author: book.author })}</p><p>{book.description}</p><blockquote>{book.note}</blockquote><button className="primary-button" onClick={() => toggleSave(book.id)}>{saved.includes(book.id) ? <Check size={17} /> : <Bookmark size={17} />}{saved.includes(book.id) ? ui.book.onShelf : ui.book.save}</button><button className="text-button" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setToast(ui.feedback.linkCopied) } catch { setToast(ui.feedback.copyFallback) } }}><Copy size={15} />{ui.book.share}</button><dl className="book-facts"><div><dt>{ui.book.facts.author}</dt><dd>{book.author}</dd></div><div><dt>{ui.book.facts.published}</dt><dd>{book.year}</dd></div><div><dt>{ui.book.facts.genre}</dt><dd>{book.genre}</dd></div><div><dt>{ui.book.facts.language}</dt><dd>{book.languageLabel}</dd></div></dl><p className="edition-note">{withBrand(ui.book.editionNote)}</p></div></section><section className="related"><div className="eyebrow">{ui.book.relatedLabel}</div><h2>{ui.book.relatedTitle}</h2>{grid(books.filter(b => b.id !== book.id).slice(0, 3))}</section></>
  else content = <div className="empty-state"><BookOpen size={40} /><h1>{pages.notFound.title}</h1><p>{pages.notFound.text}</p><Link href="/collection" className="primary-button">{pages.notFound.linkLabel}<ArrowRight size={16} /></Link></div>
  const searchResults = books.filter(b => matchesBookSearch(b, query))
  return <MotionConfig reducedMotion="user" transition={{ duration: reduced ? 0 : .24 }}>
    <Link className="skip-link" href="#page-content" onClick={e => { e.preventDefault(); document.getElementById('page-content')?.focus() }}>{ui.accessibility.skipContent}</Link>
    <header className="header"><Link href="/" className="wordmark" aria-label={site.brand.homeLabel}>{site.brand.name}<span className="logo-fold" /></Link><nav aria-label={ui.accessibility.mainNavigation}>{nav.map(({ href, label }) => <Link key={href} href={href} aria-current={route.startsWith(href) ? 'page' : undefined}>{label}</Link>)}</nav><div className="header-actions">
      <button className="icon-button" aria-label={ui.accessibility.searchBooks} onClick={() => { setQuery(''); setSearchOpen(true) }}><Search size={18} /></button>
      <button className="icon-button theme-toggle" aria-label={theme === 'light' ? ui.accessibility.switchToDark : ui.accessibility.switchToLight} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><AnimatePresence mode="wait" initial={false}><motion.span key={theme} initial={{ opacity: 0, rotate: -60 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 60 }}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</motion.span></AnimatePresence></button>
      <Link className="shelf-button" href="/bookshelf" aria-label={format(ui.accessibility.bookshelfCount, { count: savedBooks.length })}><Bookmark size={17} /><span className="shelf-label">{ui.common.bookshelf}</span><span className="shelf-count">{savedBooks.length}</span></Link><button className="icon-button mobile-menu-button" aria-label={ui.accessibility.openNavigation} onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
    </div></header>
    <main><AnimatePresence mode="wait" initial={false}><Page key={route} homePage={route === '/'}>{content}</Page></AnimatePresence></main>
    <footer className="expanded-footer"><div><Link href="/" className="wordmark">{site.brand.name}<span className="logo-fold" /></Link><p>{site.footer.tagline}</p></div><div className="footer-links">{nav.map(({ href, label }) => <Link key={href} href={href}>{label}</Link>)}<Link href="/bookshelf">{ui.common.bookshelf}</Link></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {site.brand.name}</span><span>{site.footer.note}</span><button onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' })}>{site.footer.backToTop}</button></div></footer>
    <AnimatePresence>
      {selected && <Overlay key="book-preview" title={selected.title} close={() => setSelected(null)}><div className="book-detail"><div className={`detail-cover stage-${selected.style}`}><Cover book={selected} /></div><div className="detail-copy"><div className="eyebrow">{selected.genre} · {selected.year} · {selected.languageLabel}</div><h2 lang={selected.primaryLanguage.id} dir={selected.primaryLanguage.direction}>{selected.title}</h2><p className="detail-author">{format(ui.common.byAuthor, { author: selected.author })}</p><p>{selected.description}</p><blockquote>“{selected.note}”</blockquote><button className="primary-button" onClick={() => toggleSave(selected.id)}>{saved.includes(selected.id) ? <Check size={17} /> : <Bookmark size={17} />}{saved.includes(selected.id) ? ui.book.saved : ui.book.save}</button><button className="text-button" onClick={() => go(`/book/${selected.id}`)}>{ui.book.visit}<ArrowRight size={16} /></button></div></div></Overlay>}
      {searchOpen && <Overlay key="search" title={ui.search.title} close={() => setSearchOpen(false)}><div className="search-dialog"><div className="eyebrow">{ui.search.eyebrow}</div><h2>{ui.search.title}</h2><div className="search-field"><Search size={18} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} aria-label={ui.search.label} placeholder={ui.search.placeholder} /></div><div className="search-results">{searchResults.map(b => <button key={b.id} onClick={() => go(`/book/${b.id}`)}><span className={`search-swatch stage-${b.style}`}><BookOpen size={19} /></span><span><strong lang={b.primaryLanguage.id} dir={b.primaryLanguage.direction}>{b.title}</strong><small>{b.author} · {b.genre} · {b.languageLabel}</small></span><ArrowRight size={16} /></button>)}</div>{!searchResults.length && <p className="empty-search">{ui.search.empty}</p>}</div></Overlay>}
      {menuOpen && <Overlay key="menu" title={ui.accessibility.navigation} close={() => setMenuOpen(false)}><div className="mobile-menu"><div className="eyebrow">{ui.menu.eyebrow}</div>{[{ href: '/', label: ui.common.home }, ...nav, { href: '/bookshelf', label: ui.common.bookshelf }].map(({ href, label }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)}>{label}<ArrowRight size={20} /></Link>)}</div></Overlay>}
    </AnimatePresence>
    <div className="toast-region" role="status" aria-live="polite"><AnimatePresence>{toast && <motion.div key={toast} className="toast" {...fade}><Check size={16} />{toast}</motion.div>}</AnimatePresence></div>
  </MotionConfig>
}

type BookActions = { saved: number[]; onSave: (id: number) => void; onPreview: (book: Book) => void }
function BookGrid({ items, saved, onSave, onPreview }: BookActions & { items: Book[] }) {
  const reduced = useReducedMotion()
  return <div className="book-grid"><AnimatePresence mode="popLayout">{items.map((book, index) => <motion.article layout={!reduced} initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -6, transition: { duration: reduced ? 0 : .18, delay: 0 } }} transition={{ layout: { duration: reduced ? 0 : .25 } }} className="book-card" key={book.id}>
    <div className={`book-stage stage-${book.style}`}><button className="book-preview" onClick={() => onPreview(book)} aria-label={format(ui.accessibility.previewBook, { title: book.title })}><Cover book={book} /></button><button className={`save-button ${saved.includes(book.id) ? 'is-saved' : ''}`} aria-label={format(saved.includes(book.id) ? ui.accessibility.removeBook : ui.accessibility.saveBook, { title: book.title })} aria-pressed={saved.includes(book.id)} onClick={() => onSave(book.id)}><Bookmark size={16} fill={saved.includes(book.id) ? 'currentColor' : 'none'} /></button><span className="preview-hint">{ui.book.previewHint}<ArrowRight size={13} /></span></div>
    <div className="book-meta"><span>{book.genre}</span><span>{String(index + 1).padStart(2, '0')}</span></div><Link href={`/book/${book.id}`} className="book-title" lang={book.primaryLanguage.id} dir={book.primaryLanguage.direction}>{book.title}</Link><p className="author">{book.author}</p><span className="book-language">{book.languageLabel}</span><p className="book-note">{book.note}</p>
  </motion.article>)}</AnimatePresence></div>
}
function Collection({ saved, onSave, onPreview }: BookActions) {
  const [genre, setGenre] = useState('')
  const [language, setLanguage] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('curated')
  const visible = books.filter(b => (!genre || genre === b.genreId) && (!language || b.languageIds.includes(language)) && matchesBookSearch(b, query)).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'newest' ? Number(b.year) - Number(a.year) : 0)
  return <section className="catalog"><div className="catalog-top"><div className="search-field"><Search size={17} /><input aria-label={ui.collection.searchLabel} value={query} onChange={e => setQuery(e.target.value)} placeholder={ui.collection.searchPlaceholder} />{query && <button aria-label={ui.collection.clearSearch} className="icon-button" onClick={() => setQuery('')}><X size={16} /></button>}</div><button className="text-button" onClick={() => onPreview(books[Math.floor(Math.random() * books.length)])}><Shuffle size={16} />{ui.collection.surprise}<ArrowRight size={16} /></button></div>
    <div className="collection-controls"><div className="filters">{[{ id: '', label: ui.common.allBooks }, ...genres].map(g => <button key={g.id} className={genre === g.id ? 'active' : ''} aria-pressed={genre === g.id} onClick={() => setGenre(g.id)}>{g.label}</button>)}</div><div className="catalog-selects"><label className="sort-label">{ui.collection.languageLabel}<select aria-label={ui.collection.languageLabel} value={language} onChange={e => setLanguage(e.target.value)}><option value="">{ui.collection.allLanguages}</option>{languages.map(item => <option key={item.id} value={item.id}>{item.label === item.nativeLabel ? item.label : `${item.label} · ${item.nativeLabel}`}</option>)}</select></label><label className="sort-label">{ui.collection.sortLabel}<select aria-label={ui.collection.sortAccessibleLabel} value={sort} onChange={e => setSort(e.target.value)}>{ui.collection.sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div></div>
    <div className="results-count" aria-live="polite">{format(visible.length === 1 ? ui.collection.countOne : ui.collection.countMany, { count: visible.length })}</div><BookGrid items={visible} saved={saved} onSave={onSave} onPreview={onPreview} />{!visible.length && <div className="empty-state"><BookOpen size={32} /><h3>{ui.collection.emptyTitle}</h3><p>{ui.collection.emptyText}</p><button className="text-button" onClick={() => { setGenre(''); setLanguage(''); setQuery('') }}>{ui.collection.reset}<ArrowRight size={16} /></button></div>}
  </section>
}
function Shelf({ saved, onSave, onPreview }: BookActions) {
  const items = books.filter(book => saved.includes(book.id))
  const whatsappUrl = buildAvailabilityUrl(items)
  const emailUrl = buildEmailAvailabilityUrl(items)
  return <>
    <aside className="shelf-availability-note"><BookOpen size={20} /><div><strong>A little note before you enquire</strong><p>Prices, editions, formats and cover designs depend on current availability. We’ll confirm the available edition and final price before you order. Saving a book does not reserve a copy.</p></div></aside>
    <section className="availability-panel"><div><div className="availability-heading"><MessageCircle size={21} /><h2>{inquiry.ui.title}</h2></div><p>{items.length ? format(items.length === 1 ? inquiry.ui.descriptionOne : inquiry.ui.description, { count: items.length }) : inquiry.ui.empty}</p><small id="availability-hint">{(inquiry.businessNumber || inquiry.email.recipient) ? inquiry.ui.hint : inquiry.ui.unconfigured}</small></div><div className="availability-actions">{whatsappUrl ? <Link className="primary-button" href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-describedby="availability-hint"><MessageCircle size={17} />{inquiry.ui.button}<ArrowRight size={16} /></Link> : <button className="primary-button" disabled aria-describedby="availability-hint"><MessageCircle size={17} />{inquiry.ui.button}</button>}{emailUrl ? <Link className="primary-button email-inquiry" href={emailUrl} aria-describedby="availability-hint"><Mail size={17} />{inquiry.ui.emailButton}<ArrowRight size={16} /></Link> : <button className="primary-button email-inquiry" disabled aria-describedby="availability-hint"><Mail size={17} />{inquiry.ui.emailButton}</button>}</div></section>
    {items.length > 0 && <div className="wishlist-heading"><span>{format(items.length === 1 ? ui.shelf.countOne : ui.shelf.countMany, { count: items.length })}</span><span>{ui.shelf.deviceLabel}</span></div>}
    <BookGrid items={items} saved={saved} onSave={onSave} onPreview={onPreview} />
    {!items.length && <div className="empty-state"><Bookmark size={35} /><h3>{ui.shelf.emptyTitle}</h3><p>{ui.shelf.emptyText}</p><Link href="/collection" className="primary-button">{ui.common.collection}<ArrowRight size={16} /></Link></div>}
    <StationeryCard />
  </>
}
function ListCards({ large = false, lists = readingLists }: { large?: boolean; lists?: typeof readingLists }) {
  return <div className={`list-cards ${large ? 'large' : ''}`}>{lists.map(list => <Link className={`list-card ${list.color}`} href={`/reading-lists/${list.slug}`} key={list.slug}><div className="list-card-top"><span>{list.label}</span><span>{list.icon}</span></div><div className="mini-shelf" aria-hidden="true">{list.ids.map(id => <Cover key={id} book={findBook(id)} />)}</div><h2>{list.title}</h2><p>{list.description}</p><span className="list-card-link">{format(ui.readingLists.cardLabel, { count: list.ids.length })}<ArrowRight size={18} /></span></Link>)}</div>
}
function HomeHero({ onPreview, home = defaultHome }: { onPreview: (book: Book) => void; home?: HomeContent }) {
  const positions = ['left', 'center', 'right']
  return <>
    <section className="hero"><div className="hero-copy"><div className="eyebrow"><span />{home.hero.eyebrow}</div><h1>{home.hero.titleLine}<br />{home.hero.secondLine} <em>{home.hero.emphasis}</em></h1><p><Lines lines={home.hero.description} /></p><button className="primary-button" onClick={() => navigate('/collection')}>{home.hero.cta}<ArrowDown size={16} /></button><div className="hero-footnote">{home.hero.footnote}</div></div><div className="hero-shelf"><div className="shelf-caption">{home.hero.shelfLabel}<span aria-hidden="true">↘</span></div>{home.hero.featuredBookIds.map((id, index) => <button key={id} className={`hero-book hero-book-${positions[index]}`} aria-label={format(ui.accessibility.exploreBook, { title: findBook(id).title })} onClick={() => onPreview(findBook(id))}><Cover book={findBook(id)} /></button>)}<div className="shelf-line" /><div className="handwritten">{home.hero.shelfNote}<span aria-hidden="true">⤴</span></div></div></section>

  </>
}
export default function App(props: Parameters<typeof BookstoreApp>[0]) {
  return props.route === '/stationery' ? <Stationery /> : <BookstoreApp {...props} />
}
