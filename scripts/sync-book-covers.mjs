import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, rename, stat, open, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { contentRepository } from './content-paths.mjs'
import { prepareContent } from './content-repo.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const normalize = value => String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
export const identity = book => createHash('sha256').update(JSON.stringify([book.title, book.author, book.languageIds])).digest('hex').slice(0, 20)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const maxImageBytes = 5 * 1024 * 1024
const coverSizes = ['extraLarge', 'large', 'medium', 'small', 'thumbnail', 'smallThumbnail']

export function coverCandidates(links = {}) {
  const seen = new Set()
  return coverSizes.flatMap(size => {
    const url = imageUrl(links[size])
    if (!url || seen.has(url)) return []
    seen.add(url)
    return [{ size, url }]
  })
}

export async function bestCover(volume, apiKey, fetchImpl = fetch, pause = sleep) {
  // Search responses often only include thumbnails. Read the selected volume's
  // full metadata before choosing among the sizes Google actually publishes.
  const url = new URL(`https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(volume.id)}`)
  url.searchParams.set('key', apiKey)
  let links = volume.volumeInfo.imageLinks
  try {
    const response = await request(url, fetchImpl, pause)
    const details = await response.json()
    if (details.id === volume.id && details.volumeInfo?.imageLinks) links = { ...links, ...details.volumeInfo.imageLinks }
  } catch (error) { if (error.stop) throw error }
  for (const candidate of coverCandidates(links)) {
    try { return { ...await downloadImage(candidate.url, fetchImpl, pause), source: candidate.url, imageSize: candidate.size } }
    catch (error) { if (error.stop && error.message.includes('429')) throw error }
  }
  throw new Error('No downloadable cover size available')
}

export function imageUrl(value) {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
    if (!['books.google.com', 'books.googleusercontent.com'].includes(url.hostname)) return null
    url.protocol = 'https:'
    url.searchParams.delete('key')
    return url.href
  } catch { return null }
}

export function chooseVolume(book, items = []) {
  const title = normalize(book.title)
  const author = normalize(book.author)
  return items.filter(item => {
    const info = item.volumeInfo
    // Avoid silently selecting a different book with a similar title.
    return typeof item.id === 'string' && info && normalize(info.title) === title
      && info.authors?.some(name => normalize(name) === author)
      && (!info.language || book.languageIds.includes(info.language))
      && coverCandidates(info.imageLinks).length > 0
  }).sort((a, b) => Number(b.volumeInfo.publishedDate?.startsWith(book.year)) - Number(a.volumeInfo.publishedDate?.startsWith(book.year)))[0]
}

async function request(url, fetchImpl, pause, attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    let response
    try { response = await fetchImpl(url, { signal: AbortSignal.timeout(15000), redirect: 'error' }) }
    catch {
      if (attempt + 1 === attempts) throw new Error('Network request failed or timed out')
      await pause(500 * 2 ** attempt)
      continue
    }
    if (response.ok) return response
    if ((response.status === 429 || response.status >= 500) && attempt + 1 < attempts) {
      await response.body?.cancel()
      await pause(500 * 2 ** attempt)
      continue
    }
    const error = new Error(`Google Books request failed (HTTP ${response.status})`)
    error.stop = [400, 401, 403, 429].includes(response.status)
    throw error
  }
}

export async function downloadImage(url, fetchImpl = fetch, pause = sleep) {
  const safeUrl = imageUrl(url)
  if (!safeUrl) throw new Error('Unsupported cover image URL')
  const response = await request(safeUrl, fetchImpl, pause)
  if (Number(response.headers.get('content-length')) > maxImageBytes) throw new Error('Cover image exceeds 5 MB')
  const chunks = []
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.length
    if (size > maxImageBytes) throw new Error('Cover image exceeds 5 MB')
    chunks.push(chunk)
  }
  const bytes = Buffer.concat(chunks)
  // Check actual bytes, not only a remote Content-Type header. Never store HTML/SVG.
  const extension = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? 'jpg'
    : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'png'
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'webp' : null
  if (!extension) throw new Error('Response is not a supported cover image')
  return { bytes, extension }
}

async function atomicWrite(destination, data) {
  const temporary = `${destination}.${process.pid}.tmp`
  try { await writeFile(temporary, data); await rename(temporary, destination) }
  finally { await unlink(temporary).catch(() => {}) }
}

async function hasFile(directory, entry) {
  if (!/^book-covers\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(entry?.path || '')) return false
  try { return (await stat(path.join(directory, path.basename(entry.path)))).size > 0 } catch { return false }
}

export async function syncCovers({ books, directory, apiKey, refresh = false, dryRun = false, fetchImpl = fetch, pause = sleep, log = console.log }) {
  await mkdir(directory, { recursive: true })
  const manifestPath = path.join(directory, 'manifest.json')
  let manifest
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')) }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('Cannot read cover manifest; fix it before syncing'); manifest = { version: 1, books: {} } }
  if (manifest.version !== 1 || !manifest.books || typeof manifest.books !== 'object') throw new Error('Unsupported cover manifest')
  const result = { cached: 0, downloaded: 0, missing: 0, failed: 0, planned: 0 }
  for (const book of books) {
    const fingerprint = identity(book)
    const previous = manifest.books[book.id]
    const sameBook = previous?.fingerprint === fingerprint
    if (!refresh && sameBook && previous.status === 'ready' && await hasFile(directory, previous)) {
      result.cached++; log(`${book.title}: cached`); continue
    }
    if (!refresh && sameBook && previous.status === 'missing' && Date.now() - Date.parse(previous.checkedAt) < 7 * 86400000) {
      result.missing++; log(`${book.title}: no match (cached for seven days)`); continue
    }
    if (dryRun) { result.planned++; log(`${book.title}: would search Google Books`); continue }
    if (!apiKey) throw new Error('Set GOOGLE_BOOKS_API_KEY in .env before fetching missing covers')
    try {
      const url = new URL('https://www.googleapis.com/books/v1/volumes')
      url.search = new URLSearchParams({ q: `intitle:"${book.title.replaceAll('"', '')}" inauthor:"${book.author.replaceAll('"', '')}"`, printType: 'books', maxResults: '20', key: apiKey }).toString()
      const response = await request(url, fetchImpl, pause)
      const data = await response.json()
      if (data.error || (data.items !== undefined && !Array.isArray(data.items))) throw new Error('Unexpected Google Books response')
      const volume = chooseVolume(book, data.items) || (sameBook && previous.status === 'ready' && previous.volumeId && imageUrl(previous.sourceUrl)
        ? { id: previous.volumeId, volumeInfo: { imageLinks: { [previous.imageSize || 'thumbnail']: previous.sourceUrl } } }
        : undefined)
      const metadata = { fingerprint, title: book.title, author: book.author, languageIds: book.languageIds, checkedAt: new Date().toISOString() }
      if (!volume) {
        // A refresh must not erase a working cached cover just because search changed.
        if (!(sameBook && previous.status === 'ready' && await hasFile(directory, previous))) manifest.books[book.id] = { ...metadata, status: 'missing' }
        result.missing++; log(`${book.title}: no confident match with a cover`)
      } else {
        const { bytes, extension, source, imageSize } = await bestCover(volume, apiKey, fetchImpl, pause)
        const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
        const filename = `${book.id}-${fingerprint}-${digest}.${extension}`
        await atomicWrite(path.join(directory, filename), bytes)
        manifest.books[book.id] = { ...metadata, status: 'ready', path: `book-covers/${filename}`, imageSize, volumeId: volume.id, sourceUrl: source, sourcePage: `https://books.google.com/books?id=${encodeURIComponent(volume.id)}` }
        result.downloaded++; log(`${book.title}: downloaded (${imageSize})`)
      }
      await atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    } catch (error) {
      result.failed++
      // Do not print upstream error bodies or request URLs: they may contain the key.
      log(`${book.title}: sync failed; existing cache retained`)
      if (error.stop) throw new Error(error.message)
    }
    await pause(250)
  }
  return result
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help')) {
    console.log('npm run covers:sync -- [--dry-run] [--refresh] [--book ID]\nReads GOOGLE_BOOKS_API_KEY from .env. Cached covers are reused by default.')
    return
  }
  let bookId
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--book') { bookId = Number(args[++i]); if (!Number.isSafeInteger(bookId) || bookId < 1) throw new Error('--book requires a positive book ID') }
    else if (!['--refresh', '--dry-run'].includes(args[i])) throw new Error('Unknown option; use --help')
  }
  if (existsSync(path.join(root, '.env'))) loadEnvFile(path.join(root, '.env'))
  const catalog = JSON.parse(await readFile(path.join(contentRepository(), 'content/catalog.json'), 'utf8'))
  const books = bookId ? catalog.books.filter(book => book.id === bookId) : catalog.books
  if (!books.length) throw new Error('No matching catalog book')
  const lockPath = path.join(root, '.cache/book-covers.lock')
  await mkdir(path.dirname(lockPath), { recursive: true })
  let lock
  try { lock = await open(lockPath, 'wx') } catch { throw new Error('Another cover sync may be running. If an earlier run crashed, remove .cache/book-covers.lock and retry.') }
  try {
    const result = await syncCovers({ books, directory: path.join(contentRepository(), 'book-covers'), apiKey: process.env.GOOGLE_BOOKS_API_KEY, refresh: args.includes('--refresh'), dryRun: args.includes('--dry-run') })
    await prepareContent()
    console.log(result)
    if (result.failed) process.exitCode = 1
  } finally { await lock.close(); await unlink(lockPath) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
