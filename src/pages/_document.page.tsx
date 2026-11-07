import { Html, Head, Main, NextScript } from 'next/document'
import { site } from '../content'
const themeScript = `try { const saved = JSON.parse(localStorage.getItem('dog-ear-theme')); const theme = saved === 'dark' || saved === 'light' ? saved : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; } catch {}`
export default function Document() {
  return <Html lang={site.metadata.language}><Head><meta name="theme-color" content={site.metadata.themeColor} /><script dangerouslySetInnerHTML={{ __html: themeScript }} /></Head><body><Main /><NextScript /></body></Html>
}
