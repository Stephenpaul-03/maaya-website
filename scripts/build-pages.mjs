import fs from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
if (basePath && !/^\/[a-zA-Z0-9_-]+$/.test(basePath)) throw new Error('Expected a GitHub Pages repository base path.')
const origin = process.env.SITE_URL
if (!origin) throw new Error('Set SITE_URL to the new website origin before exporting Pages.')
const env = { ...process.env, STATIC_EXPORT: '1', NEXT_PUBLIC_BASE_PATH: basePath, SITE_URL: origin }
const buildArgs = ['run', 'build', ...(process.argv.includes('--webpack') ? ['--', '--webpack'] : [])]
const result = spawnSync('npm', buildArgs, { stdio: 'inherit', env })
if (result.status !== 0) process.exit(result.status || 1)
const json = async name => JSON.parse(await fs.readFile('.cache/content/' + name + '.json', 'utf8'))
const catalog = await json('catalog'), journal = await json('journal'), lists = await json('reading-lists')
const routes = ['/', '/collection', '/reading-lists', '/journal', '/about', '/stationery',
  ...catalog.books.map(book => '/book/' + book.id),
  ...journal.articles.map(article => '/journal/' + article.slug),
  ...lists.lists.map(list => '/reading-lists/' + list.slug)]
const url = route => new URL(basePath + route + (route === '/' ? '' : '/'), origin).href
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
await fs.writeFile('out/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + routes.map(route => '<url><loc>' + escape(url(route)) + '</loc></url>').join('') + '</urlset>')
await fs.writeFile('out/robots.txt', 'User-agent: *\nAllow: /\nDisallow: ' + basePath + '/bookshelf/\nSitemap: ' + new URL(basePath + '/sitemap.xml', origin).href + '\n')
await fs.writeFile('out/.nojekyll', '')
console.log('GitHub Pages export ready in out/.')
