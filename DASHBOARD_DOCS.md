# Dashboard Pencapaian - Dokumentasi

## Overview
Dashboard profesional untuk monitoring dan menghitung pencapaian usul yang masuk dan SK yang selesai.

## Fitur Dashboard

### 1. **Kartu Statistik Utama**
- **Total Usul Masuk**: Menampilkan jumlah total usul yang telah masuk
- **SK Selesai**: Menampilkan jumlah SK yang telah diterbitkan
- **Dalam Proses**: Menampilkan usul yang sedang dalam proses
- **Tingkat Pencapaian**: Persentase rasio SK terhadap Usul

### 2. **Progress Keseluruhan**
- Visualisasi progress bar untuk pencapaian total
- Grid menampilkan total usul dan SK selesai

### 3. **Progress Bulan Ini**
- Tracking pencapaian untuk bulan berjalan
- Menampilkan usul masuk dan SK selesai bulan ini

### 4. **Statistik Detail**
- Rata-rata waktu proses
- Efisiensi penyelesaian
- Jumlah pending process

## Komponen yang Dibuat

### 1. `components/DashboardCard.tsx`
Komponen card reusable untuk menampilkan metrics dengan:
- Icon dan warna kustom
- Nilai numeric atau string
- Subtitle
- Trend indicator (opsional)

**Props:**
```typescript
interface DashboardCardProps {
  title: string;
  value: number | string;
  icon?: string;
  color?: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}
```

### 2. `components/ProgressBar.tsx`
Komponen progress bar dengan animasi smooth:
- Persentase dinamis
- Warna kustom
- Label opsional

**Props:**
```typescript
interface ProgressBarProps {
  percentage: number;
  label?: string;
  color?: string;
  showPercentage?: boolean;
}
```

### 3. `components/SimpleBarChart.tsx`
Komponen bar chart sederhana untuk visualisasi data:
- Multiple bars dengan warna berbeda
- Animasi smooth
- Responsive

**Props:**
```typescript
interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface SimpleBarChartProps {
  data: ChartData[];
  title?: string;
  height?: number;
}
```

### 4. `pages/dashboard.tsx`
Halaman dashboard utama yang mengintegrasikan semua komponen.

### 5. `pages/api/dashboard.ts`
API endpoint untuk mengambil data dari Google Sheets:
- Mengambil data dari sheets `usul_masuk` dan `sk_selesai`
- Menghitung statistik otomatis
- Filter data berdasarkan bulan berjalan

## Konfigurasi Google Sheets

### Struktur Sheet yang Dibutuhkan:

#### Sheet 1: `usul_masuk`
| Tanggal | Nomor Usul | Nama | Status | ... |
|---------|------------|------|--------|-----|
| 2025-01-15 | 001/2025 | John Doe | Proses | ... |

#### Sheet 2: `sk_selesai`
| Tanggal | Nomor SK | Nama | Nomor Usul | ... |
|---------|----------|------|------------|-----|
| 2025-01-20 | SK-001/2025 | John Doe | 001/2025 | ... |

**Catatan**: 
- Kolom pertama (index 0) harus berisi tanggal untuk filtering bulanan
- Sesuaikan nama sheet di file `pages/api/dashboard.ts` baris 43 dengan nama sheet Anda yang sebenarnya

## Cara Menggunakan

### 1. Akses Dashboard
- Buka aplikasi dan klik menu **Dashboard** di sidebar
- URL: `http://localhost:3000/dashboard`

### 2. Menyesuaikan dengan Data Anda

#### a. Update Nama Sheet
Edit file `pages/api/dashboard.ts`:
```typescript
const response = await sheets.spreadsheets.values.batchGet({
  spreadsheetId,
  ranges: ['NAMA_SHEET_USUL!A:Z', 'NAMA_SHEET_SK!A:Z'], // Ganti dengan nama sheet Anda
});
```

#### b. Update Index Kolom Tanggal
Jika kolom tanggal bukan di index 0, sesuaikan di `pages/api/dashboard.ts`:
```typescript
const dateStr = row[0]; // Ganti 0 dengan index kolom tanggal Anda
```

### 3. Refresh Data
Data akan di-refresh otomatis setiap kali halaman dashboard dibuka atau di-reload.

## Kustomisasi

### Mengubah Warna Tema
Edit file `pages/dashboard.tsx` dan ubah properti `color` pada `DashboardCard`:
```typescript
<DashboardCard
  color="blue" // Pilihan: blue, green, yellow, purple, red, indigo
  // ...
/>
```

### Menambah Kartu Statistik Baru
```typescript
<DashboardCard
  title="Nama Metric"
  value={nilaiData}
  icon="🎯"
  color="purple"
  subtitle="Deskripsi"
  trend={{ value: 5, isPositive: true }}
/>
```

### Mengubah Dummy Data
Jika API gagal, sistem akan menggunakan dummy data. Edit fallback di `pages/dashboard.tsx`:
```typescript
const dummyData: DashboardData = {
  totalUsul: 245,     // Ubah nilai ini
  totalSK: 198,       // Ubah nilai ini
  // ...
};
```

## Troubleshooting

### Dashboard Menampilkan Dummy Data
1. Cek koneksi ke Google Sheets API
2. Verifikasi nama sheet di `pages/api/dashboard.ts` sudah benar
3. Pastikan service account memiliki akses ke spreadsheet
4. Cek console browser untuk error messages

### Data Tidak Terupdate
1. Hard refresh browser (Ctrl+F5)
2. Cek format tanggal di Google Sheets (harus valid date format)
3. Verifikasi struktur data sesuai dengan ekspektasi API

### Error 500 di API
1. Cek environment variables (`.env.local`)
2. Verifikasi GOOGLE_SHEET_ID sudah benar
3. Pastikan private key valid

## Teknologi yang Digunakan

- **Next.js 13**: Framework React
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Google Sheets API**: Data source
- **React Hooks**: State management

## File Structure
```
├── components/
│   ├── DashboardCard.tsx      # Komponen kartu statistik
│   ├── ProgressBar.tsx        # Komponen progress bar
│   └── SimpleBarChart.tsx     # Komponen bar chart
├── pages/
│   ├── dashboard.tsx          # Halaman dashboard utama
│   └── api/
│       └── dashboard.ts       # API endpoint untuk data
```

## Future Enhancements

Ide pengembangan ke depan:
- [ ] Filter berdasarkan rentang tanggal
- [ ] Export data ke PDF/Excel
- [ ] Real-time updates dengan WebSocket
- [ ] Grafik line chart untuk trend
- [ ] Notifikasi untuk usul pending
- [ ] Perbandingan periode (bulan vs bulan)
- [ ] Dashboard per departemen/unit

## Support

Untuk pertanyaan atau masalah, hubungi tim development OSDM.

---

**Last Updated**: November 12, 2025
**Version**: 1.0.0
