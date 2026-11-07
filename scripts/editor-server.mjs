import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { contentDirectory } from './content-paths.mjs'
import { validateContent } from './validate-content.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
export const contentNames = ['site', 'home', 'pages', 'catalog', 'reading-lists', 'journal', 'about', 'ui', 'inquiry', 'offers', 'shop', 'stationery']
const textFiles = ['site', 'home', 'pages', 'about', 'ui', 'inquiry', 'shop', 'stationery']
const hash = value => createHash('sha256').update(value).digest('hex')
export async function readSnapshot(directory) {
  const content = {}, revisions = {}, raw = {}
  for (const name of contentNames) {
    raw[name] = await fs.readFile(path.join(directory, `${name}.json`), 'utf8')
    content[name] = JSON.parse(raw[name])
    revisions[name] = hash(raw[name])
  }
  return { content, revisions, raw }
}

export function prepareEdits(snapshot, changes, revisions, additions = [], offers, homepage) {
  if (!Array.isArray(changes) || !Array.isArray(additions) || (changes.length + additions.length === 0 && offers === undefined && homepage === undefined) || changes.length > 500 || additions.length > 1) throw new Error('Provide text changes or one new editorial entry.')
  const content = structuredClone(snapshot.content)
  const files = new Set(), seen = new Set()
  for (const change of changes) {
    const { file, path: keys, value, previous } = change
    if (!textFiles.includes(file) || (file === 'home' && (keys?.[0] === 'journal' && ['featuredArticleSlug', 'titleLine', 'emphasis', 'description'].includes(keys?.[1]) || keys?.[1] === 'featuredSlugs' || keys?.[1] === 'featuredBookIds'))) throw new Error('This content is protected from text editing. Use the content editor or its source JSON.')
    if (!contentNames.includes(file) || !Array.isArray(keys) || !keys.length || keys.length > 20
      || keys.some(key => !['string', 'number'].includes(typeof key) || ['__proto__', 'constructor', 'prototype', '$schema'].includes(String(key)))
      || typeof value !== 'string' || value.length > 20000 || typeof previous !== 'string') throw new Error('Invalid text change.')
    if (revisions?.[file] !== snapshot.revisions[file]) throw new Error(`${file}.json changed on disk. Reload the editor before saving.`)
    const id = JSON.stringify([file, keys])
    if (seen.has(id)) throw new Error('Duplicate field change.')
    seen.add(id)
    let parent = content[file]
    for (const key of keys.slice(0, -1)) {
      if (!parent || !Object.hasOwn(parent, key)) throw new Error('Unknown content field.')
      parent = parent[key]
    }
    const key = keys.at(-1)
    if (!parent || !Object.hasOwn(parent, key) || typeof parent[key] !== 'string' || parent[key] !== previous) throw new Error('The original field no longer matches.')
    // Formatting placeholders remain functional even when the surrounding prose changes.
    const tokens = text => [...text.matchAll(/\{\w+\}/g)].map(match => match[0]).sort().join('|')
    if (tokens(previous) !== tokens(value)) throw new Error('Keep the original {placeholders} in the edited text.')
    parent[key] = value
    files.add(file)
  }
  for (const addition of additions) {
    if (!addition || !['journal', 'reading-lists'].includes(addition.kind) || !addition.entry || typeof addition.entry !== 'object' || Array.isArray(addition.entry)) throw new Error('Invalid editorial entry.')
    const file = addition.kind
    // New entries reference books and must be based on the reviewed catalog.
    for (const name of [file, 'catalog']) if (revisions?.[name] !== snapshot.revisions[name]) throw new Error(`${name}.json changed on disk. Reload the editor before creating an entry.`)
    content[file][file === 'journal' ? 'articles' : 'lists'].push(structuredClone(addition.entry))
    files.add(file)
  }
  if (offers !== undefined) {
    for (const name of ['offers', 'catalog']) if (revisions?.[name] !== snapshot.revisions[name]) throw new Error(`${name}.json changed on disk. Reload before saving coupons.`)
    if (!offers || typeof offers !== 'object' || Array.isArray(offers)) throw new Error('Invalid offers configuration.')
    content.offers = structuredClone(offers)
    files.add('offers')
  }
  if (homepage !== undefined) {
    for (const name of ['home', 'catalog', 'reading-lists', 'journal']) if (revisions?.[name] !== snapshot.revisions[name]) throw new Error(`${name}.json changed on disk. Reload before saving the homepage.`)
    if (!homepage || !Array.isArray(homepage.heroBookIds) || !Array.isArray(homepage.collectionBookIds) || !Array.isArray(homepage.readingListSlugs) || typeof homepage.journalSlug !== 'string') throw new Error('Invalid homepage selections.')
    content.home.hero.featuredBookIds = homepage.heroBookIds
    content.home.collection.featuredBookIds = homepage.collectionBookIds
    content.home.readingLists.featuredSlugs = homepage.readingListSlugs
    const article = content.journal.articles.find(item => item.slug === homepage.journalSlug)
    if (!article) throw new Error('Unknown journal selection.')
    if (content.home.journal.featuredArticleSlug !== article.slug) {
      content.home.journal.titleLine = article.title
      content.home.journal.emphasis = ''
      content.home.journal.description = [article.intro]
    }
    content.home.journal.featuredArticleSlug = article.slug
    files.add('home')
  }
  const errors = validateContent(content)
  if (errors.length) throw new Error(errors.slice(0, 6).join('\n'))
  return { content, files: [...files] }
}

export async function saveEdits(directory, backupRoot, changes, revisions, additions = [], offers, homepage) {
  const snapshot = await readSnapshot(directory)
  const { content, files } = prepareEdits(snapshot, changes, revisions, additions, offers, homepage)
  const transaction = randomUUID()
  const backup = path.join(backupRoot, transaction)
  await fs.mkdir(backup, { recursive: true })
  const written = []
  try {
    for (const file of files) {
      await fs.writeFile(path.join(backup, `${file}.json`), snapshot.raw[file])
      await fs.writeFile(path.join(directory, `${file}.${transaction}.tmp`), `${JSON.stringify(content[file], null, 2)}\n`)
    }
    // Recheck after preparing the files to detect external edits during validation.
    for (const file of [...new Set([...files, ...(additions.length || offers !== undefined ? ['catalog'] : []), ...(homepage !== undefined ? ['catalog', 'reading-lists', 'journal'] : [])])]) {
      if (hash(await fs.readFile(path.join(directory, `${file}.json`), 'utf8')) !== revisions[file]) throw new Error(`${file}.json changed while saving. Reload and try again.`)
    }
    for (const file of files) {
      await fs.rename(path.join(directory, `${file}.${transaction}.tmp`), path.join(directory, `${file}.json`))
      written.push(file)
    }
  } catch (error) {
    for (const file of written) await fs.writeFile(path.join(directory, `${file}.json`), snapshot.raw[file])
    throw error
  } finally {
    await Promise.all(files.map(file => fs.unlink(path.join(directory, `${file}.${transaction}.tmp`)).catch(() => {})))
  }
  return { files, backup: `.cache/editor-backups/${transaction}` }
}

export default function createEditorMiddleware({ publish, onPublished, repository = '', mode = 'text', afterSave, directory = contentDirectory(), backupRoot = path.join(root, '.cache/editor-backups') } = {}) {
  if (!['text', 'content'].includes(mode)) throw new Error('Invalid editor mode.')
  const token = randomUUID()
  let saving = false
  return async (request, response, next) => {
        const endpoint = request.url?.split('?')[0]
        if (!['/__editor/api/content', '/__editor/api/publish', '/__editor/api/create', '/__editor/api/offers', '/__editor/api/homepage'].includes(endpoint)) return next()
        response.setHeader('Content-Type', 'application/json')
        response.setHeader('Cache-Control', 'no-store')
        const reply = (status, body) => { response.statusCode = status; response.end(JSON.stringify(body)) }
        const host = request.headers.host || ''
        if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host) || request.headers['sec-fetch-site'] === 'cross-site') return reply(403, { error: 'Editor is available only on localhost.' })
        try {
          if (request.method === 'GET' && endpoint === '/__editor/api/content') {
            const { content, revisions } = await readSnapshot(directory)
            return reply(200, { content, revisions, token, mode, publishing: { enabled: Boolean(publish), repository } })
          }
          if (request.method !== 'POST') return reply(405, { error: 'Method not supported.' })
          if (request.headers.origin !== `http://${host}` || request.headers['x-editor-token'] !== token || !request.headers['content-type']?.startsWith('application/json')) return reply(403, { error: 'Invalid editor request.' })
          if (endpoint !== '/__editor/api/publish' && (mode === 'text' ? endpoint !== '/__editor/api/content' : endpoint === '/__editor/api/content')) return reply(403, { error: `This action is unavailable in ${mode} mode. Restart using npm run edit:${mode === 'text' ? 'content' : 'text'}.` })
          if (saving) return reply(409, { error: 'Another save is in progress. Try again.' })
          saving = true
          try {
            let body = ''
            for await (const chunk of request) {
              body += chunk
              if (Buffer.byteLength(body) > 1024 * 1024) throw new Error('The edit request is too large.')
            }
            const { changes, revisions, confirm, creation, offers, homepage } = JSON.parse(body)
            if (endpoint === '/__editor/api/publish') {
              if (!publish) throw new Error('Content publishing is not configured.')
              if (confirm !== 'publish-and-exit') throw new Error('Explicit publishing confirmation is required.')
              const snapshot = await readSnapshot(directory)
              if (contentNames.some(name => revisions?.[name] !== snapshot.revisions[name])) throw new Error('Content changed on disk. Reload and review before publishing.')
              const result = await publish()
              if (onPublished) response.once('finish', onPublished)
              return reply(200, result)
            }
            const result = endpoint === '/__editor/api/homepage'
              ? await saveEdits(directory, backupRoot, [], revisions, [], undefined, homepage)
              : endpoint === '/__editor/api/offers'
              ? await saveEdits(directory, backupRoot, [], revisions, [], offers)
              : endpoint === '/__editor/api/create'
              ? await saveEdits(directory, backupRoot, [], revisions, [creation])
              : await saveEdits(directory, backupRoot, changes, revisions)
            if (afterSave) await afterSave()
            return reply(200, result)
          } finally { saving = false }
        } catch (error) { return reply(400, { error: error.message || 'Unable to save content.' }) }
  }
}
