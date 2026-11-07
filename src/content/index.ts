import stationery from '../../.cache/content/stationery.json'
import site from '../../.cache/content/site.json'
import home from '../../.cache/content/home.json'
import about from '../../.cache/content/about.json'
import pages from '../../.cache/content/pages.json'
import ui from '../../.cache/content/ui.json'
import inquiry from '../../.cache/content/inquiry.json'
export { stationery, site, home, about, pages, ui, inquiry }

/** Named placeholders keep variable copy editable without putting JSX in content. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match))
}
