import type { GetServerSideProps } from 'next'
import { routes } from '../lib/routes'
export default function Sitemap() { return null }
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  if (!process.env.SITE_URL) { res.statusCode = 503; res.end('Set SITE_URL to enable the sitemap.'); return { props: {} } }
  const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
  const urls = routes.filter(route => route !== '/bookshelf').map(route => '<url><loc>' + escape(new URL(route, process.env.SITE_URL).href) + '</loc></url>').join('')
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls + '</urlset>')
  return { props: {} }
}
