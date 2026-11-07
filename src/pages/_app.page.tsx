import type { AppProps } from 'next/app'
import localFont from 'next/font/local'
import '../index.css'
import '../App.css'
import '../home.css'
import '../transitions.css'
import '../Cover.css'
import '../components/ShopInfo.css'
import '../components/Stationery.css'
import '../editor/editor.css'
const sans = localFont({ src: '../../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2', variable: '--font-sans', display: 'block', weight: '100 900' })
const serif = localFont({ src: '../../node_modules/@fontsource/libre-caslon-display/files/libre-caslon-display-latin-400-normal.woff2', variable: '--font-serif', display: 'block', weight: '400' })
export default function Application({ Component, pageProps }: AppProps) {
  return <div id="root" className={sans.variable + ' ' + serif.variable}><Component {...pageProps} /></div>
}
