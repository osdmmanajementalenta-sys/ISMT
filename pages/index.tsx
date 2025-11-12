import React, { useEffect, useState } from 'react'
import DataTable from '../components/DataTable'
import { requireAuth, getStoredUser, clearStoredUser, AppUser } from '../lib/auth'
import { useRouter } from 'next/router'

type SheetData = {
  headers: string[]
  rows: string[][]
}

function Home() {
  const [data, setData] = useState<SheetData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const router = useRouter()

  useEffect(() => {
    setUser(getStoredUser())

    fetch('/api/sheet')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch((e) => setError(String(e)))
  }, [])

  function signOut() {
    clearStoredUser()
    router.push('/login')
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Bagian Manajemen Talenta</h1>
        {user && (
          <div className="text-right">
            <div className="text-sm">{user.name || user.user}</div>
            <div className="text-xs text-gray-500">{user.type}</div>
            <button onClick={signOut} className="mt-1 text-sm text-blue-600">Sign out</button>
          </div>
        )}
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}
      {!data && !error && <div className="text-gray-600">Loading...</div>}
      {data && <DataTable headers={data.headers} rows={data.rows} />}
    </main>
  )
}

export default requireAuth(Home)
