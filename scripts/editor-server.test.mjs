import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { loadContent } from './validate-content.mjs'
import editorServer, { readSnapshot, prepareEdits, saveEdits } from './editor-server.mjs'

const temporary = []
afterEach(async () => { for (const directory of temporary.splice(0)) await fs.rm(directory, { recursive: true, force: true }) })
async function fixture() {
  const directory = await fs.mkdtemp(path.join(tmpdir(), 'bookstore-editor-'))
  temporary.push(directory)
  const content = loadContent()
  for (const [name, value] of Object.entries(content)) await fs.writeFile(path.join(directory, `${name}.json`), JSON.stringify(value))
  const snapshot = await readSnapshot(directory)
  const change = { file: 'home', path: ['hero', 'titleLine'], previous: content.home.hero.titleLine, value: 'Books for every day.' }
  return { directory, snapshot, change }
}
describe('local editor saving', () => {
  it('saves to the configured external content directory and refreshes the preview after saving', async () => {
    const { directory, change } = await fixture()
    const generated = path.join(directory, 'preview-home.json')
    const middleware = editorServer({ directory, backupRoot: path.join(directory, 'backups'), afterSave: () => fs.copyFile(path.join(directory, 'home.json'), generated) })
    const response = { setHeader() {}, end(value) { this.body = JSON.parse(value) } }
    await middleware({ url: '/__editor/api/content', method: 'GET', headers: { host: 'localhost:3001' } }, response, () => {})
    const { token, revisions } = response.body
    const request = { url: '/__editor/api/content', method: 'POST', headers: { host: 'localhost:3001', origin: 'http://localhost:3001', 'x-editor-token': token, 'content-type': 'application/json' }, async *[Symbol.asyncIterator]() { yield JSON.stringify({ changes: [change], revisions }) } }
    await middleware(request, response, () => {})
    expect(response.statusCode).toBe(200)
    expect(JSON.parse(await fs.readFile(path.join(directory, 'home.json'), 'utf8')).hero.titleLine).toBe(change.value)
    expect(JSON.parse(await fs.readFile(generated, 'utf8')).hero.titleLine).toBe(change.value)
    expect((await fs.readdir(path.join(directory, 'backups'))).length).toBe(1)
  })

  it('saves stationery copy with revision checks and a backup independently of the bookstore', async () => {
    const { directory, snapshot } = await fixture()
    const change = { file: 'stationery', path: ['hero', 'title'], previous: snapshot.content.stationery.hero.title, value: 'Your next idea starts here.' }
    const result = await saveEdits(directory, path.join(directory, 'backups'), [change], snapshot.revisions)
    expect(result.files).toEqual(['stationery'])
    const after = await readSnapshot(directory)
    expect(after.content.stationery.hero.title).toBe(change.value)
    expect(after.content.home).toEqual(snapshot.content.home)
    const [backup] = await fs.readdir(path.join(directory, 'backups'))
    expect(await fs.readFile(path.join(directory, 'backups', backup, 'stationery.json'), 'utf8')).toBe(snapshot.raw.stationery)
    expect(() => prepareEdits(after, [change], snapshot.revisions)).toThrow('changed on disk')
  })

  it('enforces mode-specific endpoints server-side', async () => {
    for (const mode of ['text', 'content']) {
      const middleware = editorServer({ mode })
      const response = { setHeader() {}, end(value) { this.body = JSON.parse(value) } }
      await middleware({ url: '/__editor/api/content', method: 'GET', headers: { host: 'localhost:3001' } }, response, () => {})
      expect(response.body.mode).toBe(mode)
      const token = response.body.token
      for (const url of mode === 'text' ? ['/__editor/api/homepage', '/__editor/api/create', '/__editor/api/offers'] : ['/__editor/api/content']) {
        await middleware({ url, method: 'POST', headers: { host: 'localhost:3001', origin: 'http://localhost:3001', 'x-editor-token': token, 'content-type': 'application/json' } }, response, () => {})
        expect(response.statusCode).toBe(403)
        expect(response.body.error).toContain('unavailable')
      }
    }
  })
  it('rejects direct text edits to protected content and homepage references', async () => {
    const { snapshot, change } = await fixture()
    for (const file of ['catalog', 'journal', 'reading-lists', 'offers']) expect(() => prepareEdits(snapshot, [{ ...change, file }], snapshot.revisions)).toThrow('protected')
    for (const path of [['journal', 'featuredArticleSlug'], ['readingLists', 'featuredSlugs', 0], ['journal', 'titleLine']]) expect(() => prepareEdits(snapshot, [{ ...change, path }], snapshot.revisions)).toThrow('protected')
  })
  it('saves all homepage selections together, updates journal copy and backs up home', async () => {
    const { directory, snapshot } = await fixture()
    const article = snapshot.content.journal.articles.find(item => item.slug !== snapshot.content.home.journal.featuredArticleSlug)
    const homepage = { heroBookIds: [4, 1, 3], collectionBookIds: [6, 5, 4, 3, 2, 1], readingListSlugs: snapshot.content['reading-lists'].lists.slice(0, 3).map(item => item.slug).reverse(), journalSlug: article.slug }
    const result = await saveEdits(directory, path.join(directory, 'backups'), [], snapshot.revisions, [], undefined, homepage)
    expect(result.files).toEqual(['home'])
    const after = await readSnapshot(directory)
    expect(after.content.home.hero.featuredBookIds).toEqual(homepage.heroBookIds)
    expect(after.content.home.collection.featuredBookIds).toEqual(homepage.collectionBookIds)
    expect(after.content.home.readingLists.featuredSlugs).toEqual(homepage.readingListSlugs)
    expect(after.content.home.journal).toMatchObject({ featuredArticleSlug: article.slug, titleLine: article.title, emphasis: '', description: [article.intro] })
    expect(after.content.home.hero.titleLine).toBe(snapshot.content.home.hero.titleLine)
    const [backup] = await fs.readdir(path.join(directory, 'backups'))
    expect(await fs.readFile(path.join(directory, 'backups', backup, 'home.json'), 'utf8')).toBe(snapshot.raw.home)
  })
  it('rejects incomplete, duplicate, unknown and stale homepage selections', async () => {
    const { snapshot } = await fixture()
    const selection = { heroBookIds: [1, 2, 3], collectionBookIds: [1, 2, 3, 4, 5, 6], readingListSlugs: snapshot.content['reading-lists'].lists.slice(0, 3).map(item => item.slug), journalSlug: snapshot.content.journal.articles[0].slug }
    const check = (changes, revisions = snapshot.revisions) => prepareEdits(snapshot, [], revisions, [], undefined, { ...selection, ...changes })
    expect(() => check({ collectionBookIds: [1] })).toThrow()
    expect(() => check({ collectionBookIds: [1, 1, 3, 4, 5, 6] })).toThrow()
    expect(() => check({ heroBookIds: [1, 2, 999999] })).toThrow('unknown book')
    expect(() => check({ readingListSlugs: ['missing', ...selection.readingListSlugs.slice(1)] })).toThrow('unknown reading list')
    expect(() => check({ journalSlug: 'missing' })).toThrow('Unknown journal')
    for (const file of ['home', 'catalog', 'reading-lists', 'journal']) expect(() => check({}, { ...snapshot.revisions, [file]: 'stale' })).toThrow('changed on disk')
  })
  it('adds, changes, reorders and removes coupons with a recoverable offers backup', async () => {
    const { directory, snapshot } = await fixture()
    const offers = structuredClone(snapshot.content.offers)
    offers.items.push({ ...offers.items[0], id: 'new-coupon', code: 'NEW10', enabled: false })
    offers.items.reverse()
    offers.items[1].title = 'Updated offer'
    const result = await saveEdits(directory, path.join(directory, 'backups'), [], snapshot.revisions, [], offers)
    expect(result.files).toEqual(['offers'])
    expect((await readSnapshot(directory)).content.offers).toEqual(offers)
    const [backup] = await fs.readdir(path.join(directory, 'backups'))
    expect(await fs.readFile(path.join(directory, 'backups', backup, 'offers.json'), 'utf8')).toBe(snapshot.raw.offers)
    const current = await readSnapshot(directory)
    await saveEdits(directory, path.join(directory, 'backups'), [], current.revisions, [], { ...offers, items: [] })
    expect((await readSnapshot(directory)).content.offers.items).toEqual([])
    expect((await readSnapshot(directory)).raw.catalog).toBe(snapshot.raw.catalog)
  })
  it('rejects stale coupons, duplicate IDs, invalid dates, unsafe links and missing books', async () => {
    const { snapshot } = await fixture()
    const config = snapshot.content.offers
    const check = item => prepareEdits(snapshot, [], snapshot.revisions, [], { ...config, items: [item] })
    expect(() => prepareEdits(snapshot, [], { ...snapshot.revisions, offers: 'stale' }, [], config)).toThrow('changed on disk')
    expect(() => prepareEdits(snapshot, [], { ...snapshot.revisions, catalog: 'stale' }, [], config)).toThrow('changed on disk')
    expect(() => prepareEdits(snapshot, [], snapshot.revisions, [], { ...config, items: [config.items[0], config.items[0]] })).toThrow('duplicate')
    expect(() => check({ ...config.items[0], bookIds: [999999] })).toThrow('unknown book')
    expect(() => check({ ...config.items[0], startsAt: '2026-10-11T10:00:00Z', endsAt: '2026-10-10T10:00:00Z' })).toThrow('endsAt')
    expect(() => check({ ...config.items[0], cta: { ...config.items[0].cta, href: 'javascript:alert(1)' } })).toThrow()
  })
  it('creates a journal and reading list with backups and preserves existing entries', async () => {
    const { directory, snapshot } = await fixture()
    const additions = [
      { kind: 'journal', entry: { ...snapshot.content.journal.articles[0], slug: 'a-new-journal', title: 'New journal' } },
      { kind: 'reading-lists', entry: { ...snapshot.content['reading-lists'].lists[0], slug: 'a-new-list', title: 'New list' } },
    ]
    for (const addition of additions) {
      const before = await readSnapshot(directory)
      const result = await saveEdits(directory, path.join(directory, 'backups'), [], before.revisions, [addition])
      expect(result.files).toEqual([addition.kind])
      const after = await readSnapshot(directory)
      const key = addition.kind === 'journal' ? 'articles' : 'lists'
      expect(after.content[addition.kind][key]).toEqual([...before.content[addition.kind][key], addition.entry])
    }
  })
  it('rejects duplicate slugs, invalid references, arbitrary files and stale creation requests', async () => {
    const { snapshot } = await fixture()
    const addition = { kind: 'journal', entry: { ...snapshot.content.journal.articles[0], slug: 'new-entry' } }
    expect(() => prepareEdits(snapshot, [], snapshot.revisions, [{ ...addition, entry: snapshot.content.journal.articles[0] }])).toThrow('duplicate')
    expect(() => prepareEdits(snapshot, [], snapshot.revisions, [{ ...addition, entry: { ...addition.entry, book: 999999 } }])).toThrow('unknown book')
    expect(() => prepareEdits(snapshot, [], snapshot.revisions, [{ ...addition, kind: '../.env' }])).toThrow('Invalid')
    expect(() => prepareEdits(snapshot, [], { ...snapshot.revisions, catalog: 'stale' }, [addition])).toThrow('changed on disk')
    expect(() => prepareEdits(snapshot, [], { ...snapshot.revisions, journal: 'stale' }, [addition])).toThrow('changed on disk')
    expect(() => prepareEdits(snapshot, [], snapshot.revisions, [{ ...addition, entry: { ...addition.entry, paragraphs: [] } }])).toThrow()
  })
  it('saves text to JSON and backs up the original file', async () => {
    const { directory, snapshot, change } = await fixture()
    const backups = path.join(directory, 'backups')
    await saveEdits(directory, backups, [change], snapshot.revisions)
    expect((await readSnapshot(directory)).content.home.hero.titleLine).toBe(change.value)
    const [transaction] = await fs.readdir(backups)
    expect(await fs.readFile(path.join(backups, transaction, 'home.json'), 'utf8')).toBe(snapshot.raw.home)
  })
  it('rejects stale edits without overwriting external changes', async () => {
    const { directory, snapshot, change } = await fixture()
    const external = { ...snapshot.content.home, hero: { ...snapshot.content.home.hero, titleLine: 'Someone else edited this' } }
    await fs.writeFile(path.join(directory, 'home.json'), JSON.stringify(external))
    await expect(saveEdits(directory, path.join(directory, 'backup'), [change], snapshot.revisions)).rejects.toThrow('changed on disk')
    expect((await readSnapshot(directory)).content.home.hero.titleLine).toBe(external.hero.titleLine)
  })
  it('rejects traversal, broken schema, and removed placeholders before writing anything', async () => {
    const { snapshot, change } = await fixture()
    expect(() => prepareEdits(snapshot, [{ ...change, file: '../.env' }], snapshot.revisions)).toThrow()
    expect(() => prepareEdits(snapshot, [{ ...change, path: ['__proto__', 'polluted'] }], snapshot.revisions)).toThrow()
    expect(() => prepareEdits(snapshot, [{ ...change, value: '' }], snapshot.revisions)).toThrow()
    const previous = snapshot.content.inquiry.body.bookLine
    expect(() => prepareEdits(snapshot, [{ file: 'inquiry', path: ['body', 'bookLine'], previous, value: 'No placeholders' }], snapshot.revisions)).toThrow('placeholders')
  })
  it('blocks cross-origin and unauthenticated save requests', async () => {
    const middleware = editorServer()
    const request = { url: '/__editor/api/content', method: 'POST', headers: { host: '127.0.0.1:5173', origin: 'https://untrusted.example', 'content-type': 'application/json' } }
    const response = { setHeader() {}, end(value) { this.body = JSON.parse(value) } }
    await middleware(request, response, () => {})
    expect(response.statusCode).toBe(403)
    request.headers.origin = 'http://127.0.0.1:5173'
    await middleware(request, response, () => {})
    expect(response.statusCode).toBe(403)
    request.url = '/__editor/api/publish'
    await middleware(request, response, () => {})
    expect(response.statusCode).toBe(403)
    request.url = '/__editor/api/create'
    await middleware(request, response, () => {})
    expect(response.statusCode).toBe(403)
  })
})
