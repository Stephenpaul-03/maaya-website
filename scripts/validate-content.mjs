import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import Ajv from 'ajv'

import { contentDirectory } from './content-paths.mjs'
const directory = fileURLToPath(new URL('../src/content/', import.meta.url))
const names = ['site', 'home', 'pages', 'catalog', 'reading-lists', 'journal', 'about', 'ui', 'inquiry', 'offers', 'shop', 'stationery']
const ajv = new Ajv({ allErrors: true })
const validators = Object.fromEntries(names.map(name => [name, ajv.compile(JSON.parse(fs.readFileSync(path.join(directory, 'schemas', `${name}.schema.json`), 'utf8')))]))
export function loadContent(source = contentDirectory()) {
  return Object.fromEntries(names.map(name => [name, JSON.parse(fs.readFileSync(path.join(source, `${name}.json`), 'utf8'))]))
}
export function validateContent(content) {
  const errors = []
  for (const name of names) {
    if (!validators[name](content[name])) errors.push(...validators[name].errors.map(error => `${name}.json${error.instancePath || '/'}: ${error.message}`))
  }
  if (errors.length) return errors
  const unique = (items, key, location) => {
    const seen = new Set()
    for (const item of items) {
      if (seen.has(item[key])) errors.push(`${location}: duplicate ${key} "${item[key]}"`)
      seen.add(item[key])
    }
    return seen
  }
  const genreIds = unique(content.catalog.genres, 'id', 'catalog.genres')
  const bookIds = unique(content.catalog.books, 'id', 'catalog.books')
  const languageIds = unique(content.catalog.languages, 'id', 'catalog.languages')
  for (const language of content.catalog.languages) {
    try {
      if (Intl.getCanonicalLocales(language.id)[0] !== language.id) errors.push(`catalog.languages: use a canonical language tag for "${language.id}"`)
    } catch { errors.push(`catalog.languages: invalid language tag "${language.id}"`) }
  }
  for (const book of content.catalog.books) for (const id of book.languageIds) {
    if (!languageIds.has(id)) errors.push(`catalog.books[${book.id}].languageIds: unknown language "${id}"`)
  }
  const listSlugs = unique(content['reading-lists'].lists, 'slug', 'reading-lists.lists')
  const articleSlugs = unique(content.journal.articles, 'slug', 'journal.articles')
  unique(content.site.navigation, 'href', 'site.navigation')
  unique(content.ui.collection.sortOptions, 'value', 'ui.collection.sortOptions')
  const bookReference = (id, location) => { if (!bookIds.has(id)) errors.push(`${location}: unknown book ID ${id}`) }
  for (const book of content.catalog.books) if (!genreIds.has(book.genreId)) errors.push(`catalog.books[${book.id}].genreId: unknown genre "${book.genreId}"`)
  for (const list of content['reading-lists'].lists) for (const id of list.ids) bookReference(id, `reading-lists.${list.slug}.ids`)
  for (const article of content.journal.articles) bookReference(article.book, `journal.${article.slug}.book`)
  for (const id of content.home.hero.featuredBookIds) bookReference(id, 'home.hero.featuredBookIds')
  for (const id of content.home.collection.featuredBookIds ?? []) bookReference(id, 'home.collection.featuredBookIds')
  for (const slug of content.home.readingLists.featuredSlugs ?? []) if (!listSlugs.has(slug)) errors.push(`home.readingLists.featuredSlugs: unknown reading list slug ${slug}`)
  if (!articleSlugs.has(content.home.journal.featuredArticleSlug)) errors.push('home.journal.featuredArticleSlug: unknown article slug')
  const checkTokens = (template, allowed, location) => {
    for (const [, token] of template.matchAll(/\{(\w+)\}/g)) if (!allowed.includes(token)) errors.push(`${location}: unsupported placeholder {${token}}`)
  }
  const inquiry = content.inquiry
  for (const [key, value] of Object.entries({ subject: inquiry.email.subject, greeting: inquiry.body.greeting, introduction: inquiry.body.introduction })) checkTokens(value, ['brand', 'count'], `inquiry.${key}`)
  inquiry.body.closing.forEach(line => checkTokens(line, ['brand', 'count'], 'inquiry.body.closing'))
  checkTokens(inquiry.body.bookLine, ['brand', 'count', 'number', 'title', 'author', 'languages'], 'inquiry.body.bookLine')
  for (const token of ['{title}', '{author}', '{languages}']) if (!inquiry.body.bookLine.includes(token)) errors.push(`inquiry.body.bookLine: must include ${token}`)
  unique(content.offers.items, 'id', 'offers.items')
  for (const offer of content.offers.items) {
    for (const id of offer.bookIds) bookReference(id, `offers.${offer.id}.bookIds`)
    for (const field of ['startsAt', 'endsAt']) {
      if (offer[field] !== null && !Number.isFinite(Date.parse(offer[field]))) errors.push(`offers.${offer.id}.${field}: invalid timestamp`)
    }
    if (offer.startsAt && offer.endsAt && Date.parse(offer.startsAt) >= Date.parse(offer.endsAt)) errors.push(`offers.${offer.id}: endsAt must be after startsAt`)
    const href = offer.cta.href
    if (href.startsWith('#/') || href.startsWith('/')) {
      const route = href.startsWith('#/') ? href.slice(1) : href
      const valid = ['/', '/collection', '/bookshelf', '/reading-lists', '/journal', '/about', '/stationery'].includes(route)
        || content.catalog.books.some(book => route === `/book/${book.id}`)
        || content['reading-lists'].lists.some(list => route === `/reading-lists/${list.slug}`)
        || content.journal.articles.some(article => route === `/journal/${article.slug}`)
      if (!valid) errors.push(`offers.${offer.id}.cta.href: unknown page`)
    } else {
      try { const url = new URL(href); if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error() }
      catch { errors.push(`offers.${offer.id}.cta.href: expected a valid HTTPS URL`) }
    }
  }
  return errors
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const errors = validateContent(loadContent())
    if (errors.length) { console.error(`Content validation failed:\n${errors.map(error => `- ${error}`).join('\n')}`); process.exitCode = 1 }
    else console.log(`Validated ${names.length} content files, schemas, templates, and cross-references.`)
  } catch (error) { console.error(`Content validation failed: ${error.message}`); process.exitCode = 1 }
}
