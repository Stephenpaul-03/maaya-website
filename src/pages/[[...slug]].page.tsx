import type { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import App from '../App'
import { canonicalUrl } from '../lib/site-url'
import { pageMetadata, routes } from '../lib/routes'
type Props = { route: string; metadata: ReturnType<typeof pageMetadata>; canonical: string | null }
export default function StorePage({ route, metadata, canonical }: Props) {
  return <><Head>
    <title>{metadata.title}</title><meta name="description" content={metadata.description} />
    <meta property="og:title" content={metadata.title} /><meta property="og:description" content={metadata.description} />
    <meta property="og:type" content="website" /><meta name="twitter:card" content="summary" />
    {canonical && <link rel="canonical" href={canonical} />}{canonical && <meta property="og:url" content={canonical} />}
    {metadata.noindex && <meta name="robots" content="noindex,follow" />}
    {metadata.book && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(metadata.book).replace(/</g, '\\u003c') }} />}
  </Head><App route={route} /></>
}
export const getStaticPaths: GetStaticPaths = async () => ({
  paths: routes.map(route => ({ params: { slug: route === '/' ? [] : route.slice(1).split('/') } })), fallback: false,
})
export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const route = '/' + ((params?.slug as string[] | undefined) ?? []).join('/')
  if (!routes.includes(route)) return { notFound: true }
  return { props: { route, metadata: pageMetadata(route), canonical: canonicalUrl(route) } }
}
