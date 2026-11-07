import { expect, it } from 'vitest'
import { fieldsFrom, matchFields, changesFrom } from './model'

it('excludes protected content and homepage references from text fields', () => {
  expect(fieldsFrom({ catalog: { title: 'Book' }, journal: { title: 'Article' }, 'reading-lists': { title: 'List' }, offers: { title: 'Coupon' }, home: { hero: { titleLine: 'Site copy' }, readingLists: { featuredSlugs: ['list'] }, journal: { titleLine: 'Article teaser', featuredArticleSlug: 'article' } } }).map(field => field.value)).toEqual(['Site copy'])
})

it('maps nested text and placeholders without guessing ambiguous fields', () => {
  const fields = fieldsFrom({ home: { title: '{brand} books', lines: ['Hello', 'Hello'], $schema: 'ignore' } })
  expect(fields).toHaveLength(3)
  expect(matchFields('Margin books', fields, {}, 'Margin')[0].path).toEqual(['title'])
  expect(matchFields('Hello', fields, {}, 'Margin')).toHaveLength(2)
  const drafts = { [fields[0].id]: '{brand} stories' }
  expect(changesFrom(fields, drafts)).toEqual([{ file: 'home', path: ['title'], previous: '{brand} books', value: '{brand} stories' }])
  expect(changesFrom(fields, { [fields[0].id]: fields[0].value })).toEqual([])
})

it('exposes stationery headings and section copy to the text editor', () => {
  const fields = fieldsFrom({ stationery: { $schema: 'ignore', hero: { title: 'Fresh ideas' }, range: { items: [{ title: 'Pens' }] } } })
  expect(fields.map(field => field.path)).toEqual([['hero', 'title'], ['range', 'items', 0, 'title']])
  expect(matchFields('Fresh ideas', fields, {}, '')[0].file).toBe('stationery')
})
