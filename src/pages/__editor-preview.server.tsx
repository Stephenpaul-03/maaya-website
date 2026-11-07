import dynamic from 'next/dynamic'
import Head from 'next/head'
import type { GetServerSideProps } from 'next'
const Preview = process.env.NODE_ENV === 'development' ? dynamic(() => import('../editor/EditorialPreview'), { ssr: false }) : () => null
export default function DraftPreviewPage() { return <><Head><title>Editorial draft preview</title><meta name="robots" content="noindex" /></Head><Preview /></> }
export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV !== 'development' || process.env.EDITOR_MODE !== '1') return { notFound: true }
  return { props: {} }
}
