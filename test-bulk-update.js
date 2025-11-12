// Test script untuk sheetBulkUpdate API
// Run: node test-bulk-update.js

const data = {
  sheet: 'users',
  headers: ['username', 'password', 'name', 'type'],
  rows: [
    ['admin', 'admin123', 'Administrator', 'admin'],
    ['user1', 'pass123', 'John Doe', 'user'],
    ['viewer1', 'view123', 'Jane Smith', 'viewer']
  ]
}

fetch('http://localhost:3000/api/sheetBulkUpdate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data)
})
  .then(res => res.json())
  .then(json => {
    console.log('Response:', json)
    if (json.ok) {
      console.log('✅ Users sheet created successfully!')
      console.log('You can now:')
      console.log('1. Login as admin / admin123')
      console.log('2. Go to http://localhost:3000/user-management')
      console.log('3. Add, edit, or delete users')
    } else {
      console.error('❌ Failed:', json.error)
    }
  })
  .catch(err => {
    console.error('❌ Error:', err.message)
  })
