// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import EditorialPreview from './EditorialPreview'
vi.mock('../App', () => ({ default: ({ route, editorialDraft }: { route: string; editorialDraft: { entry: { title: string } } }) => <div><h1>{editorialDraft.entry.title}</h1><span>{route}</span><a href="/collection">Collection</a><button className="theme-toggle">Theme</button><details><summary>Details</summary>Text</details><button>Save book</button></div> }))
afterEach(cleanup)
it('accepts drafts only from the same-origin parent and disables navigation', () => {
  render(<EditorialPreview />)
  const data = { type: 'editor-preview-draft', view: 'page', draft: { kind: 'journal', entry: { title: 'Local draft' } } }
  fireEvent(window, new MessageEvent('message', { source: window.parent, origin: 'https://untrusted.example', data }))
  expect(screen.queryByText('Local draft')).toBeNull()
  fireEvent(window, new MessageEvent('message', { origin: window.location.origin, data }))
  expect(screen.queryByText('Local draft')).toBeNull()
  fireEvent(window, new MessageEvent('message', { source: window.parent, origin: window.location.origin, data }))
  expect(screen.getByText('/journal/__draft')).toBeTruthy()
  expect(fireEvent.click(screen.getByRole('link'))).toBe(false)
  expect(fireEvent.click(screen.getByRole('button', { name: 'Theme' }))).toBe(true)
  expect(fireEvent.click(screen.getByText('Details'))).toBe(true)
  expect(fireEvent.click(screen.getByRole('button', { name: 'Save book' }))).toBe(false)
})
