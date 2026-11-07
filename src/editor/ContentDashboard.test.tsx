// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ContentDashboard } from './ContentDashboard'
afterEach(cleanup)
it('routes each card to its workspace and disables actions during publishing', () => {
  const callbacks = { onHomepage: vi.fn(), onCoupons: vi.fn(), onJournal: vi.fn(), onReadingList: vi.fn() }
  const { rerender } = render(<ContentDashboard disabled={false} {...callbacks} />)
  for (const [name, callback] of [['Homepage', callbacks.onHomepage], ['Coupons', callbacks.onCoupons], ['New journal', callbacks.onJournal], ['New reading list', callbacks.onReadingList]] as const) {
    fireEvent.click(screen.getByRole('button', { name }))
    expect(callback).toHaveBeenCalledOnce()
  }
  rerender(<ContentDashboard disabled {...callbacks} />)
  expect(screen.getAllByRole('button').every(button => (button as HTMLButtonElement).disabled)).toBe(true)
})
