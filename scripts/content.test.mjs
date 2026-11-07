import { describe, expect, it } from 'vitest'
import { loadContent, validateContent } from './validate-content.mjs'

describe('editable JSON content', () => {
  it('accepts real Next.js offer routes and legacy hash links', () => {
    const content = loadContent()
    for (const href of ['/collection', '/book/7', '#/collection']) {
      content.offers.items[0].cta.href = href
      expect(validateContent(content)).toEqual([])
    }
    content.offers.items[0].cta.href = '//untrusted.example'
    expect(validateContent(content).join('\n')).toContain('unknown page')
  })
  it('accepts historical years and rejects malformed years', () => {
    const content = loadContent()
    for (const year of ['180', '2023']) {
      content.catalog.books[0].year = year
      expect(validateContent(content)).toEqual([])
    }
    for (const year of ['unknown', '20230', '']) {
      content.catalog.books[0].year = year
      expect(validateContent(content).join('\n')).toContain('catalog.json/books/0/year')
    }
  })
  it('validates shop links and rejects pasted iframe HTML or unsafe social links', () => {
    const content = loadContent()
    content.shop.visit.mapEmbedUrl = 'https://www.google.com/maps/embed?pb=example'
    content.shop.contact.socials = [{ label: 'Instagram', url: 'https://www.instagram.com/example/' }]
    expect(validateContent(content)).toEqual([])
    content.shop.visit.mapEmbedUrl = '<iframe src="https://www.google.com/maps/embed?pb=example"></iframe>'
    content.shop.contact.socials[0].url = 'javascript:alert(1)'
    const errors = validateContent(content).join('\n')
    expect(errors).toContain('shop.json/visit/mapEmbedUrl')
    expect(errors).toContain('shop.json/contact/socials/0/url')
  })
  it('accepts the supplied content and ordinary editorial updates', () => {
    const content = loadContent()
    expect(validateContent(content)).toEqual([])
    content.site.brand.name = 'A Different Bookshop'
    content.catalog.books[0].title = 'A changed title'
    content['reading-lists'].lists[0].ids.push(1)
    content.inquiry.businessNumber = '12025550123'
    expect(validateContent(content)).toEqual([])
  })
  it('rejects broken book references, unknown genres, and duplicate IDs', () => {
    const content = loadContent()
    content.catalog.books[0].genreId = 'missing'
    content.catalog.books[1].id = content.catalog.books[0].id
    content.home.hero.featuredBookIds[0] = 999
    content.journal.articles[0].book = 888
    const errors = validateContent(content).join('\n')
    expect(errors).toContain('unknown genre')
    expect(errors).toContain('duplicate id')
    expect(errors).toContain('unknown book ID 999')
    expect(errors).toContain('unknown book ID 888')
  })
  it('rejects invalid structure, unsupported cover styles, and misspelled message tokens', () => {
    const content = loadContent()
    delete content.ui.shelf.emptyTitle
    content.catalog.books[0].cover.style = 'unknown-style'
    expect(validateContent(content).length).toBeGreaterThan(0)
    const badTemplate = loadContent()
    badTemplate.inquiry.body.bookLine = '{number}. {titlle} — {author}'
    const errors = validateContent(badTemplate).join('\n')
    expect(errors).toContain('unsupported placeholder {titlle}')
    expect(errors).toContain('must include {title}')
  })
  it('accepts additional languages and bilingual editions, and rejects broken language references', () => {
    const content = loadContent()
    content.catalog.languages.push({ id: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', direction: 'ltr' })
    content.catalog.books[0].languageIds = ['en', 'bn']
    expect(validateContent(content)).toEqual([])
    content.catalog.books[0].languageIds = ['missing']
    expect(validateContent(content).join('\n')).toContain('unknown language "missing"')
    content.catalog.books[0].languageIds = []
    expect(validateContent(content).length).toBeGreaterThan(0)
  })
  it('rejects duplicate language IDs and malformed language tags', () => {
    const content = loadContent()
    content.catalog.languages.push({ ...content.catalog.languages[0] })
    content.catalog.languages[1].id = 'not_a_tag'
    const errors = validateContent(content).join('\n')
    expect(errors).toContain('duplicate id "en"')
    expect(errors).toContain('invalid language tag')
  })

  it('rejects offers with invalid placement, references, dates, or unsafe links', () => {
    const content = loadContent()
    content.offers.position = 'unknown-position'
    expect(validateContent(content).join('\n')).toContain('offers.json/position')
    content.offers.position = 'after-hero'
    content.offers.items[0].bookIds = [999]
    content.offers.items[0].startsAt = '2026-09-22T00:00:00Z'
    content.offers.items[0].endsAt = '2026-09-21T00:00:00Z'
    content.offers.items[0].cta.href = '#/missing-page'
    const errors = validateContent(content).join('\n')
    expect(errors).toContain('unknown book ID 999')
    expect(errors).toContain('endsAt must be after startsAt')
    expect(errors).toContain('unknown page')
    content.offers.items[0].cta.href = 'javascript:alert(1)'
    expect(validateContent(content).join('\n')).toContain('offers.json/items/0/cta/href')
  })

})
