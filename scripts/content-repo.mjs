import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash, randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { validateContent } from './validate-content.mjs'

import { root, names, contentRepository } from './content-paths.mjs'
export { root, names }
const execute = promisify(execFile)
const digest = data => createHash('sha256').update(data).digest('hex')
export function configuration(env = process.env, directory = root) {
  directory = path.resolve(directory)
  const repo = env.CONTENT_REPO_URL || ''
  if (repo && !/^(https:\/\/github\.com\/|git@github(?:\.com|-personal):)[\w.-]+\/[\w.-]+(?:\.git)?$/.test(repo)) throw new Error('CONTENT_REPO_URL must be a credential-free GitHub HTTPS or SSH URL (github-personal is supported locally).')
  const branch = env.CONTENT_REPO_BRANCH || 'main'
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(branch)) throw new Error('Use a simple content branch name such as main.')
  const checkout = contentRepository(env, directory)
  if (checkout === directory || checkout.startsWith(directory + path.sep)) throw new Error('CONTENT_REPO_DIR must be outside the website repository.')
  return { repo, branch, directory, checkout }
}
export async function git(cwd, args) {
  try {
    return (await execute('git', args, { cwd, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, timeout: 120000, maxBuffer: 8 * 1024 * 1024 })).stdout.trim()
  } catch {
    throw new Error('Git ' + args[0] + ' failed. Check authentication, network, branch and repository permissions. Local edits are retained.')
  }
}
async function exists(file) { try { await fs.lstat(file); return true } catch (error) { if (error.code === 'ENOENT') return false; throw error } }
async function regularRead(base, relative) {
  let current = base
  for (const part of relative.split('/')) {
    current = path.join(current, part)
    if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Symlinks are not allowed in content: ' + relative)
  }
  if (!(await fs.stat(current)).isFile()) throw new Error('Expected a content file: ' + relative)
  return fs.readFile(current)
}
// Only these JSONs and manifest-referenced images cross the repository boundary.
export async function readBundle(directory, website = false) {
  const contentDir = website ? '.cache/content' : 'content'
  const coverDir = website ? 'public/book-covers' : 'book-covers'
  const files = new Map(), content = {}
  for (const name of names) {
    const bytes = await regularRead(directory, contentDir + '/' + name + '.json')
    content[name] = JSON.parse(bytes)
    files.set('content/' + name + '.json', bytes)
  }
  const errors = validateContent(content)
  if (errors.length) throw new Error(errors.slice(0, 6).join('\n'))
  const bytes = await regularRead(directory, coverDir + '/manifest.json')
  const manifest = JSON.parse(bytes)
  if (manifest.version !== 1 || !manifest.books || typeof manifest.books !== 'object') throw new Error('Invalid cover manifest.')
  files.set('book-covers/manifest.json', bytes)
  for (const record of Object.values(manifest.books)) {
    if (record.status !== 'ready') continue
    if (typeof record.path !== 'string' || !/^book-covers\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(record.path)) throw new Error('The trial content repository requires local cached cover paths.')
    const image = await regularRead(directory, (website ? 'public/' : '') + record.path)
    if (image.length > 5 * 1024 * 1024) throw new Error('Cover exceeds 5 MB: ' + record.path)
    files.set(record.path, image)
  }
  return files
}
export function bundleHash(files) {
  return digest([...files].sort(([a], [b]) => a.localeCompare(b)).map(([name, bytes]) => name + ':' + digest(bytes)).join('\n'))
}
export async function writeBundle(directory, files, website = false) {
  for (const [relative, bytes] of files) {
    const destination = website ? relative.startsWith('content/') ? '.cache/' + relative : 'public/' + relative : relative
    const parent = path.dirname(destination)
    let current = directory
    for (const part of parent.split('/')) {
      current = path.join(current, part)
      if (await exists(current)) {
        if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Refusing to write through a symlink.')
      } else await fs.mkdir(current)
    }
    const file = path.join(directory, destination)
    if (await exists(file) && (await fs.lstat(file)).isSymbolicLink()) throw new Error('Refusing to replace a symlink.')
    const temporary = file + '.' + randomUUID() + '.tmp'
    await fs.writeFile(temporary, bytes)
    await fs.rename(temporary, file)
  }
}
async function locked(config, task) {
  await fs.mkdir(path.join(config.directory, '.cache'), { recursive: true })
  const lock = path.join(config.directory, '.cache/content-repo.lock')
  let handle
  try { handle = await fs.open(lock, 'wx') } catch { throw new Error('Another content operation is running. Try again after it finishes.') }
  try { return await task() } finally { await handle.close(); await fs.unlink(lock) }
}
async function checkout(config) {
  if (!await exists(path.join(config.checkout, '.git'))) {
    if (await exists(config.checkout)) throw new Error('Content directory exists but is not a Git repository. Nothing was overwritten.')
    if (!config.repo) throw new Error('Clone the content repo beside the website or set CONTENT_REPO_URL.')
    await git(config.directory, ['clone', '--', config.repo, config.checkout])
  }
  if (config.repo && await git(config.checkout, ['remote', 'get-url', 'origin']) !== config.repo) throw new Error('Content repository remote differs from configuration.')
  if (await git(config.checkout, ['symbolic-ref', '--short', 'HEAD']) !== config.branch) throw new Error('Content repository is on the wrong branch.')
}
async function generate(config) {
  const files = await readBundle(config.checkout)
  await writeBundle(config.directory, files, true)
  return { directory: config.checkout, files: files.size }
}
export async function prepareContent(config = configuration()) {
  return locked(config, async () => {
    await checkout(config)
    if (process.env.CONTENT_FETCH_ON_BUILD === '1') {
      if (await git(config.checkout, ['status', '--porcelain'])) throw new Error('Content repository has local edits; refusing to pull over them.')
      await git(config.checkout, ['fetch', 'origin'])
      await git(config.checkout, ['merge', '--ff-only', 'origin/' + config.branch])
    }
    return generate(config)
  })
}
export async function pullContent(config) {
  if (!config.repo) throw new Error('Content remote is not configured. Set CONTENT_REPO_URL when the new repository is ready.')
  return locked(config, async () => {
    await checkout(config)
    if (await git(config.checkout, ['status', '--porcelain'])) throw new Error('Content repository has local edits. Commit or publish them before pulling; nothing was overwritten.')
    await git(config.checkout, ['fetch', 'origin'])
    await git(config.checkout, ['merge', '--ff-only', 'origin/' + config.branch])
    await generate(config)
    return { revision: await git(config.checkout, ['rev-parse', 'HEAD']) }
  })
}
export async function publishContent(config) {
  if (!config.repo) throw new Error('Content remote is not configured. Set CONTENT_REPO_URL when the new repository is ready.')
  return locked(config, async () => {
    await checkout(config)
    const files = await readBundle(config.checkout)
    await git(config.checkout, ['fetch', 'origin'])
    const remote = await git(config.checkout, ['for-each-ref', '--format=%(objectname)', 'refs/remotes/origin/' + config.branch])
    const head = await git(config.checkout, ['for-each-ref', '--format=%(objectname)', 'refs/heads/' + config.branch])
    if (remote && (!head || await git(config.checkout, ['merge-base', head, remote]) !== remote)) throw new Error('Remote content changed. Reconcile it in the content repository before publishing; no force-push is performed.')
    // Publish only the content bundle, never unrelated staged files or secrets.
    const allowed = new Set(files.keys())
    const stagedBefore = await git(config.checkout, ['diff', '--cached', '--name-only'])
    if (stagedBefore.split('\n').some(file => file && !allowed.has(file))) throw new Error('Unrelated files are staged in the content repository. Commit or unstage them before publishing.')
    await git(config.checkout, ['add', '--', ...files.keys()])
    if (await git(config.checkout, ['diff', '--cached', '--name-only'])) await git(config.checkout, ['commit', '-m', 'Update store content'])
    if (!head && !await git(config.checkout, ['for-each-ref', '--format=%(objectname)', 'refs/heads/' + config.branch])) throw new Error('There is no content to publish.')
    await git(config.checkout, ['push', 'origin', 'HEAD:refs/heads/' + config.branch])
    await generate(config)
    return { revision: await git(config.checkout, ['rev-parse', 'HEAD']), message: 'Content pushed. The website rebuild runs when the content dispatch workflow is configured.' }
  })
}
export async function exportContent(config) {
  const directory = path.join(config.directory, '.cache/content-export-' + randomUUID())
  await fs.mkdir(directory, { recursive: true })
  await writeBundle(directory, await readBundle(config.checkout))
  await fs.cp(path.join(root, 'templates/content-repo'), directory, { recursive: true })
  return { directory }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (await exists(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'))
  try {
    const config = configuration()
    const command = process.argv[2]
    if (command === 'export') console.log(await exportContent(config))
    else if (command === 'pull') console.log(await pullContent(config))
    else if (command === 'publish') console.log(await publishContent(config))
    else if (command === 'build' || command === 'prepare') {
      console.log(await prepareContent(config))
    } else throw new Error('Use prepare, export, pull, publish or build.')
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
