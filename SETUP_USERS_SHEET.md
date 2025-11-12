# Setup Script untuk Users Sheet

## Langkah Manual di Google Sheets:

1. Buka Google Spreadsheet Anda (ID dari .env.local)
2. Klik tombol "+" di bagian bawah untuk membuat sheet baru
3. Rename sheet baru menjadi `users`
4. Isi dengan data berikut:

### Row 1 (Header):
```
username | password | name | type
```

### Row 2 (Admin user):
```
admin | admin123 | Administrator | admin
```

### Row 3 (Contoh user biasa):
```
user1 | pass123 | John Doe | user
```

## Atau menggunakan API:

Jalankan command berikut di terminal PowerShell (ganti SPREADSHEET_ID):

```powershell
$body = @{
    sheet = "users"
    headers = @("username", "password", "name", "type")
    rows = @(
        @("admin", "admin123", "Administrator", "admin"),
        @("user1", "pass123", "John Doe", "user")
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/sheetBulkUpdate" -ContentType "application/json" -Body $body
```

## Verifikasi:

Setelah sheet dibuat, test dengan:
1. Login sebagai admin
2. Buka http://localhost:3000/user-management
3. Tab "Users" harus menampilkan daftar user
4. Tab "Permissions" harus menampilkan permission matrix

## Notes:

- Sheet "users" akan dibuat otomatis saat pertama kali menyimpan user dari UI
- Pastikan service account memiliki akses write ke spreadsheet
- Untuk production, gunakan password hashing!
