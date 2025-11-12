import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Layout from '../components/Layout'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  // don't show layout on login page
  const showLayout = router.pathname !== '/login'

  if (showLayout) {
    return (
      <Layout>
        <Component {...pageProps} />
      </Layout>
    )
  }

  return <Component {...pageProps} />
}
