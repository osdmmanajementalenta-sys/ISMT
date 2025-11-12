# Troubleshooting: Rename Folder Tidak Berfungsi

## 🔍 Problem
Saat edit nilai pada kolom dengan atribut `upload`, folder di Google Drive tidak otomatis di-rename.

## ✅ Checklist Solusi

### 1. Verify Google Apps Script Sudah Ter-Deploy

**Langkah:**
1. Buka Google Apps Script editor
2. URL: https://script.google.com/home
3. Cari project: "OSDM File Upload Bridge" atau nama project Anda
4. Pastikan file `FileUploadBridge.gs` ada
5. Cek baris 180-222 - harus ada fungsi `renameFolder(params)`
6. Cek baris 27 - harus ada: `case 'rename': return renameFolder(params);`

**Jika kode belum ada:**
- Copy kode dari file: `google-apps-script/FileUploadBridge.gs`
- Paste ke Apps Script editor
- Save (Ctrl+S)

### 2. Deploy Ulang Script

**Langkah:**
1. Di Apps Script editor, klik **Deploy** (tombol biru di kanan atas)
2. Pilih **Manage deployments**
3. Pada deployment yang sudah ada, klik ⚙️ (gear icon)
4. **Penting:** Pilih **New version** atau increment version
5. Klik **Deploy**
6. Copy URL deployment (contoh: https://script.google.com/macros/s/.../exec)

**Mengapa perlu New Version?**
- Google Apps Script cache versi lama
- Harus create new version untuk load kode terbaru

### 3. Verify Environment Variable

Check file `.env.local`:

```bash
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbyd0ejO2yOjq8auZPs1tyvkX_-_doVUSJ6APHsGBTcOBsQgf0Xm76MKBXXz7APy8eG8cg/exec
```

**Jika URL berbeda setelah re-deploy:**
1. Update `.env.local` dengan URL baru
2. Restart Next.js server:
   ```bash
   # Tekan Ctrl+C untuk stop server
   npm run dev
   ```

### 4. Test Rename Function

**Manual Test via Browser:**

Buka browser console (F12) dan jalankan:

```javascript
fetch('http://localhost:3000/api/folderRename', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    oldFolderName: 'TestOld',
    newFolderName: 'TestNew'
  })
})
.then(r => r.json())
.then(data => console.log('Result:', data))
.catch(err => console.error('Error:', err))
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Folder renamed successfully",
  "data": {
    "folderId": "...",
    "oldName": "TestOld",
    "newName": "TestNew",
    "folderUrl": "https://drive.google.com/..."
  }
}
```

**Expected Response (Folder tidak ada - auto create):**
```json
{
  "success": true,
  "message": "Old folder not found, created new folder",
  "data": {
    "folderId": "...",
    "folderName": "TestNew",
    "folderUrl": "https://drive.google.com/..."
  }
}
```

### 5. Test dari DataTable

**Langkah:**
1. Buka halaman dengan sheet (misal: http://localhost:3000/sheet/Pelantikan)
2. Cari kolom dengan atribut `upload=yes` di sheet `setting`
3. Klik pada cell di kolom upload (misal: "Folder A")
4. Edit menjadi "Folder B"
5. Tekan Enter
6. **Check:**
   - Toast notification harus muncul dengan message: "Cell updated and folder renamed..."
   - Browser console (F12) → Network tab → Check request ke `/api/folderRename`
   - Google Drive → Folder harus berubah nama dari "Folder A" ke "Folder B"

### 6. Check Browser Console for Errors

Buka Developer Tools (F12) → Console tab

**Common Errors:**

**Error: "Quota exceeded"**
```
Solution: Tunggu 60 menit, API quota akan reset
```

**Error: "Google Apps Script URL not configured"**
```
Solution: Set GOOGLE_APPS_SCRIPT_URL di .env.local
```

**Error: "Invalid response from Google Apps Script"**
```
Solution: 
- Re-deploy Google Apps Script dengan New Version
- Verify URL di .env.local benar
```

**Error: "Folder rename failed"**
```
Solution:
- Check MAIN_FOLDER_ID di FileUploadBridge.gs (line 8)
- Verify Apps Script punya akses ke folder
- Cek folder exists di Google Drive
```

### 7. Check Server Terminal

Check terminal yang run `npm run dev` untuk error messages:

```
✅ Good:
Renaming folder: { oldFolderName: 'A', newFolderName: 'B' }
Response status: 200
Parsed result: { success: true, ... }

❌ Bad:
Error renaming folder: FetchError...
Response status: 500
```

## 🎯 Verification Steps

**Quick Test:**
1. Deploy ulang Google Apps Script dengan New Version
2. Restart Next.js server (Ctrl+C, then `npm run dev`)
3. Buka halaman sheet dengan kolom upload
4. Edit cell di kolom upload
5. Check toast notification dan Google Drive

**Full Test:**
1. Create folder "TestFolder123" di Google Drive manually
2. Edit cell ke "TestFolder123"
3. Tekan Enter
4. Edit lagi ke "RenamedFolder456"
5. Check Google Drive - folder harus berubah nama

## 📝 Current Status

**Code Status:**
✅ DataTable.tsx - Auto-rename logic implemented (lines 175-240)
✅ folderRename.ts API - Endpoint ready
✅ FileUploadBridge.gs - renameFolder function exists (lines 180-222)
✅ doPost handler - case 'rename' added (line 27)
✅ .env.local - GOOGLE_APPS_SCRIPT_URL configured

**Action Required:**
1. ⚠️ Re-deploy Google Apps Script dengan **New Version**
2. ⚠️ Test dengan edit cell di kolom upload
3. ⚠️ Verify folder name berubah di Google Drive

## 🔧 Common Issues

### Issue 1: "Cell updated successfully, but folder rename failed"

**Cause:** Google Apps Script belum ter-deploy dengan versi terbaru

**Solution:**
1. Deploy Apps Script dengan **New Version** (bukan re-use version)
2. Restart Next.js server

### Issue 2: Rename berhasil tapi folder lama masih ada

**Cause:** Mungkin ada multiple folders dengan nama sama

**Solution:**
- Check Google Drive, mungkin ada duplicate folders
- Delete folder lama secara manual
- Gunakan rename untuk sync

### Issue 3: Error 429 - Quota exceeded

**Cause:** Terlalu banyak API calls ke Google Sheets/Drive

**Solution:**
- Tunggu 60 menit untuk quota reset
- Reduce frequency of edits

## 📚 Reference

- Google Apps Script Deployment: https://developers.google.com/apps-script/guides/web
- Drive API Quota: https://developers.google.com/drive/api/guides/limits

## 🎉 Expected Behavior

When working correctly:
1. User edits cell in upload column (e.g., "Folder A" → "Folder B")
2. Cell updates in Google Sheets ✅
3. Toast shows: "Cell updated and folder renamed from 'Folder A' to 'Folder B'" ✅
4. Folder in Google Drive renamed from "Folder A" to "Folder B" ✅
5. Files inside folder remain intact ✅

**NEXT STEP: Re-deploy Google Apps Script dengan New Version!**
