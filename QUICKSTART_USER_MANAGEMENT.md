# Quick Setup Guide - User Management

## ⚡ Quick Start (Manual Setup)

Karena server sudah berjalan di http://localhost:3000, setup manual paling cepat:

### 1. Buka Google Sheets

Buka Google Spreadsheet Anda di browser:
- SPREADSHEET_ID ada di file `.env.local`
- URL: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`

### 2. Create "users" Sheet

1. Klik tombol **"+"** di bagian bawah (tab sheet)
2. Rename sheet baru menjadi **`users`**
3. Isi data berikut:

**Cell A1-D1 (Headers):**
```
username    password    name              type
```

**Cell A2-D2 (Admin User):**
```
admin       admin123    Administrator     admin
```

**Cell A3-D3 (Example User - Optional):**
```
user1       pass123     John Doe          user
```

### 3. Test User Management

1. ✅ Server sudah running di http://localhost:3000
2. Buka browser: http://localhost:3000/login
3. Login dengan:
   - Username: `admin`
   - Password: `admin123`
4. Setelah login, buka: http://localhost:3000/user-management
5. Klik tab **"Users"** - Anda akan melihat:
   - admin (Administrator)
   - user1 (John Doe) - jika Anda tambahkan

### 4. Test Add User

1. Klik tombol **"Add User"**
2. Isi form:
   - Username: `testuser`
   - Password: `test123`
   - Name: `Test User`
   - Type: `user`
3. Klik **"Add User"**
4. User baru akan muncul di table dan tersimpan di Google Sheets!

### 5. Test Edit User

1. Klik tombol **"Edit"** pada user `testuser`
2. Ubah password menjadi: `newpass123`
3. Klik **"Update User"**
4. Password berhasil diupdate!

### 6. Test Delete User

1. Klik tombol **"Delete"** pada user `testuser`
2. Konfirmasi penghapusan
3. User akan dihapus dari table dan Google Sheets!
4. **Note:** Tidak bisa delete user `admin` (protected)

### 7. Test Permissions

1. Klik tab **"Permissions"**
2. Klik tombol **"Yes"/"No"** untuk toggle akses
3. Klik **"Save Permissions"**
4. Logout dan login sebagai user type berbeda untuk test

## 🎯 Current Status

✅ **Server Running:** http://localhost:3000  
✅ **User Management Page:** `/user-management`  
✅ **API Ready:** `/api/sheetBulkUpdate`  
⚠️ **Need:** Create "users" sheet manually (5 minutes)

## 📸 Expected Result

After setup, Anda akan lihat:

**Users Tab:**
```
╔═══════════╤══════════════════╤═══════════╤═══════╤═════════╗
║ Username  │ Name             │ Password  │ Type  │ Actions ║
╠═══════════╪══════════════════╪═══════════╪═══════╪═════════╣
║ admin     │ Administrator    │ ••••••••  │ admin │ Edit Delete ║
║ user1     │ John Doe         │ •••••••   │ user  │ Edit Delete ║
╚═══════════╧══════════════════╧═══════════╧═══════╧═════════╝
```

**Permissions Tab:**
```
╔═══════════╤═══════════════════════════╤══════╗
║ User Type │ Usul Administrator dan... │ ...  ║
╠═══════════╪═══════════════════════════╪══════╣
║ admin     │ [Yes]                     │ ...  ║
║ user      │ [No]                      │ ...  ║
╚═══════════╧═══════════════════════════╧══════╝
```

## 🔧 Troubleshooting

**Problem: "Gagal memuat data"**
- ✅ Fix: Pastikan sheet "users" sudah dibuat di Google Sheets dengan header yang benar

**Problem: Can't access /user-management**
- ✅ Fix: Login sebagai user dengan type "admin"

**Problem: Changes not saving**
- ✅ Fix: Check browser console (F12) untuk error messages
- ✅ Fix: Verify service account memiliki write access ke spreadsheet

## 🚀 Ready to Use!

Sekarang Anda bisa:
- ✅ Add/Edit/Delete users via UI
- ✅ Set permissions per user type
- ✅ Test dengan different user accounts
- ✅ Manage access control untuk semua halaman

Enjoy! 🎉
