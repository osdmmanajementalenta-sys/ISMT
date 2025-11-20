import React, { ReactNode, useEffect, useState } from 'react'
import TopBar from './TopBar'
import { getStoredUser, AppUser } from '../lib/auth'

type Props = {
  children: ReactNode
}

export default function Layout({ children }: Props) {
  // avoid reading localStorage during server render to prevent hydration mismatch
  const [user, setUser] = useState<AppUser | null>(null)
  const [navItems, setNavItems] = useState<{ name: string; sheetName: string }[]>([])

  useEffect(() => {
    setUser(getStoredUser())
    
    // Load navigation items from Google Spreadsheet
    const loadNavItems = async () => {
      try {
        console.log('Fetching menu from /api/sheet?sheet=menu')
        const response = await fetch('/api/sheet?sheet=menu')
        console.log('Response status:', response.status, response.statusText)
        
        if (response.ok) {
          const data = await response.json()
          console.log('Menu data received:', data)
          
          if (data.rows && data.rows.length > 0) {
            // Skip header row if exists
            const dataRows = data.rows[0]?.[0] === 'Sheet Name' ? data.rows.slice(1) : data.rows
            
            // Convert rows to nav items format
            const items = dataRows
              .map((row: string[]) => ({
                name: row[0] || '',
                sheetName: row[0] || ''
              }))
              .filter((item: { name: string }) => item.name.trim() !== '')
            
            console.log('Navigation items loaded:', items)
            setNavItems(items)
          } else {
            console.warn('Menu sheet is empty or has no data')
            setNavItems([])
          }
        } else {
          const errorText = await response.text()
          console.error('Failed to load menu:', response.status, errorText)
          setNavItems([])
        }
      } catch (error) {
        console.error('Error loading navigation items:', error)
        setNavItems([])
      }
    }
    
    loadNavItems()
  }, [])

  // Debug: log NAV_ITEMS
  console.log('Layout NAV_ITEMS:', navItems, 'length:', navItems.length)

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <TopBar 
        title="Biro Organisasi dan Sumber Daya Manusia" 
        profileName={user?.name || user?.user} 
        menuItems={navItems}
      />
      <main className="flex-1 p-6 overflow-auto mt-topbar">{children}</main>
    </div>
  )
}
