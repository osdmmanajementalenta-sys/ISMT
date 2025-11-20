import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import { clearStoredUser } from '../lib/auth'

type Props = {
  title?: string
  profileName?: string
  onToggle?: () => void
  menuItems?: { name: string; sheetName: string }[]
}

export default function TopBar({ title = 'OSDM App', profileName, onToggle, menuItems = [] }: Props) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const profileRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (profileRef.current && e.target instanceof Node && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
      if (menuRef.current && e.target instanceof Node && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  function logout() {
    clearStoredUser()
    router.push('/login')
  }

  return (
    <header className="topbar h-topbar flex items-center justify-between px-4 md:px-6 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg/120px-Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg.png" 
              alt="Tut Wuri Handayani"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<svg class="w-6 h-6" style="color: #424eed" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>';
                }
              }}
            />
          </div>
          <div>
            <div className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">{title}</div>
            <div className="text-xs text-gray-500 font-medium">Bagian Manajemen Talenta</div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-2">
        {/* Home Button */}
        <button 
          onClick={() => router.push('/landing')} 
          className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-blue-50 transition-all duration-200 group"
          title="Home"
        >
          <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="hidden md:inline text-sm font-medium text-gray-700 group-hover:text-blue-600">Home</span>
        </button>

        {/* Dashboard Button */}
        <button 
          onClick={() => router.push('/dashboard')} 
          className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-blue-50 transition-all duration-200 group"
          title="Dashboard"
        >
          <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="hidden md:inline text-sm font-medium text-gray-700 group-hover:text-blue-600">Dashboard</span>
        </button>

        {/* Menu Dropdown */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setMenuOpen((s) => !s)} 
            className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-blue-50 transition-all duration-200 group"
            title="Menu"
          >
            <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="hidden md:inline text-sm font-medium text-gray-700 group-hover:text-blue-600">Menu</span>
            <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-96 overflow-y-auto">
              <div className="p-2">
                {menuItems.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    No menu items available
                  </div>
                ) : (
                  menuItems.map((item) => (
                    <button
                      key={item.sheetName}
                      onClick={() => {
                        setMenuOpen(false)
                        router.push(`/sheet/${encodeURIComponent(item.sheetName)}`)
                      }}
                      className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 transition-colors duration-200 group"
                    >
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{item.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Management Button */}
        <button 
          onClick={() => router.push('/user-management')} 
          className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-blue-50 transition-all duration-200 group"
          title="User Management"
        >
          <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setProfileOpen((s) => !s)} 
            className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-blue-50 transition-all duration-200 group"
          >
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-700">{profileName || 'Guest'}</span>
              <span className="text-xs text-gray-500">View Profile</span>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-blue-100 group-hover:scale-105 group-hover:shadow-md transition-all duration-200" style={{ background: 'linear-gradient(to bottom right, #424eed, #5b67f7)' }}>
              {(profileName || 'G').charAt(0).toUpperCase()}
            </div>
            <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

        {profileOpen && (
          <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-blue-100" style={{ background: 'linear-gradient(to bottom right, #eef0ff, #f5f6ff)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm" style={{ background: 'linear-gradient(to bottom right, #424eed, #5b67f7)' }}>
                  {(profileName || 'G').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{profileName || 'Guest'}</div>
                  <div className="text-xs text-gray-600">Manajemen Talenta</div>
                </div>
              </div>
            </div>
            
            <div className="p-2">
              <button 
                onClick={() => { setProfileOpen(false); router.push('/profile') }} 
                className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl hover:bg-blue-50 transition-colors duration-200 group"
              >
                <svg className="w-5 h-5 text-gray-400 transition-colors" style={{ color: 'currentColor' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Profile Settings</span>
              </button>
              
              <div className="my-2 border-t border-gray-100" />
              
              <button 
                onClick={logout} 
                className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 transition-colors duration-200 group"
              >
                <svg className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm font-medium text-gray-700 group-hover:text-red-600">Logout</span>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </header>
  )
}
