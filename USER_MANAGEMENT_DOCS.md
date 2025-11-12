# User Management Setup Guide

## Google Sheets Setup

### 1. Create "users" Sheet

Buat sheet baru di Google Spreadsheet Anda dengan nama `users` dan struktur berikut:

| username | password | name | type |
|----------|----------|------|------|
| admin | admin123 | Administrator | admin |

**Penjelasan Kolom:**
- **username**: Username untuk login (unik)
- **password**: Password (saat ini plain text, nanti bisa ditambahkan hashing)
- **name**: Nama lengkap user
- **type**: Tipe user (admin, user, viewer, dll)

### 2. Verify "page_setting" Sheet

Pastikan sheet `page_setting` sudah ada dengan struktur:

| User Type | Usul Administrator dan Pengawas | Usul Plt dan Plh | Pelantikan | Penugasan Luar Instansi | Usul JPT | Data Rektor |
|-----------|--------------------------------|------------------|------------|-------------------------|----------|-------------|
| admin     | yes                            | yes              | yes        | yes                     | yes      | yes         |
| user      | yes                            | yes              | no         | no                      | no       | no          |

## Features

### Users Tab

**Add User:**
1. Klik tombol "Add User"
2. Isi form:
   - Username (tidak bisa diubah setelah dibuat)
   - Password
   - Name (nama lengkap)
   - Type (pilih: admin, user, viewer)
3. Klik "Add User"

**Edit User:**
1. Klik tombol "Edit" pada row user yang ingin diubah
2. Ubah password, name, atau type
3. Klik "Update User"

**Delete User:**
1. Klik tombol "Delete" pada row user
2. Konfirmasi penghapusan
3. **Note:** User "admin" tidak dapat dihapus (protected)

### Permissions Tab

**Edit Permissions:**
1. Klik tombol "Yes" atau "No" untuk toggle akses
2. Hijau = Yes (ada akses), Merah = No (tidak ada akses)
3. Klik "Save Permissions" untuk menyimpan ke Google Sheets

## Access Control

- **Halaman User Management:** Hanya bisa diakses oleh user dengan type "admin"
- **Sidebar Link:** "User Management" hanya muncul untuk admin
- **Landing Page:** Card yang ditampilkan sesuai permission di page_setting sheet

## API Endpoints

### `/api/sheetBulkUpdate` (POST)
Replace seluruh isi sheet dengan data baru.

**Request Body:**
```json
{
  "sheet": "users",
  "headers": ["username", "password", "name", "type"],
  "rows": [
    ["admin", "admin123", "Administrator", "admin"],
    ["user1", "pass123", "John Doe", "user"]
  ]
}
```

**Response:**
```json
{
  "ok": true
}
```

## Security Notes

⚠️ **IMPORTANT:** Password saat ini disimpan sebagai plain text di Google Sheets. Untuk production:

1. Implement password hashing (bcrypt)
2. Add password strength validation
3. Add session expiry
4. Add HTTPS only cookies
5. Add rate limiting untuk login

## Testing

1. Login sebagai admin
2. Buka http://localhost:3000/user-management
3. Test add, edit, delete user
4. Test permission toggle
5. Logout dan login sebagai user baru untuk verify permissions

## Troubleshooting

**"Gagal memuat data":**
- Check apakah sheet "users" sudah dibuat di Google Sheets
- Verify service account memiliki akses ke spreadsheet

**"Access denied":**
- Pastikan user yang login adalah admin
- Check localStorage untuk user type

**"Username sudah digunakan":**
- Username harus unik
- Gunakan username yang berbeda

**"Tidak dapat menghapus user admin":**
- User "admin" protected, tidak bisa dihapus
- Ini security feature untuk mencegah lockout
