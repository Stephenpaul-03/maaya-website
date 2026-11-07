// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EditorWorkspace } from './EditorWorkspace'
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('switches panes without unmounting fields or the preview', () => {
  render(<EditorWorkspace><form><label>Draft title<input defaultValue="Original" /></label></form><iframe title="Preview" /></EditorWorkspace>)
  const input = screen.getByLabelText('Draft title') as HTMLInputElement
  const frame = screen.getByTitle('Preview')
  fireEvent.change(input, { target: { value: 'Retained draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Preview only' }))
  expect(input.closest('[hidden]')).toBeTruthy()
  expect(frame.closest('[hidden]')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Form only' }))
  expect(input.value).toBe('Retained draft')
  expect(frame.isConnected).toBe(true)
})
it('uses one pane on narrow screens and reveals invalid form fields', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
  render(<EditorWorkspace><form><label>Required title<input required /></label></form><p>Preview content</p></EditorWorkspace>)
  expect(screen.queryByRole('button', { name: 'Split view' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Preview only' }))
  const field = screen.getByLabelText('Required title')
  fireEvent.invalid(field)
  expect(field.closest('[hidden]')).toBeNull()
  expect(screen.getByRole('alert').textContent).toContain('required fields')
})
