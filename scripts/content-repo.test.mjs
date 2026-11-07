import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { configuration, readBundle, writeBundle, bundleHash, root, git, publishContent, pullContent, prepareContent } from './content-repo.mjs'

const temporary = []
afterEach(async () => { for (const directory of temporary.splice(0)) await fs.rm(directory, { recursive: true, force: true }) })
async function fixture() {
  const directory = await fs.mkdtemp(path.join(tmpdir(), 'store-split-test-'))
  temporary.push(directory)
  const files = await readBundle(root, true)
  const website = path.join(directory, 'website')
  await fs.mkdir(website)
  const remote = path.join(directory, 'remote.git')
  await git(directory, ['init', '--bare', remote])
  const config = { ...configuration({}, website), repo: remote }
  await git(directory, ['clone', '--', remote, config.checkout])
  await git(config.checkout, ['config', 'user.name', 'Store Test'])
  await git(config.checkout, ['config', 'user.email', 'test@example.com'])
  await writeBundle(config.checkout, files)
  await prepareContent(config)
  return { directory, website, files, config }
}
describe('sibling content repository', () => {
  it('keeps content outside the website and rejects unsafe repo configuration', () => {
    expect(configuration({}, '/workspace/website').checkout).toBe('/workspace/content')
    expect(configuration({ CONTENT_REPO_DIR: '../data' }, '/workspace/website').checkout).toBe('/workspace/data')
    for (const website of ['/workspace/website', '/workspace/website/']) expect(() => configuration({ CONTENT_REPO_DIR: './data' }, website)).toThrow('outside')
    for (const url of ['https://token@github.com/example/books', 'https://evil.example/repo', '--upload-pack=evil']) expect(() => configuration({ CONTENT_REPO_URL: url })).toThrow()
    expect(() => configuration({ CONTENT_REPO_BRANCH: '../main' })).toThrow()
  })
  it('generates only a validated build snapshot and rejects symlinked sources', async () => {
    const { website, config, files } = await fixture()
    await fs.writeFile(path.join(config.checkout, '.env'), 'SECRET=must-not-export')
    expect(bundleHash(await readBundle(website, true))).toBe(bundleHash(files))
    expect([...files.keys()].every(file => /^(content|book-covers)\//.test(file))).toBe(true)
    await expect(fs.stat(path.join(website, 'src/content/home.json'))).rejects.toThrow()
    const file = path.join(config.checkout, 'content/home.json')
    await fs.rename(file, file + '.original')
    await fs.symlink(file + '.original', file)
    await expect(prepareContent(config)).rejects.toThrow('Symlinks')
  })
  it('builds and publishes edits directly from the sibling repo while protecting remote changes', async () => {
    const { config, directory, website } = await fixture()
    const first = await publishContent(config)
    expect((await publishContent(config)).revision).toBe(first.revision)
    const file = path.join(config.checkout, 'content/home.json')
    const home = JSON.parse(await fs.readFile(file, 'utf8'))
    home.hero.titleLine = 'Edited in the real content repository'
    await fs.writeFile(file, JSON.stringify(home))
    await prepareContent(config)
    expect(JSON.parse(await fs.readFile(path.join(website, '.cache/content/home.json'), 'utf8')).hero.titleLine).toBe(home.hero.titleLine)
    await expect(pullContent(config)).rejects.toThrow('local edits')
    const second = await publishContent(config)
    expect(second.revision).not.toBe(first.revision)
    const other = path.join(directory, 'other')
    await git(directory, ['clone', '--branch', 'main', config.repo, other])
    await git(other, ['config', 'user.name', 'Other Test'])
    await git(other, ['config', 'user.email', 'other@example.com'])
    home.hero.titleLine = 'Remote edit'
    await fs.writeFile(path.join(other, 'content/home.json'), JSON.stringify(home))
    await git(other, ['add', 'content/home.json'])
    await git(other, ['commit', '-m', 'Remote change'])
    await git(other, ['push', 'origin', 'main'])
    await expect(publishContent(config)).rejects.toThrow('Remote content changed')
    await pullContent(config)
    expect(JSON.parse(await fs.readFile(file, 'utf8')).hero.titleLine).toBe('Remote edit')
    expect(JSON.parse(await fs.readFile(path.join(website, '.cache/content/home.json'), 'utf8')).hero.titleLine).toBe('Remote edit')
  }, 20000)
  it('can bootstrap a fresh website clone from the content remote', async () => {
    const { config, directory } = await fixture()
    await publishContent(config)
    const freshWebsite = path.join(directory, 'fresh-website')
    await fs.mkdir(freshWebsite)
    const freshConfig = { ...configuration({ CONTENT_REPO_DIR: '../fresh-content' }, freshWebsite), repo: config.repo }
    await prepareContent(freshConfig)
    expect(await git(freshConfig.checkout, ['remote', 'get-url', 'origin'])).toBe(config.repo)
    expect(bundleHash(await readBundle(freshWebsite, true))).toBe(bundleHash(await readBundle(config.checkout)))
  })
  it('does not publish unrelated staged files', async () => {
    const { config } = await fixture()
    await fs.writeFile(path.join(config.checkout, 'notes.txt'), 'private local notes')
    await git(config.checkout, ['add', 'notes.txt'])
    await expect(publishContent(config)).rejects.toThrow('Unrelated files are staged')
  })
})
