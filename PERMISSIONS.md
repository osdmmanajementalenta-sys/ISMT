# File Upload/Delete Permissions

## Overview
Sistem sekarang mendukung kontrol akses untuk operasi upload dan delete file berdasarkan pengaturan di sheet `user`.

## User Sheet Structure
Sheet `user` harus memiliki kolom berikut (urutan penting):

| Column | Description | Example Values |
|--------|-------------|----------------|
| user | Username untuk login | admin, user1 |
| pass | Password | admin321, user123 |
| name | Nama lengkap user | Admin, User |
| type | Tipe user | admin, guest |
| allowUploadFiles | Permission untuk upload file | yes, no, y, n |
| allowDeleteFiles | Permission untuk delete file | yes, no, y, n |

## Example Data
```
user    pass        name    type    allowUploadFiles    allowDeleteFiles
admin   admin321    admin   admin   yes                 yes
user1   user123     user    guest   yes                 no
user2   user456     user    guest   no                  no
```

## Permission Behavior

### Upload Files Permission (allowUploadFiles)
Jika `allowUploadFiles = yes` atau `y`:
- ✅ Tab "Upload" muncul di File Manager modal
- ✅ User dapat memilih dan upload file
- ✅ Tombol "Upload File" muncul di empty state

Jika `allowUploadFiles = no` atau selain `yes`/`y`:
- ❌ Tab "Upload" tidak muncul di modal
- ❌ User tidak dapat upload file
- ❌ Toast error muncul jika mencoba upload via API

### Delete Files Permission (allowDeleteFiles)
Jika `allowDeleteFiles = yes` atau `y`:
- ✅ Tombol delete (🗑️) muncul di setiap file
- ✅ User dapat menghapus file

Jika `allowDeleteFiles = no` atau selain `yes`/`y`:
- ❌ Tombol delete tidak muncul
- ❌ Toast error muncul jika mencoba delete via API

### Access File Manager
Tombol folder di cell hanya muncul jika user memiliki setidaknya salah satu permission:
- `allowUploadFiles = yes` ATAU `allowDeleteFiles = yes`

Jika kedua permission `no`, tombol folder tidak akan muncul di cell.

## Technical Implementation

### 1. Login API (`/api/login`)
- Membaca kolom `allowUploadFiles` (index 4) dan `allowDeleteFiles` (index 5)
- Menyimpan permission ke session token dan localStorage

### 2. Auth Library (`lib/auth.tsx`)
- `AppUser` type sekarang termasuk `allowUploadFiles` dan `allowDeleteFiles`
- `getStoredUser()` mengembalikan data user lengkap dengan permissions

### 3. DataTable Component
- Membaca permission dari `getStoredUser()`
- Conditional rendering untuk:
  * Tombol folder di cell
  * Tab Upload di modal
  * Tombol Delete di file list
  * Tombol "Upload File" di empty state
- Validasi permission sebelum operasi upload/delete
- Toast notification untuk permission error

## Security Notes

1. **Client-side Check**: Permission check di frontend mencegah user melihat UI yang tidak boleh diakses
2. **Server-side Validation**: Pastikan juga validasi di backend jika diperlukan
3. **Session Token**: Permission tersimpan di session token (HttpOnly cookie)
4. **LocalStorage**: Permission juga tersimpan di localStorage untuk akses cepat

## Testing

### Test Admin User (Full Access)
```
Username: admin
Password: admin321
Expected: Can upload AND delete files
```

### Test Guest User (Upload Only)
```
Username: user1
Password: user123
Expected: Can upload but CANNOT delete files
```

### Test Restricted User (No Access)
```
Username: user2
Password: user456
Expected: CANNOT upload or delete files
```

## Troubleshooting

### Tombol folder tidak muncul
- Periksa sheet `user`, pastikan minimal salah satu permission = "yes"
- Clear localStorage dan login ulang

### Tab Upload tidak muncul
- Periksa `allowUploadFiles` di sheet `user`
- Pastikan nilai = "yes" atau "y" (case insensitive)

### Tombol Delete tidak muncul
- Periksa `allowDeleteFiles` di sheet `user`
- Pastikan nilai = "yes" atau "y" (case insensitive)

### Permission tidak update setelah ubah sheet
- User harus logout dan login kembali
- Permission dibaca saat login, tidak auto-update

## Future Enhancements

Potential improvements:
- [ ] Role-based permissions (admin, editor, viewer)
- [ ] Permission per sheet/folder
- [ ] File size limit per user
- [ ] Upload quota per user
- [ ] Audit log untuk upload/delete operations
- [ ] Admin panel untuk manage user permissions
