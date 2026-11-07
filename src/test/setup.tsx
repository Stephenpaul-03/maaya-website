import { vi } from 'vitest'
import type { ComponentProps } from 'react'
vi.mock('next/link', () => ({ default: ({ scroll, prefetch, ...props }: ComponentProps<'a'> & { scroll?: boolean; prefetch?: boolean }) => { void scroll; void prefetch; return <a {...props} /> } }))
