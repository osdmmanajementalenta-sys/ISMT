import React, { useEffect, useState } from 'react'
import Link from 'next/link'

type Props = {
  items: { name: string; sheetName: string }[]
  open?: boolean
  onClose?: () => void
}

import { useRouter } from 'next/router'
import { getStoredUser } from '../lib/auth'

type PermissionMap = Record<string, Record<string, boolean>>

export default function SideBar({ items, open = false, onClose }: Props) {
  const router = useRouter()
  const activeSheet = Array.isArray(router.query.sheet) ? router.query.sheet[0] : router.query.sheet
  const [permissions, setPermissions] = useState<PermissionMap | null>(null)
  const [loading, setLoading] = useState(true) // Start with loading true
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null)

  // Debug: log items
  console.log('SideBar items:', items, 'length:', items?.length)

  // Get user only on client-side to avoid hydration mismatch
  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  useEffect(() => {
    // fetch page_setting and build permission map
    setLoading(true)
    fetch('/api/sheet?sheet=page_setting')
      .then((r) => r.json())
      .then((d) => {
        if (d?.headers && d?.rows) {
          const headers: string[] = d.headers
          const rows: string[][] = d.rows
          const map: PermissionMap = {}
          rows.forEach((r: string[]) => {
            const type = (r[0] || '').toString()
            map[type] = {}
            for (let i = 1; i < headers.length; i++) {
              const sheet = headers[i]
              const val = (r[i] || '').toString().toLowerCase()
              map[type][sheet] = val === 'yes' || val === 'y' || val === 'true'
            }
          })
          setPermissions(map)
          console.log('Permissions loaded:', map)
        } else {
          // If no valid permissions data, set to null to show all menus
          console.log('No valid permissions data, showing all menus')
          setPermissions(null)
        }
      })
      .catch((err) => {
        // On error, set to null to show all menus
        console.log('Error loading permissions, showing all menus:', err)
        setPermissions(null)
      })
      .finally(() => {
        setLoading(false)
        console.log('Loading complete')
      })
  }, [])

  return (
    <>
      {/* Mobile overlay */}
      <div className={`md:hidden fixed inset-0 z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
        <aside className={`absolute left-0 top-0 bottom-0 w-80 bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
          {/* Mobile Header */}
          <div className="flex-shrink-0 p-6 border-b border-gray-200" style={{ background: 'linear-gradient(to right, #eef0ff, #f5f6ff)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(to right, #424eed, #5b67f7)' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Navigation</h2>
                  <p className="text-xs text-gray-600">Quick Access Menu</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Mobile Nav */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {/* Landing Link */}
              <li>
                <Link 
                  href="/landing" 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    router.pathname === '/landing' 
                      ? 'text-white shadow-lg' 
                      : 'hover:bg-blue-50 text-gray-700 hover:text-gray-900'
                  }`}
                  style={router.pathname === '/landing' ? { background: 'linear-gradient(to right, #424eed, #5b67f7)', boxShadow: '0 4px 6px -1px rgba(66, 78, 237, 0.3)' } : {}}
                  onClick={onClose}
                >
                  <div className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                    router.pathname === '/landing' 
                      ? 'bg-white/20' 
                      : 'bg-blue-100 group-hover:bg-blue-200'
                  }`}>
                    <svg className={`w-5 h-5 ${router.pathname === '/landing' ? 'text-white' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={router.pathname !== '/landing' ? { color: '#424eed' } : {}}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold">Home</span>
                </Link>
              </li>

              {/* Dashboard Link */}
              <li>
                <Link 
                  href="/dashboard" 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    router.pathname === '/dashboard' 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-200/50' 
                      : 'hover:bg-blue-50 text-gray-700 hover:text-gray-900'
                  }`}
                  onClick={onClose}
                >
                  <div className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                    router.pathname === '/dashboard' 
                      ? 'bg-white/20' 
                      : 'bg-blue-100 group-hover:bg-blue-200'
                  }`}>
                    <svg className={`w-5 h-5 ${router.pathname === '/dashboard' ? 'text-white' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold">Dashboard</span>
                </Link>
              </li>

              {/* User Management Link - Only for Admin */}
              {user?.type === 'admin' && (
                <li>
                  <Link 
                    href="/user-management" 
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      router.pathname === '/user-management' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200/50' 
                        : 'hover:bg-purple-50 text-gray-700 hover:text-gray-900'
                    }`}
                    onClick={onClose}
                  >
                    <div className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                      router.pathname === '/user-management' 
                        ? 'bg-white/20' 
                        : 'bg-purple-100 group-hover:bg-purple-200'
                    }`}>
                      <svg className={`w-5 h-5 ${router.pathname === '/user-management' ? 'text-white' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold">User Management</span>
                  </Link>
                </li>
              )}



              {items.map((it) => {
                const isActive = decodeURIComponent(activeSheet || '') === it.sheetName
                
                // Check permission based on user type and sheet name
                const userType = user?.type || ''
                let allowed = true // Default: allow if no permissions data
                
                if (permissions && userType && permissions[userType]) {
                  // If permission data exists, check specific permission
                  allowed = permissions[userType][it.sheetName] === true
                }
                
                console.log('Mobile Menu Item:', it.name, 'UserType:', userType, 'Allowed:', allowed, 'HasPermissions:', !!permissions)
                
                if (!allowed) return null
                
                return (
                  <li key={it.sheetName}>
                    <Link 
                      href={`/sheet/${encodeURIComponent(it.sheetName)}`} 
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                        isActive 
                          ? 'text-white shadow-lg' 
                          : 'hover:bg-blue-50 text-gray-700 hover:text-gray-900'
                      }`}
                      style={isActive ? { background: 'linear-gradient(to right, #424eed, #5b67f7)', boxShadow: '0 4px 6px -1px rgba(66, 78, 237, 0.3)' } : {}}
                      onClick={onClose}
                    >
                      <div className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                        isActive 
                          ? 'bg-white/20' 
                          : 'bg-gray-100 group-hover:bg-blue-100'
                      }`}>
                        <svg className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={!isActive ? { color: '#424eed' } : {}}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">{it.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Mobile Footer */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(to right, #424eed, #5b67f7)' }}>
                {(user?.name || user?.user || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user?.name || user?.user}</p>
                <p className="text-xs text-gray-500 truncate">{user?.type}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Desktop sidebar: collapsed by default, expands on hover */}
      <aside
        className="hidden md:block sidebar bg-white border-r border-gray-200 transition-all duration-300 ease-in-out hover:shadow-xl"
        onMouseEnter={() => {
          const el = document.documentElement
          el.setAttribute('data-sidebar-expanded', 'true')
        }}
        onMouseLeave={() => {
          const el = document.documentElement
          el.removeAttribute('data-sidebar-expanded')
        }}
      >
        <nav className="h-full overflow-y-auto py-4">
          <ul className="space-y-1.5 px-2">
            {/* Home / Landing link */}
            <li>
              <Link 
                href="/landing" 
                className={`flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all duration-200 group ${
                  router.pathname === '/landing' 
                    ? 'text-white shadow-lg' 
                    : 'hover:bg-blue-50 text-gray-700'
                }`}
                style={router.pathname === '/landing' ? { 
                  background: 'linear-gradient(to right, #424eed, #5b67f7)', 
                  boxShadow: '0 4px 6px -1px rgba(66, 78, 237, 0.3)' 
                } : {}}
              >
                <div className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 flex-shrink-0 ${
                  router.pathname === '/landing' 
                    ? 'bg-white/20' 
                    : 'bg-blue-100 group-hover:bg-blue-200 group-hover:scale-105'
                }`}>
                  <svg className={`w-5 h-5 transition-colors ${
                    router.pathname === '/landing' 
                      ? 'text-white' 
                      : ''
                  }`} style={router.pathname !== '/landing' ? { color: '#424eed' } : {}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <span className="sidebar-label text-sm font-semibold whitespace-nowrap">Home</span>
              </Link>
            </li>

            {/* Dashboard link */}
            <li>
              <Link 
                href="/dashboard" 
                className={`flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all duration-200 group ${
                  router.pathname === '/dashboard' 
                    ? 'text-white shadow-lg' 
                    : 'hover:bg-blue-50 text-gray-700'
                }`}
                style={router.pathname === '/dashboard' ? { 
                  background: 'linear-gradient(to right, #424eed, #5b67f7)', 
                  boxShadow: '0 4px 6px -1px rgba(66, 78, 237, 0.3)' 
                } : {}}
              >
                <div className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 flex-shrink-0 ${
                  router.pathname === '/dashboard' 
                    ? 'bg-white/20' 
                    : 'bg-blue-100 group-hover:bg-blue-200 group-hover:scale-105'
                }`}>
                  <svg className={`w-5 h-5 transition-colors ${
                    router.pathname === '/dashboard' 
                      ? 'text-white' 
                      : ''
                  }`} style={router.pathname !== '/dashboard' ? { color: '#424eed' } : {}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="sidebar-label text-sm font-semibold whitespace-nowrap">Dashboard</span>
              </Link>
            </li>

            {/* User Management link - Only for Admin */}
            {user?.type === 'admin' && (
              <li>
                <Link 
                  href="/user-management" 
                  className={`flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all duration-200 group ${
                    router.pathname === '/user-management' 
                      ? 'text-white shadow-lg' 
                      : 'hover:bg-blue-50 text-gray-700'
                  }`}
                  style={router.pathname === '/user-management' ? { 
                    background: 'linear-gradient(to right, #424eed, #5b67f7)', 
                    boxShadow: '0 4px 6px -1px rgba(66, 78, 237, 0.3)' 
                  } : {}}
                >
                  <div className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 flex-shrink-0 ${
                    router.pathname === '/user-management' 
                      ? 'bg-white/20' 
                      : 'bg-blue-100 group-hover:bg-blue-200 group-hover:scale-105'
                  }`}>
                    <svg className={`w-5 h-5 transition-colors ${
                      router.pathname === '/user-management' 
                        ? 'text-white' 
                        : ''
                    }`} style={router.pathname !== '/user-management' ? { color: '#424eed' } : {}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <span className="sidebar-label text-sm font-semibold whitespace-nowrap">User Management</span>
                </Link>
              </li>
            )}



            {items.map((it) => {
              const isActive = decodeURIComponent(activeSheet || '') === it.sheetName
              
              // Check permission based on user type and sheet name
              const userType = user?.type || ''
              let allowed = true // Default: allow if no permissions data
              
              if (permissions && userType && permissions[userType]) {
                // If permission data exists, check specific permission
                allowed = permissions[userType][it.sheetName] === true
              }
              
              if (!allowed) return null
              
              return (
                <li key={it.sheetName}>
                  <Link 
                    href={`/sheet/${encodeURIComponent(it.sheetName)}`} 
                    className={`flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all duration-200 group ${
                      isActive 
                        ? 'text-white shadow-lg' 
                        : 'hover:bg-blue-50 text-gray-700'
                    }`}
                    style={isActive ? { 
                      background: 'linear-gradient(to right, #424eed, #5b67f7)', 
                      boxShadow: '0 4px 6px -1px rgba(66, 78, 237, 0.3)' 
                    } : {}}
                  >
                    <div className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 flex-shrink-0 ${
                      isActive 
                        ? 'bg-white/20' 
                        : 'bg-gray-100 group-hover:bg-blue-100 group-hover:scale-105'
                    }`}>
                      <svg className={`w-4 h-4 transition-colors ${
                        isActive 
                          ? 'text-white' 
                          : 'text-gray-500'
                      }`} style={!isActive ? { color: '#424eed' } : {}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="sidebar-label text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">{it.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}
