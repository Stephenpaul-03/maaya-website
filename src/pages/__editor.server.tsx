import dynamic from 'next/dynamic'
import Head from 'next/head'
import type { GetServerSideProps } from 'next'
const Editor = process.env.NODE_ENV === 'development' ? dynamic(() => import('../editor/Editor'), { ssr: false }) : () => null
export default function EditorPage() { return <><Head><title>Margin content editor</title><meta name="robots" content="noindex" /></Head><Editor /></> }
export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV !== 'development' || process.env.EDITOR_MODE !== '1') return { notFound: true }
  return { props: {} }
}
