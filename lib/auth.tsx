import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export type AppUser = {
  user: string
  name?: string
  type?: string
  allowUploadFiles?: string
  allowDeleteFiles?: string
}

export function getStoredUser(): AppUser | null {
  if (typeof window === 'undefined') return null
  try {
    const s = localStorage.getItem('osdm_user')
    return s ? JSON.parse(s) : null
  } catch (e) {
    return null
  }
}

export function clearStoredUser() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('osdm_user')
}

// HOC that redirects to /login when no stored user
export function requireAuth<P extends Record<string, unknown>>(Component: React.ComponentType<P>) {
  return function AuthWrapper(props: P) {
    const router = useRouter()
    const [checked, setChecked] = useState(false)

    useEffect(() => {
      const u = getStoredUser()
      if (!u) {
        router.replace('/login')
      } else {
        setChecked(true)
      }
    }, [router])

    if (!checked) return <div className="p-6">Checking authentication...</div>

    return <Component {...props} />
  }
}
