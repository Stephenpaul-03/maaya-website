export type Field = { id: string; file: string; path: (string | number)[]; value: string }
export type Change = Omit<Field, 'id' | 'value'> & { previous: string; value: string }
export type Snapshot = { content: Record<string, unknown>; revisions: Record<string, string>; token: string; mode?: 'text' | 'content'; publishing?: { enabled: boolean; repository: string } }

export function fieldsFrom(content: Record<string, unknown>): Field[] {
  const result: Field[] = []
  const visit = (file: string, value: unknown, path: (string | number)[]) => {
    if (file === 'home' && (path[0] === 'journal' && ['featuredArticleSlug', 'titleLine', 'emphasis', 'description'].includes(String(path[1])) || ['featuredSlugs', 'featuredBookIds'].includes(String(path[1])))) return
    if (typeof value === 'string') result.push({ id: JSON.stringify([file, path]), file, path, value })
    else if (Array.isArray(value)) value.forEach((child, index) => visit(file, child, [...path, index]))
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, child]) => { if (key !== '$schema') visit(file, child, [...path, key]) })
  }
  Object.entries(content).filter(([file]) => ['site', 'home', 'pages', 'about', 'ui', 'inquiry', 'shop', 'stationery'].includes(file)).forEach(([file, value]) => visit(file, value, []))
  return result
}
export const normalized = (value: string) => value.replace(/\s+/g, ' ').trim()
export function displayText(value: string, brand: string) { return value.replaceAll('{brand}', brand) }

export function matchFields(text: string, fields: Field[], drafts: Record<string, string>, brand: string) {
  const target = normalized(text)
  if (!target) return []
  return fields.filter(field => [field.value, drafts[field.id]].some(value => typeof value === 'string' && normalized(displayText(value, brand)) === target))
}

export function changesFrom(fields: Field[], drafts: Record<string, string>): Change[] {
  return fields.filter(field => Object.hasOwn(drafts, field.id) && drafts[field.id] !== field.value)
    .map(field => ({ file: field.file, path: field.path, previous: field.value, value: drafts[field.id] }))
}
