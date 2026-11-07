import { afterEach, expect, it, vi } from 'vitest'
import { canonicalUrl, publicPath } from './site-url'
afterEach(() => vi.unstubAllEnvs())
it('prefixes cached assets and canonical URLs for a project Pages site', () => {
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/friendly-broccoli')
  vi.stubEnv('SITE_URL', 'https://stephenpaul-03.github.io')
  expect(publicPath('/book-covers/test.jpg')).toBe('/friendly-broccoli/book-covers/test.jpg')
  expect(canonicalUrl('/book/7')).toBe('https://stephenpaul-03.github.io/friendly-broccoli/book/7/')
  expect(canonicalUrl('/')).toBe('https://stephenpaul-03.github.io/friendly-broccoli/')
})
