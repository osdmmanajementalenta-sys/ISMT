import React, { ReactNode, useEffect, useState } from 'react'
import TopBar from './TopBar'
import SideBar from './SideBar'
import { getStoredUser, AppUser } from '../lib/auth'

type Props = {
  children: ReactNode
}

const NAV_ITEMS = [
  { name: 'Usul Administrator dan Pengawas', sheetName: 'Usul Administrator dan Pengawas' },
  { name: 'Usul Plt dan Plh', sheetName: 'Usul Plt dan Plh' },
  { name: 'Pelantikan', sheetName: 'Pelantikan' },
  { name: 'Penugasan Luar Instansi', sheetName: 'Penugasan Luar Instansi' },
  { name: 'Usul JPT', sheetName: 'Usul JPT' },
  { name: 'Data Rektor', sheetName: 'Data Rektor' },
]

export default function Layout({ children }: Props) {
  // avoid reading localStorage during server render to prevent hydration mismatch
  const [user, setUser] = useState<AppUser | null>(null)

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Debug: log NAV_ITEMS
  console.log('Layout NAV_ITEMS:', NAV_ITEMS, 'length:', NAV_ITEMS.length)

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <TopBar title="Biro Organisasi dan Sumber Daya Manusia" profileName={user?.name || user?.user} onToggle={() => setSidebarOpen((s) => !s)} />
      <SideBar items={NAV_ITEMS} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-6 overflow-hidden mt-topbar md:ml-sidebar">{children}</main>
    </div>
  )
}
