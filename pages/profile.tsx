import React, { useEffect, useState } from 'react'
import { requireAuth, getStoredUser, clearStoredUser, AppUser } from '../lib/auth'
import { useRouter } from 'next/router'

function ProfilePage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const router = useRouter()

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  function logout() {
    clearStoredUser()
    router.push('/login')
  }

  if (!user) return <div className="p-6">Loading profile...</div>

  return (
    <div className="p-6 bg-white rounded shadow max-w-lg">
      <h1 className="text-xl font-semibold mb-4">Profile</h1>
      <div className="mb-2"><strong>Username: </strong>{user.user}</div>
      <div className="mb-2"><strong>Name: </strong>{user.name}</div>
      <div className="mb-4"><strong>Type: </strong>{user.type}</div>

      <div className="flex gap-2">
        <button onClick={logout} className="px-4 py-2 bg-red-600 text-white rounded">Logout</button>
      </div>
    </div>
  )
}

export default requireAuth(ProfilePage)
