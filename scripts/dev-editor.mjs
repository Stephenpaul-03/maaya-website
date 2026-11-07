import next from 'next'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import createEditorMiddleware from './editor-server.mjs'
import { configuration, publishContent, prepareContent } from './content-repo.mjs'
import fs from 'node:fs'
if (fs.existsSync('.env')) process.loadEnvFile('.env')
const mode = process.argv.find(arg => arg.startsWith('--mode='))?.slice(7) ?? 'text'
if (!['text', 'content'].includes(mode)) throw new Error('Use --mode=text or --mode=content.')
const contentConfig = configuration()
await prepareContent(contentConfig)
process.env.EDITOR_MODE = '1'
const port = Number(process.env.PORT || 3001)
const app = next({ dev: true, hostname: '127.0.0.1', port })
await app.prepare()
const handle = app.getRequestHandler()
const middleware = createEditorMiddleware({
  mode,
  afterSave: () => prepareContent(contentConfig),
  repository: contentConfig.repo,
  publish: contentConfig.repo ? () => publishContent(contentConfig) : undefined,
  onPublished: () => setTimeout(() => {
    server.close()
    void app.close().then(() => process.exit(0))
  }, 500),
})
const server = createServer((request, response) => {
  if (request.url?.startsWith('/_next/webpack-hmr')) { response.writeHead(204); response.end(); return }
  void middleware(request, response, () => handle(request, response))
})
server.listen(port, '127.0.0.1', () => {
  const url = 'http://127.0.0.1:' + port + '/__editor'
  console.log(`Local ${mode} editor: ${url}. Stop this process before switching editor commands.`)
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  spawn(command, process.platform === 'win32' ? ['/c', 'start', '', url] : [url], { stdio: 'ignore' }).on('error', () => {})
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.close(); void app.close().then(() => process.exit(0)) })
