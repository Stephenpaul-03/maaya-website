const targets = ':scope > *, .book-card, .list-card, .journal-card, .offer-card, .wishlist-row, .values-grid > div, .shop-chapters > article, .shop-detail-block, .shop-map, .shop-courier, .stationery-reveal, .supply-category, .stationery-use-cases > article'

/** Reveal once per mounted page, including cards added by filtering or offers. */
export function observeScrollReveals(root: HTMLElement, options: { targets?: string; keepVisible?: boolean } = {}) {
  if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  const tracked = new Set<HTMLElement>()
  const reveal = (element: HTMLElement) => {
    if (element.dataset.reveal !== 'pending') return
    element.dataset.reveal = 'visible'
    observer.unobserve(element)
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) reveal(entry.target as HTMLElement)
  }, { threshold: 0, rootMargin: '0px 0px -24px 0px' })
  const scan = () => {
    for (const element of tracked) if (!root.contains(element)) {
      observer.unobserve(element)
      tracked.delete(element)
    }
    root.querySelectorAll<HTMLElement>(options.targets ?? targets).forEach(element => {
      if (tracked.has(element)) return
      tracked.add(element)
      // Never hide already-painted content when attaching scroll animations.
      const bounds = options.keepVisible ? element.getBoundingClientRect() : null
      if (bounds && bounds.top < window.innerHeight && bounds.bottom > 0) {
        element.dataset.reveal = 'settled'
        return
      }
      const index = element.parentElement ? [...element.parentElement.children].indexOf(element) : 0
      element.style.setProperty('--reveal-delay', `${Math.min(index, 4) * 55}ms`)
      element.dataset.reveal = 'pending'
      observer.observe(element)
    })
  }
  const onFocus = (event: FocusEvent) => {
    if (!(event.target instanceof Element)) return
    for (const element of tracked) if (element.contains(event.target)) {
      element.dataset.reveal = 'settled'
      observer.unobserve(element)
    }
  }
  const onAnimationEnd = (event: AnimationEvent) => {
    if (event.animationName !== 'content-reveal' || !(event.target instanceof HTMLElement)) return
    if (tracked.has(event.target)) event.target.dataset.reveal = 'settled'
  }
  scan()
  const mutations = new MutationObserver(scan)
  mutations.observe(root, { childList: true, subtree: true })
  root.addEventListener('focusin', onFocus)
  root.addEventListener('animationend', onAnimationEnd)
  return () => {
    observer.disconnect()
    mutations.disconnect()
    root.removeEventListener('focusin', onFocus)
    root.removeEventListener('animationend', onAnimationEnd)
    for (const element of tracked) {
      delete element.dataset.reveal
      element.style.removeProperty('--reveal-delay')
    }
  }
}
