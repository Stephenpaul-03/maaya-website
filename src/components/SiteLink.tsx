import Link from 'next/link'
import type { ComponentProps } from 'react'
export function SiteLink({ href = '', ...props }: ComponentProps<'a'>) {
  const destination = href.startsWith('#/') ? href.slice(1) : href
  return destination.startsWith('/') && !destination.startsWith('//')
    ? <Link {...props} href={destination} scroll={false} />
    : <a {...props} href={destination} />
}
