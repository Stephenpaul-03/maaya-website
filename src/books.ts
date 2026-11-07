import catalog from '../.cache/content/catalog.json'
export const genres = catalog.genres
export const languages = catalog.languages
export type Book = (typeof catalog.books)[number] & {
  genre: string
  style: string
  languageLabel: string
  languageSearch: string
  primaryLanguage: (typeof languages)[number]
}
export const books: Book[] = catalog.books.map(book => {
  const editions = book.languageIds.map(id => languages.find(language => language.id === id)!)
  return {
    ...book,
    genre: genres.find(genre => genre.id === book.genreId)!.label,
    style: book.cover.style,
    languageLabel: editions.map(language => language.label).join(', '),
    languageSearch: editions.map(language => `${language.id} ${language.label} ${language.nativeLabel}`).join(' '),
    primaryLanguage: editions[0],
  }
})
export const findBook = (id: number) => books.find(book => book.id === id)!
export const matchesBookSearch = (book: Book, query: string) =>
  `${book.title} ${book.author} ${book.genre} ${book.languageSearch}`.normalize('NFC').toLocaleLowerCase().includes(query.trim().normalize('NFC').toLocaleLowerCase())
