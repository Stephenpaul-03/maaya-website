const staticExport = process.env.STATIC_EXPORT === '1'
export default {
  reactStrictMode: true,
  distDir: process.env.EDITOR_MODE === '1' ? '.next-editor' : staticExport ? 'out' : '.next',
  poweredByHeader: false,
  pageExtensions: ['page.tsx', ...(!staticExport ? ['server.tsx'] : [])],
  ...(staticExport ? { output: 'export', trailingSlash: true } : {}),
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
}
