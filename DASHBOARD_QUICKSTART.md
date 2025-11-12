# 🎯 Quick Start Guide - Dashboard Pencapaian

## Setup Cepat (5 Menit)

### Langkah 1: Akses Dashboard
1. Pastikan server development berjalan: `npm run dev`
2. Buka browser dan kunjungi: **http://localhost:3000/dashboard**
3. Klik menu **Dashboard** di sidebar (icon bar chart biru)

### Langkah 2: Kustomisasi dengan Data Anda

Dashboard saat ini menggunakan **dummy data** sebagai contoh. Untuk menghubungkan dengan data Google Sheets Anda yang sebenarnya:

#### Edit File: `pages/api/dashboard.ts`

Baris 43-44, ubah nama sheet:
```typescript
const SHEET_NAME_USUL = 'menu'; // ← Ganti dengan nama sheet usul Anda
const SHEET_NAME_SK = 'menu';   // ← Ganti dengan nama sheet SK Anda
```

**Contoh:**
```typescript
const SHEET_NAME_USUL = 'Data Usul Masuk';
const SHEET_NAME_SK = 'Data SK Selesai';
```

### Langkah 3: (Opsional) Filtering Berdasarkan Tanggal

Jika sheet Anda punya kolom tanggal dan ingin menampilkan data bulan berjalan:

1. Buka `pages/api/dashboard.ts`
2. Cari bagian komentar yang bertuliskan `// KUSTOMISASI: Jika Anda punya kolom tanggal`
3. Uncomment kode di bawahnya (hapus `/*` dan `*/`)
4. Ubah `row[0]` menjadi index kolom tanggal Anda (misal: `row[2]` jika tanggal di kolom C)

## Fitur Dashboard

### 📊 Metrics yang Ditampilkan

1. **Total Usul Masuk** - Total semua usul yang masuk
2. **SK Selesai** - Total SK yang sudah diterbitkan
3. **Dalam Proses** - Usul yang masih dalam proses
4. **Tingkat Pencapaian** - Persentase SK terhadap Usul

### 📈 Visualisasi

- **Progress Bar Keseluruhan** - Menampilkan pencapaian total
- **Progress Bar Bulan Ini** - Menampilkan pencapaian bulan berjalan
- **Statistik Detail** - Info tambahan seperti rata-rata waktu proses

## Troubleshooting

### ❌ Dashboard Menampilkan Data Dummy

**Penyebab:**
- Nama sheet di `pages/api/dashboard.ts` belum sesuai dengan sheet Anda
- Sheet tidak ditemukan di Google Sheets

**Solusi:**
1. Buka Google Sheets Anda
2. Catat nama exact sheet (case-sensitive)
3. Update `SHEET_NAME_USUL` dan `SHEET_NAME_SK` di `pages/api/dashboard.ts`
4. Refresh halaman dashboard

### ❌ Error 500 di Console

**Solusi:**
1. Cek `.env.local` pastikan `GOOGLE_SHEET_ID` benar
2. Pastikan service account punya akses ke spreadsheet
3. Periksa terminal/console untuk error message detail

### ✅ Data Sudah Muncul Tapi Tidak Akurat

**Solusi:**
- Untuk perhitungan yang lebih akurat, Anda bisa menambahkan logika custom di `pages/api/dashboard.ts`
- Contoh: filter berdasarkan status, tanggal, atau kategori tertentu

## Kustomisasi Lanjutan

### Mengubah Warna Tema

Edit `pages/dashboard.tsx`:
```typescript
<DashboardCard
  title="Total Usul Masuk"
  value={data.totalUsul}
  icon="📥"
  color="purple" // ← Ubah: blue, green, yellow, purple, red, indigo
/>
```

### Menambah Kartu Statistik Baru

Tambahkan di `pages/dashboard.tsx`:
```typescript
<DashboardCard
  title="Judul Metric Baru"
  value={123}
  icon="🎯"
  color="indigo"
  subtitle="Deskripsi"
  trend={{ value: 5, isPositive: true }}
/>
```

### Menghitung dari Kolom Spesifik

Contoh: Menghitung hanya usul dengan status "Approved"

Di `pages/api/dashboard.ts`:
```typescript
let approvedCount = 0;
for (let i = 1; i < usulData.length; i++) {
  const row = usulData[i];
  const status = row[3]; // Asumsi status di kolom D (index 3)
  if (status === 'Approved') {
    approvedCount++;
  }
}
```

## Struktur Sheet yang Direkomendasikan

### Sheet "Data Usul"
| Tanggal | Nomor | Nama | Status | Departemen |
|---------|-------|------|--------|------------|
| 2025-01-15 | 001 | John | Proses | IT |
| 2025-01-16 | 002 | Jane | Selesai | HR |

### Sheet "Data SK"
| Tanggal | Nomor SK | Nama | Nomor Usul |
|---------|----------|------|------------|
| 2025-01-20 | SK-001 | John | 001 |

## Tips & Best Practices

✅ **DO:**
- Gunakan nama sheet yang deskriptif
- Pastikan format tanggal konsisten
- Simpan header di baris pertama
- Backup data secara berkala

❌ **DON'T:**
- Jangan gunakan spasi atau karakter khusus berlebihan di nama sheet
- Jangan mengubah struktur sheet tanpa update kode
- Jangan hapus baris header

## Bantuan Lebih Lanjut

Untuk dokumentasi lengkap, lihat: `DASHBOARD_DOCS.md`

---

**Quick Reference:**
- Dashboard URL: http://localhost:3000/dashboard
- API Endpoint: http://localhost:3000/api/dashboard
- Config File: `pages/api/dashboard.ts`
- Main Component: `pages/dashboard.tsx`

**Last Updated:** November 12, 2025
