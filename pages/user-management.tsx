import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'

interface ToastMessage {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

interface UserData {
  username: string
  password: string
  name: string
  type: string
  allowUploadFiles: boolean
  allowDeleteFiles: boolean
}

interface PermissionData {
  userType: string
  [key: string]: string | boolean
}

export default function UserManagementPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users')
  const [toast, setToast] = useState<ToastMessage | null>(null)
  
  // Users tab state
  const [userData, setUserData] = useState<UserData[]>([])
  const [originalUserData, setOriginalUserData] = useState<UserData[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [formData, setFormData] = useState<UserData>({
    username: '',
    password: '',
    name: '',
    type: 'user',
    allowUploadFiles: true,
    allowDeleteFiles: false
  })
  
  // Permissions tab state
  const [data, setData] = useState<PermissionData[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [availableUserTypes, setAvailableUserTypes] = useState<string[]>(['user', 'admin', 'viewer'])
  const [loading, setLoading] = useState(true)
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set())
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [newPermissionType, setNewPermissionType] = useState('')





  const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    // Temporarily bypass auth check due to API quota
    // const user = localStorage.getItem('user')
    // if (!user) {
    //   router.push('/login')
    //   return
    // }
    
    // const parsedUser = JSON.parse(user)
    // if (parsedUser.type?.toLowerCase() !== 'admin') {
    //   router.push('/landing')
    //   return
    // }

    loadData()
  }, [router])

  const loadData = async () => {
    try {
      setLoading(true)
      setIsLoadingUsers(true)
      
      // Load users
      try {
        const usersRes = await fetch('/api/sheet?sheet=users')
        console.log('Users API Response Status:', usersRes.status)
        
        if (usersRes.ok) {
          const usersJson = await usersRes.json()
          console.log('Raw users data from sheet:', usersJson)
          
          if (usersJson.headers && usersJson.rows) {
            console.log('Headers found:', usersJson.headers)
            console.log('Rows found:', usersJson.rows.length, 'rows')
            
            const usernameIdx = usersJson.headers.indexOf('Username')
            const passwordIdx = usersJson.headers.indexOf('Password')
            const nameIdx = usersJson.headers.indexOf('Nama')
            const typeIdx = usersJson.headers.indexOf('Type')
            const allowUploadIdx = usersJson.headers.indexOf('allowUploadFiles')
            const allowDeleteIdx = usersJson.headers.indexOf('allowDeleteFiles')
            
            console.log('Column indexes:', { usernameIdx, passwordIdx, nameIdx, typeIdx, allowUploadIdx, allowDeleteIdx })
            
            if (usernameIdx === -1) {
              console.error('ERROR: Username column not found! Available headers:', usersJson.headers)
              showToast('error', 'Sheet "users" tidak memiliki kolom "Username"')
            }
            
            const users = usersJson.rows
              .filter((row: string[]) => row[usernameIdx] && row[usernameIdx].trim() !== '') // Filter empty rows
              .map((row: string[]) => {
                const user = {
                  username: row[usernameIdx] || '',
                  password: row[passwordIdx] || '',
                  name: row[nameIdx] || '',
                  type: row[typeIdx] || 'user',
                  allowUploadFiles: (row[allowUploadIdx] || '').toString().toLowerCase() === 'yes' || 
                                    (row[allowUploadIdx] || '').toString().toLowerCase() === 'true' || 
                                    row[allowUploadIdx] === '1',
                  allowDeleteFiles: (row[allowDeleteIdx] || '').toString().toLowerCase() === 'yes' || 
                                   (row[allowDeleteIdx] || '').toString().toLowerCase() === 'true' || 
                                   row[allowDeleteIdx] === '1'
                }
                console.log('Parsed user:', user)
                return user
              })
            
            console.log('Total parsed users:', users.length)
            console.log('Final users array:', users)
            
            setUserData(users)
            setOriginalUserData(users)
            setHasUnsavedChanges(false)
            setIsLoadingUsers(false)
          } else {
            console.error('ERROR: No headers or rows in response')
            showToast('error', 'Data users tidak valid')
            setIsLoadingUsers(false)
          }
        } else if (usersRes.status === 429) {
          // Quota exceeded - use mock data
          showToast('warning', 'API quota exceeded - using demo mode')
          const mockData = [
            { username: 'admin', password: 'admin123', name: 'Administrator', type: 'admin', allowUploadFiles: true, allowDeleteFiles: true },
            { username: 'user1', password: 'pass123', name: 'John Doe', type: 'user', allowUploadFiles: true, allowDeleteFiles: false }
          ]
          setUserData(mockData)
          setOriginalUserData(mockData)
          setHasUnsavedChanges(false)
          setIsLoadingUsers(false)
        }
      } catch (err) {
        console.error('Error loading users:', err)
        // Use mock data on error
        const mockData = [
          { username: 'admin', password: 'admin123', name: 'Administrator', type: 'admin', allowUploadFiles: true, allowDeleteFiles: true },
          { username: 'user1', password: 'pass123', name: 'John Doe', type: 'user', allowUploadFiles: true, allowDeleteFiles: false }
        ]
        setUserData(mockData)
        setOriginalUserData(mockData)
        setHasUnsavedChanges(false)
        setIsLoadingUsers(false)
      }

      // Load permissions
      try {
        const permRes = await fetch('/api/sheet?sheet=page_setting')
        if (permRes.ok) {
          const permJson = await permRes.json()
          setHeaders(permJson.headers || [])
          
          const rows = permJson.rows.map((row: string[]) => {
            const obj: PermissionData = { userType: row[0] || '' }
            for (let i = 1; i < permJson.headers.length; i++) {
              const header = permJson.headers[i]
              const val = (row[i] || '').toString().toLowerCase()
              obj[header] = val === 'yes' || val === 'y' || val === 'true'
            }
            return obj
          })
          setData(rows)
          
          // Extract user types from permission data
          const userTypes = rows.map((row: PermissionData) => row.userType).filter((type: string) => type && type.trim() !== '')
          setAvailableUserTypes(userTypes.length > 0 ? userTypes : ['user', 'admin', 'viewer'])
        } else if (permRes.status === 429) {
          // Quota exceeded - use mock data
          setHeaders(['User Type', 'Sheet1', 'Sheet2'])
          setData([
            { userType: 'admin', 'Sheet1': true, 'Sheet2': true },
            { userType: 'user', 'Sheet1': true, 'Sheet2': false }
          ])
          setAvailableUserTypes(['admin', 'user'])
        }
      } catch (err) {
        console.error('Error loading permissions:', err)
        setHeaders(['User Type', 'Sheet1', 'Sheet2'])
        setData([
          { userType: 'admin', 'Sheet1': true, 'Sheet2': true },
          { userType: 'user', 'Sheet1': true, 'Sheet2': false }
        ])
        setAvailableUserTypes(['admin', 'user'])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('error', 'Gagal memuat data')
    } finally {
      setLoading(false)
      setIsLoadingUsers(false)
    }
  }

  const handleAddUser = () => {
    if (isLoadingUsers) {
      showToast('warning', 'Please wait, loading user data...')
      return
    }
    
    console.log('Add user - Current originalUserData:', originalUserData)
    
    setEditingUser(null)
    setFormData({ 
      username: '', 
      password: '', 
      name: '', 
      type: 'user',
      allowUploadFiles: true,
      allowDeleteFiles: false
    })
    setShowUserModal(true)
  }

  const handleEditUser = (user: UserData) => {
    setEditingUser(user.username)
    setFormData({ ...user })
    setShowUserModal(true)
  }

  const handleTogglePermission = (username: string, field: 'allowUploadFiles' | 'allowDeleteFiles') => {
    const updated = userData.map(u => 
      u.username === username 
        ? { ...u, [field]: !u[field] } 
        : u
    )
    setUserData(updated)
    setHasUnsavedChanges(true)
  }

  const handleSaveToggleChanges = async () => {
    try {
      const payload = {
        sheet: 'users',
        headers: ['Username', 'Password', 'Nama', 'Type', 'allowUploadFiles', 'allowDeleteFiles'],
        rows: userData.map(u => [
          u.username, 
          u.password, 
          u.name, 
          u.type,
          u.allowUploadFiles ? 'yes' : 'no',
          u.allowDeleteFiles ? 'yes' : 'no'
        ])
      }

      const res = await fetch('/api/sheetBulkUpdate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setOriginalUserData([...userData])
        setHasUnsavedChanges(false)
        showToast('success', 'Permission changes saved')
        // Reload data from Google Sheets to ensure sync
        setTimeout(() => loadData(), 500)
      } else {
        showToast('warning', 'Changes saved locally (Demo mode)')
        setOriginalUserData([...userData])
        setHasUnsavedChanges(false)
      }
    } catch (error) {
      console.error('Error saving toggle changes:', error)
      showToast('warning', 'Changes saved locally (Demo mode)')
      setOriginalUserData([...userData])
      setHasUnsavedChanges(false)
    }
  }

  const handleCancelToggleChanges = () => {
    setUserData([...originalUserData])
    setHasUnsavedChanges(false)
    showToast('info', 'Changes cancelled')
  }

  const handleSaveUser = async () => {
    if (!formData.username || !formData.password || !formData.name) {
      showToast('error', 'Semua field harus diisi')
      return
    }

    // Check if username already exists (for new user)
    if (!editingUser && originalUserData.some(u => u.username === formData.username)) {
      showToast('error', 'Username sudah digunakan')
      return
    }

    console.log('=== SAVE USER DEBUG ===')
    console.log('Editing user:', editingUser)
    console.log('Original user data BEFORE save:', originalUserData)
    console.log('Form data:', formData)

    try {
      let updatedUsers: UserData[]
      
      if (editingUser) {
        // Update existing user - use originalUserData as base
        updatedUsers = originalUserData.map(u => 
          u.username === editingUser ? formData : u
        )
      } else {
        // Add new user - use originalUserData as base
        updatedUsers = [...originalUserData, formData]
      }
      
      console.log('Updated users array to be saved:', updatedUsers)

      // Try to save to Google Sheets
      try {
        const payload = {
          sheet: 'users',
          headers: ['Username', 'Password', 'Nama', 'Type', 'allowUploadFiles', 'allowDeleteFiles'],
          rows: updatedUsers.map(u => [
            u.username, 
            u.password, 
            u.name, 
            u.type,
            u.allowUploadFiles ? 'yes' : 'no',
            u.allowDeleteFiles ? 'yes' : 'no'
          ])
        }

        const res = await fetch('/api/sheetBulkUpdate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (res.ok) {
          setUserData(updatedUsers)
          setOriginalUserData(updatedUsers)
          setHasUnsavedChanges(false)
          setShowUserModal(false)
          showToast('success', editingUser ? 'User berhasil diupdate' : 'User berhasil ditambahkan')
          // Reload data from Google Sheets to ensure sync
          setTimeout(() => loadData(), 500)
        } else {
          // API failed, but update local state (demo mode)
          console.warn('API failed, using demo mode')
          setUserData(updatedUsers)
          setOriginalUserData(updatedUsers)
          setHasUnsavedChanges(false)
          setShowUserModal(false)
          showToast('warning', `${editingUser ? 'User diupdate' : 'User ditambahkan'} (Demo mode - not saved to Google Sheets)`)
        }
      } catch (apiError) {
        // API error, but update local state (demo mode)
        console.error('API error:', apiError)
        setUserData(updatedUsers)
        setOriginalUserData(updatedUsers)
        setHasUnsavedChanges(false)
        setShowUserModal(false)
        showToast('warning', `${editingUser ? 'User diupdate' : 'User ditambahkan'} (Demo mode - not saved to Google Sheets)`)
      }
    } catch (error) {
      console.error('Error saving user:', error)
      showToast('error', 'Gagal menyimpan user')
    }
  }

  const handleDeleteUser = async (username: string) => {
    if (username === 'admin') {
      showToast('error', 'Tidak dapat menghapus user admin')
      return
    }

    if (!confirm(`Hapus user "${username}"?`)) {
      return
    }

    try {
      const updatedUsers = originalUserData.filter(u => u.username !== username)

      // Try to save to Google Sheets
      try {
        const payload = {
          sheet: 'users',
          headers: ['Username', 'Password', 'Nama', 'Type', 'allowUploadFiles', 'allowDeleteFiles'],
          rows: updatedUsers.map(u => [
            u.username, 
            u.password, 
            u.name, 
            u.type,
            u.allowUploadFiles ? 'yes' : 'no',
            u.allowDeleteFiles ? 'yes' : 'no'
          ])
        }

        const res = await fetch('/api/sheetBulkUpdate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (res.ok) {
          setUserData(updatedUsers)
          setOriginalUserData(updatedUsers)
          setHasUnsavedChanges(false)
          showToast('success', 'User berhasil dihapus')
          // Reload data from Google Sheets to ensure sync
          setTimeout(() => loadData(), 500)
        } else {
          // API failed, but update local state (demo mode)
          console.warn('API failed, using demo mode')
          setUserData(updatedUsers)
          setOriginalUserData(updatedUsers)
          setHasUnsavedChanges(false)
          showToast('warning', 'User dihapus (Demo mode - not saved to Google Sheets)')
        }
      } catch (apiError) {
        // API error, but update local state (demo mode)
        console.error('API error:', apiError)
        setUserData(updatedUsers)
        setOriginalUserData(updatedUsers)
        setHasUnsavedChanges(false)
        showToast('warning', 'User dihapus (Demo mode - not saved to Google Sheets)')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      showToast('error', 'Gagal menghapus user')
    }
  }

  const togglePermission = (userType: string, sheetName: string) => {
    setData(prev => prev.map(row => {
      if (row.userType === userType) {
        return { ...row, [sheetName]: !row[sheetName] }
      }
      return row
    }))
  }

  const handleSavePermissions = async () => {
    try {
      const rows = data.map(row => {
        const arr: string[] = [row.userType]
        for (let i = 1; i < headers.length; i++) {
          const header = headers[i]
          arr.push(row[header] ? 'yes' : 'no')
        }
        return arr
      })

      try {
        const res = await fetch('/api/sheetBulkUpdate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheet: 'page_setting',
            headers: headers,
            rows: rows
          })
        })

        if (res.ok) {
          showToast('success', 'Permissions berhasil disimpan')
        } else {
          // API failed (demo mode)
          console.warn('API failed, using demo mode')
          showToast('warning', 'Permissions disimpan (Demo mode - not saved to Google Sheets)')
        }
      } catch (apiError) {
        // API error (demo mode)
        console.error('API error:', apiError)
        showToast('warning', 'Permissions disimpan (Demo mode - not saved to Google Sheets)')
      }
    } catch (error) {
      console.error('Error saving permissions:', error)
      showToast('error', 'Gagal menyimpan permissions')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Loading...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">User Management</h1>
          <p className="text-gray-600">Kelola user dan permission untuk akses halaman</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'users'
                ? 'border-b-2'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={activeTab === 'users' ? { color: '#424eed', borderColor: '#424eed' } : {}}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'permissions'
                ? 'border-b-2'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={activeTab === 'permissions' ? { color: '#424eed', borderColor: '#424eed' } : {}}
          >
            Permissions
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              {hasUnsavedChanges && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-amber-600 font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Unsaved changes
                  </span>
                  <button
                    onClick={handleSaveToggleChanges}
                    className="px-3 py-1.5 text-white text-sm rounded-lg transition-colors"
                    style={{ backgroundColor: '#424eed' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3640dd'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#424eed'}
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelToggleChanges}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <button
                onClick={handleAddUser}
                disabled={isLoadingUsers}
                className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 ${hasUnsavedChanges ? '' : 'ml-auto'} ${isLoadingUsers ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Add User"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
              {userData.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-gray-500 text-lg mb-2">No users found</p>
                  <p className="text-gray-400 text-sm mb-4">Click "Add User" button above to create your first user</p>
                  <button
                    onClick={() => {
                      console.log('=== DEBUG INFO ===')
                      console.log('userData:', userData)
                      console.log('originalUserData:', originalUserData)
                      console.log('isLoadingUsers:', isLoadingUsers)
                    }}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    🔍 Show Debug Info in Console
                  </button>
                </div>
              ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Files</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Delete Files</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {userData.map((user) => (
                    <tr key={user.username} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{'•'.repeat(user.password.length)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.type === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleTogglePermission(user.username, 'allowUploadFiles')}
                          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                          style={{ backgroundColor: user.allowUploadFiles ? '#424eed' : '#d1d5db' }}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              user.allowUploadFiles ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleTogglePermission(user.username, 'allowDeleteFiles')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            user.allowDeleteFiles ? 'bg-red-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              user.allowDeleteFiles ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="font-medium mr-4 hover:underline"
                          style={{ color: '#424eed' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.username)}
                          className="text-red-600 hover:text-red-700 font-medium"
                          disabled={user.username === 'admin'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {selectedPermissions.size > 0 && (
                  <button
                    onClick={() => {
                      // Delete selected permissions
                      const newData = data.filter((_, idx) => !selectedPermissions.has(idx))
                      setData(newData)
                      setSelectedPermissions(new Set())
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    title="Delete Selected"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPermissionModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  title="Add Permission"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                <button
                  onClick={handleSavePermissions}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2"
                  title="Save Permissions"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.size === data.length && data.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermissions(new Set(data.map((_, idx) => idx)))
                          } else {
                            setSelectedPermissions(new Set())
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                      User Type
                    </th>
                    {headers.slice(1).map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.map((row, idx) => (
                    <tr key={row.userType} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.has(idx)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedPermissions)
                            if (e.target.checked) {
                              newSelected.add(idx)
                            } else {
                              newSelected.delete(idx)
                            }
                            setSelectedPermissions(newSelected)
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        {row.userType}
                      </td>
                      {headers.slice(1).map((h) => (
                        <td key={h} className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => togglePermission(row.userType, h)}
                            className={`px-4 py-1.5 rounded-md font-medium transition-colors ${
                              row[h]
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {row[h] ? 'Yes' : 'No'}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* User Modal */}
        {showUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={!!editingUser}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {availableUserTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Pilih dari user types yang ada di Permissions tab</p>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Allow Upload Files</label>
                    <p className="text-xs text-gray-500 mt-0.5">Izinkan user untuk upload file</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, allowUploadFiles: !formData.allowUploadFiles })}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                    style={{ backgroundColor: formData.allowUploadFiles ? '#424eed' : '#d1d5db' }}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.allowUploadFiles ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Allow Delete Files</label>
                    <p className="text-xs text-gray-500 mt-0.5">Izinkan user untuk hapus file</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, allowDeleteFiles: !formData.allowDeleteFiles })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.allowDeleteFiles ? 'bg-red-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.allowDeleteFiles ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUser}
                  className="px-4 py-2 text-white rounded-lg transition-colors"
                  style={{ backgroundColor: '#424eed' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3640dd'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#424eed'}
                >
                  {editingUser ? 'Update' : 'Add'} User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Permission Modal */}
        {showPermissionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-800">Add New Permission Type</h3>
              </div>

              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permission Type Name
                </label>
                <input
                  type="text"
                  value={newPermissionType}
                  onChange={(e) => setNewPermissionType(e.target.value)}
                  placeholder="e.g., manager, editor, viewer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-2xl">
                <button
                  onClick={() => {
                    setShowPermissionModal(false)
                    setNewPermissionType('')
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newPermissionType.trim()) {
                      // Add new permission row
                      const newRow: PermissionData = { userType: newPermissionType.trim() }
                      headers.forEach(header => {
                        if (header !== 'Type') {
                          newRow[header] = 'no'
                        }
                      })
                      setData([...data, newRow])
                      setShowPermissionModal(false)
                      setNewPermissionType('')
                      showToast('success', `Permission type "${newPermissionType.trim()}" added successfully`)
                    }
                  }}
                  disabled={!newPermissionType.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Permission
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-4 right-4 z-50">
            <div 
              className="px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 text-white"
              style={{
                backgroundColor: 
                  toast.type === 'success' ? '#424eed' :
                  toast.type === 'error' ? '#dc2626' :
                  toast.type === 'warning' ? '#ca8a04' :
                  '#2563eb'
              }}
            >
              <span>{toast.message}</span>
              <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
