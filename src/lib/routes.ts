import { books } from '../books'
import { articles, readingLists } from '../editorial'
import { pages, site, stationery } from '../content'
export const routes = ['/', '/collection', '/bookshelf', '/reading-lists', '/journal', '/about', '/stationery',
  ...books.map(book => '/book/' + book.id),
  ...readingLists.map(list => '/reading-lists/' + list.slug),
  ...articles.map(article => '/journal/' + article.slug)]
export function pageMetadata(route: string) {
  if (route === '/stationery') return { title: stationery.metadata.title, description: stationery.metadata.description, noindex: false, book: null }
  const book = books.find(book => route === '/book/' + book.id)
  const list = readingLists.find(list => route === '/reading-lists/' + list.slug)
  const article = articles.find(article => route === '/journal/' + article.slug)
  const page = ({ '/stationery': { title: 'Maaya Stationery', text: 'Everyday school, office and creative supplies. Wholesale-to-retail value with fewer middlemen.' }, '/collection': pages.collection, '/bookshelf': pages.bookshelf, '/reading-lists': pages.readingLists, '/journal': pages.journal, '/about': pages.about } as Record<string, { title: string; text: string }>)[route]
  return {
    title: route === '/' ? site.metadata.title : site.brand.name + ' — ' + (book?.title ?? list?.title ?? article?.title ?? page?.title ?? pages.notFound.title),
    description: book?.description ?? list?.description ?? article?.intro ?? page?.text ?? site.metadata.description,
    noindex: route === '/bookshelf' || !routes.includes(route),
    book: book ? { '@context': 'https://schema.org', '@type': 'Book', name: book.title, author: { '@type': 'Person', name: book.author }, inLanguage: book.languageIds, description: book.description } : null,
  }
}
