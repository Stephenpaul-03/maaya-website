import { format, inquiry, site } from '../content'
import type { Book } from '../books'

type InquiryConfig = typeof inquiry
type InquiryBook = Pick<Book, 'id' | 'title' | 'author' | 'languageLabel'>

function availabilityMessage(books: InquiryBook[], config: InquiryConfig) {
  const uniqueBooks = [...new Map(books.map(book => [book.id, book])).values()]
  if (!uniqueBooks.length) return null
  const values = { brand: site.brand.name, count: uniqueBooks.length }
  const body = [
    format(config.body.greeting, values),
    format(config.body.introduction, values),
    uniqueBooks.map((book, index) => format(config.body.bookLine, { ...values, number: index + 1, title: book.title, author: book.author, languages: book.languageLabel })).join('\n'),
    ...config.body.closing.map(line => format(line, values)),
  ].join('\n\n')
  return { body, values }
}

/** Opens a prepared chat; sending remains an explicit action in WhatsApp. */
export function buildAvailabilityUrl(books: InquiryBook[], config: InquiryConfig = inquiry): string | null {
  const message = availabilityMessage(books, config)
  if (!message || !/^[1-9][0-9]{6,14}$/.test(config.businessNumber)) return null
  return `https://wa.me/${config.businessNumber}?text=${encodeURIComponent(message.body)}`
}

/** Standard mailto handoff to the visitor's configured email app, without a download or new tab. */
export function buildEmailAvailabilityUrl(books: InquiryBook[], config: InquiryConfig = inquiry): string | null {
  const message = availabilityMessage(books, config)
  if (!message || !/^[^\s@<>,;:]+@[^\s@<>,;:]+\.[^\s@<>,;:]+$/.test(config.email.recipient)) return null
  const recipient = encodeURIComponent(config.email.recipient).replace('%40', '@')
  const subject = encodeURIComponent(format(config.email.subject, message.values))
  const body = encodeURIComponent(message.body.replace(/\r?\n/g, '\r\n'))
  return `mailto:${recipient}?subject=${subject}&body=${body}`
}
