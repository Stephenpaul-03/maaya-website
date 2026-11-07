import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = fileURLToPath(new URL('../', import.meta.url))
if (fs.existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'))
export const names = ['site', 'home', 'pages', 'catalog', 'reading-lists', 'journal', 'about', 'ui', 'inquiry', 'offers', 'shop', 'stationery']
export const contentRepository = (env = process.env, website = root) => path.resolve(website, env.CONTENT_REPO_DIR || '../content')
export const contentDirectory = () => path.join(contentRepository(), 'content')
export const generatedDirectory = path.join(root, '.cache/content')
