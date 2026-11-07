import Head from 'next/head'
import App from '../App'
import { pageMetadata } from '../lib/routes'
export default function NotFound() {
  return <><Head><title>{pageMetadata('/404').title}</title><meta name="robots" content="noindex" /></Head><App route="/404" /></>
}
