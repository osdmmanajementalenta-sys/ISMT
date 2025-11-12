# File Upload System - Documentation

## 📁 System Architecture

### Google Apps Script Bridge
- **URL**: `https://script.google.com/macros/s/AKfycbyd0ejO2yOjq8auZPs1tyvkX_-_doVUSJ6APHsGBTcOBsQgf0Xm76MKBXXz7APy8eG8cg/exec`
- **Main Folder ID**: `1Eg3po3fFwJ34R0wpbmP0Rz_p4YwH-HQN`
- **Location**: `google-apps-script/FileUploadBridge.gs`

### Flow Diagram
```
User Click Upload Button 
  → Open File Manager Modal
  → Select "Upload" Tab
  → Choose File
  → Click "Upload File"
  → Convert to Base64
  → POST /api/fileUpload
  → Forward to Google Apps Script
  → Create Folder (if not exists)
  → Upload to Google Drive
  → Return File Info
  → Show in "Files" Tab
```

## 🔧 API Endpoints

### 1. Upload File
**Endpoint**: `POST /api/fileUpload`

**Request Body**:
```json
{
  "folderName": "Cell Value from Sheet",
  "fileName": "document.pdf",
  "fileData": "base64EncodedString",
  "mimeType": "application/pdf"
}
```

**Response**:
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "1ABC123...",
    "name": "document.pdf",
    "size": 256000,
    "mimeType": "application/pdf",
    "url": "https://drive.google.com/file/d/...",
    "downloadUrl": "https://drive.google.com/uc?export=download&id=...",
    "thumbnailUrl": "...",
    "createdDate": "2025-11-08T...",
    "modifiedDate": "2025-11-08T..."
  }
}
```

### 2. List Files
**Endpoint**: `GET /api/fileList?folderName=FolderName`

**Response**:
```json
{
  "success": true,
  "message": "Files retrieved successfully",
  "data": {
    "files": [
      {
        "id": "1ABC123...",
        "name": "document.pdf",
        "size": 256000,
        "mimeType": "application/pdf",
        "url": "https://drive.google.com/file/d/...",
        "downloadUrl": "https://drive.google.com/uc?export=download&id=...",
        "thumbnailUrl": "...",
        "createdDate": "2025-11-08T...",
        "modifiedDate": "2025-11-08T...",
        "extension": "pdf",
        "iconUrl": "https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_pdf_x16.png"
      }
    ],
    "count": 1
  }
}
```

### 3. Delete File
**Endpoint**: `POST /api/fileDelete`

**Request Body**:
```json
{
  "fileId": "1ABC123..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "fileName": "document.pdf"
  }
}
```

## 📋 Column Settings

In `colom_setting` sheet, add 5th column for Upload feature:

| Colom | Type | Show | Edit | Upload |
|-------|------|------|------|--------|
| Name  | text | yes  | yes  | no     |
| Files | text | yes  | no   | yes    |

- **Upload = "yes"**: Shows file manager button in cell
- **Upload = "no"** or empty: Normal editable cell

## 🎨 UI Components

### File Manager Modal

#### Files Tab
- **Loading State**: Spinner with "Loading files..." message
- **Empty State**: 
  - Folder icon
  - "No files uploaded yet" message
  - "Upload File" button to switch to upload tab
- **Files List**:
  - File icon (based on MIME type)
  - File name
  - File size and upload date
  - Action buttons:
    - Download (green) - Direct download
    - Open in Drive (blue) - Open in Google Drive
    - Delete (red) - Delete file with confirmation

#### Upload Tab
- **Drag & Drop Zone**:
  - Click to select file
  - Shows selected file info
  - File preview card with:
    - File icon
    - File name
    - File size
    - Remove button
- **Upload Button**:
  - Disabled until file selected
  - Shows loading spinner while uploading
  - Auto-switches to Files tab after success

## 🔐 Security & Permissions

### Google Apps Script
- **Execute as**: Your Google Account
- **Access**: Anyone (required for external calls)
- **Permissions**: 
  - Google Drive access
  - Create/read/delete files
  - Create folders

### File Sharing
- All uploaded files: "Anyone with link can view"
- All folders: "Anyone with link can view"

## 📊 Folder Structure in Google Drive

```
Main Folder (1Eg3po3fFwJ34R0wpbmP0Rz_p4YwH-HQN)
├── Cell Value 1/
│   ├── file1.pdf
│   ├── file2.docx
│   └── image.jpg
├── Cell Value 2/
│   └── document.pdf
└── Cell Value 3/
    ├── data.xlsx
    └── presentation.pptx
```

- Folder name = Cell value
- Each cell value creates unique folder
- Files organized by cell value

## 🎯 Usage Instructions

### For End Users

1. **Upload File**:
   - Click folder icon button next to cell value
   - Click "Upload" tab
   - Click or drag file to upload zone
   - Click "Upload File" button
   - Wait for success message
   - File appears in "Files" tab

2. **View Files**:
   - Click folder icon button
   - "Files" tab shows all uploaded files
   - See file name, size, and date

3. **Download File**:
   - In Files tab, click green download icon
   - File downloads directly

4. **Open in Drive**:
   - Click blue external link icon
   - Opens file in Google Drive

5. **Delete File**:
   - Click red delete icon
   - Confirm deletion
   - File moved to trash

### For Developers

#### Add Upload Column
```typescript
// In colom_setting sheet, add:
// Colom: YourColumn | Type: text | Show: yes | Edit: no | Upload: yes
```

#### Customize Upload Logic
```typescript
// In DataTable.tsx:
const handleFileUpload = async () => {
  // Your custom logic here
}
```

## 🐛 Troubleshooting

### Upload Fails
- Check Google Apps Script deployment
- Verify Web App URL is correct
- Check file size (default limit: 10MB)
- Verify Google Account has Drive access

### Files Not Loading
- Check folder name matches cell value exactly
- Verify Google Apps Script permissions
- Check browser console for errors

### Delete Not Working
- Verify file ID is correct
- Check Google Account has delete permissions
- File may be already deleted

## 📈 Future Enhancements

- [ ] Bulk file upload
- [ ] Drag and drop to upload
- [ ] File preview (images, PDFs)
- [ ] Search and filter files
- [ ] Sort by name, date, size
- [ ] File versioning
- [ ] Share link copy button
- [ ] Upload progress bar
- [ ] File type restrictions
- [ ] Max file size configuration
- [ ] Folder view in modal

## 🔄 Updates Log

### Version 1.0 (Nov 8, 2025)
- Initial implementation
- Google Apps Script bridge
- Upload, list, delete functionality
- File manager modal UI
- Integration with DataTable
