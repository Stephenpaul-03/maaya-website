// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { observeScrollReveals } from './scroll-reveal'

let notify: (entries: { target: Element; isIntersecting: boolean }[]) => void
let root: HTMLDivElement
let dispose: (() => void) | undefined
const unobserve = vi.fn()
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof notify) { notify = callback }
    observe = vi.fn()
    unobserve = unobserve
    disconnect = vi.fn()
  })
  root = document.createElement('div')
  root.innerHTML = '<section><article class="book-card"><button>Preview</button></article><article class="book-card"></article></section>'
  document.body.append(root)
})
afterEach(() => { dispose?.(); dispose = undefined; root.remove(); vi.unstubAllGlobals(); vi.clearAllMocks() })

it('waits for viewport entry, staggers siblings, and leaves revealed cards visible', () => {
  dispose = observeScrollReveals(root)
  const cards = root.querySelectorAll<HTMLElement>('.book-card')
  expect(cards[0].dataset.reveal).toBe('pending')
  expect(cards[1].style.getPropertyValue('--reveal-delay')).toBe('55ms')
  notify([{ target: cards[0], isIntersecting: false }])
  expect(cards[0].dataset.reveal).toBe('pending')
  notify([{ target: cards[0], isIntersecting: true }])
  expect(cards[0].dataset.reveal).toBe('visible')
  expect(unobserve).toHaveBeenCalledWith(cards[0])
  expect(cards[1].dataset.reveal).toBe('pending')
})

it('observes newly filtered cards and reveals keyboard-focused ancestors', async () => {
  dispose = observeScrollReveals(root)
  const card = document.createElement('article')
  card.className = 'book-card'
  root.firstElementChild!.append(card)
  await Promise.resolve()
  expect(card.dataset.reveal).toBe('pending')
  root.querySelector('button')!.focus()
  expect(root.querySelector<HTMLElement>('.book-card')!.dataset.reveal).toBe('settled')
  expect(root.querySelector('section')!.dataset.reveal).toBe('settled')
  dispose()
  expect(root.querySelector('[data-reveal]')).toBeNull()
})

it('keeps content visible with reduced motion or no observer support', () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
  dispose = observeScrollReveals(root)
  expect(root.querySelector('[data-reveal]')).toBeNull()
  vi.stubGlobal('IntersectionObserver', undefined)
  dispose = observeScrollReveals(root)
  expect(root.querySelector('[data-reveal]')).toBeNull()
})

it('finishes reveals permanently and does not replay after focus leaves for a modal', () => {
  dispose = observeScrollReveals(root)
  const card = root.querySelector<HTMLElement>('.book-card')!
  notify([{ target: card, isIntersecting: true }])
  const end = new Event('animationend', { bubbles: true })
  Object.defineProperty(end, 'animationName', { value: 'content-reveal' })
  card.dispatchEvent(end)
  expect(card.dataset.reveal).toBe('settled')
  const button = card.querySelector('button')!
  button.focus(); button.blur()
  notify([{ target: card, isIntersecting: true }])
  expect(card.dataset.reveal).toBe('settled')
})

it('keeps visible content settled and limits reveals to the requested targets', () => {
  const cards = root.querySelectorAll<HTMLElement>('.book-card')
  vi.spyOn(cards[0], 'getBoundingClientRect').mockReturnValue({ top: 40, bottom: 160 } as DOMRect)
  vi.spyOn(cards[1], 'getBoundingClientRect').mockReturnValue({ top: 2000, bottom: 2200 } as DOMRect)
  dispose = observeScrollReveals(root, { targets: '.book-card', keepVisible: true })
  expect(root.querySelector('section')!.hasAttribute('data-reveal')).toBe(false)
  expect(cards[0].dataset.reveal).toBe('settled')
  expect(cards[1].dataset.reveal).toBe('pending')
  notify([{ target: cards[0], isIntersecting: true }, { target: cards[1], isIntersecting: true }])
  expect(cards[0].dataset.reveal).toBe('settled')
  expect(cards[1].dataset.reveal).toBe('visible')
})
