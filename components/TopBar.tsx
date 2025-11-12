import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import { clearStoredUser } from '../lib/auth'

type Props = {
  title?: string
  profileName?: string
  onToggle?: () => void
}

export default function TopBar({ title = 'OSDM App', profileName, onToggle }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false)
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
        {/* hamburger on small screens */}
        <button 
          onClick={onToggle} 
          aria-label="Toggle menu" 
          className="md:hidden p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg/120px-Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg.png" 
              alt="Tut Wuri Handayani"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                // Fallback ke icon default jika gambar tidak bisa dimuat
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

      <div className="relative" ref={ref}>
        <button 
          onClick={() => setOpen((s) => !s)} 
          className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-blue-50 transition-all duration-200 group"
        >
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-700">{profileName || 'Guest'}</span>
            <span className="text-xs text-gray-500">View Profile</span>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-blue-100 group-hover:scale-105 group-hover:shadow-md transition-all duration-200" style={{ background: 'linear-gradient(to bottom right, #424eed, #5b67f7)' }}>
            {(profileName || 'G').charAt(0).toUpperCase()}
          </div>
          <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
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
                onClick={() => { setOpen(false); router.push('/profile') }} 
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
    </header>
  )
}
