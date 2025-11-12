import React, { useEffect, useState } from 'react'
import { requireAuth, getStoredUser, AppUser } from '../lib/auth'
import { useRouter } from 'next/router'

type SheetData = {
  headers: string[]
  rows: string[][]
}

function Landing() {
  const [settings, setSettings] = useState<SheetData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const router = useRouter()

  useEffect(() => {
    setUser(getStoredUser())
    fetch('/api/sheet?sheet=page_setting')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setSettings(d)
      })
      .catch((e) => setError(String(e)))
  }, [])

  if (!settings) {
    return <div className="p-6">{error ? <span className="text-red-600">{error}</span> : 'Loading settings...'}</div>
  }

  const headers = settings.headers // first header expected to be 'usertype'
  const rows = settings.rows

  // build map: usertype -> { sheetName: allowed }
  const permissionMap: Record<string, Record<string, boolean>> = {}
  rows.forEach((r) => {
    const type = (r[0] || '').toString()
    permissionMap[type] = {}
    for (let i = 1; i < headers.length; i++) {
      const sheet = headers[i]
      const val = (r[i] || '').toString().toLowerCase()
      permissionMap[type][sheet] = val === 'yes' || val === 'y' || val === 'true'
    }
  })

  const currentType = user?.type || ''
  const currentPermissions = permissionMap[currentType] || {}

  // prepare list of sheet pages from headers
  const sheetPages = headers.slice(1) // skip usertype column

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(to right, #424eed, #5b67f7)' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Halo, {user?.name || user?.user}</h1>
            <p className="text-sm text-gray-600 mt-1">Pilih halaman yang ingin Anda akses sesuai izin Anda • <span className="font-semibold" style={{ color: '#424eed' }}>{currentType}</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {sheetPages.map((sheet) => {
          const allowed = !!currentPermissions[sheet]
          
          // Hide card if user doesn't have permission (don't show "No Access" cards)
          if (!allowed) return null
          
          return (
            <div 
              key={sheet} 
              className="group relative p-5 rounded-xl border bg-white border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#424eed'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-all" style={{ background: 'linear-gradient(to right, #eef0ff, #f5f6ff)' }}>
                      <svg className="w-5 h-5" style={{ color: '#424eed' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="font-semibold text-lg text-gray-800">{sheet}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: '#424eed' }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Akses diberikan</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.push(`/sheet/${encodeURIComponent(sheet)}`)}
                className="w-full mt-3 px-4 py-2.5 rounded-lg font-medium text-sm text-white shadow-sm hover:shadow-md transition-all duration-200"
                style={{ background: 'linear-gradient(to right, #424eed, #5b67f7)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #3a42d4, #4e5ade)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #424eed, #5b67f7)'}
              >
                Buka Halaman
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default requireAuth(Landing)
