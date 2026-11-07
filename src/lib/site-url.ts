export function publicPath(path: string) {
  return (process.env.NEXT_PUBLIC_BASE_PATH || '') + path
}
export function canonicalUrl(route: string): string | null {
  if (!process.env.SITE_URL) return null
  const base = new URL(process.env.SITE_URL)
  // SITE_URL is the origin; basePath belongs to the Next.js build configuration.
  return new URL(publicPath(route) + (route === '/' ? '' : '/'), base.origin).href
}
