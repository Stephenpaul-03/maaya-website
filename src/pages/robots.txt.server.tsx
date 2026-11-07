import type { GetServerSideProps } from 'next'
export default function Robots() { return null }
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end('User-agent: *\nAllow: /\nDisallow: /__editor\nDisallow: /bookshelf\n' + (process.env.SITE_URL ? 'Sitemap: ' + new URL('/sitemap.xml', process.env.SITE_URL).href + '\n' : ''))
  return { props: {} }
}
