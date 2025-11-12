/**
 * Google Apps Script - File Upload Bridge
 * Deploy as Web App with access: "Anyone" to allow external calls
 * 
 * Main Folder ID: 1Eg3po3fFwJ34R0wpbmP0Rz_p4YwH-HQN
 */

const MAIN_FOLDER_ID = '1Eg3po3fFwJ34R0wpbmP0Rz_p4YwH-HQN';

/**
 * Handle HTTP POST requests
 */
function doPost(e) {
  try {
    const params = e.parameter;
    const action = params.action;

    switch(action) {
      case 'upload':
        return uploadFile(params);
      case 'listFiles':
        return listFiles(params);
      case 'deleteFile':
        return deleteFile(params);
      case 'rename':
        return renameFolder(params);
      default:
        return createResponse(false, 'Invalid action');
    }
  } catch (error) {
    return createResponse(false, error.toString());
  }
}

/**
 * Handle HTTP GET requests
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action;

    switch(action) {
      case 'listFiles':
        return listFiles(params);
      case 'downloadFile':
        return downloadFile(params);
      default:
        return createResponse(false, 'Invalid action for GET request');
    }
  } catch (error) {
    return createResponse(false, error.toString());
  }
}

/**
 * Upload file to Google Drive
 * Params: folderName, fileName, fileData (base64), mimeType
 */
function uploadFile(params) {
  try {
    const folderName = params.folderName;
    const fileName = params.fileName;
    const fileDataBase64 = params.fileData;
    const mimeType = params.mimeType || 'application/octet-stream';
    
    if (!folderName || !fileName || !fileDataBase64) {
      return createResponse(false, 'Missing required parameters: folderName, fileName, fileData');
    }

    // Get or create subfolder
    const folder = getOrCreateFolder(MAIN_FOLDER_ID, folderName);
    
    // Decode base64 file data
    const fileBlob = Utilities.newBlob(
      Utilities.base64Decode(fileDataBase64),
      mimeType,
      fileName
    );
    
    // Upload file to folder
    const file = folder.createFile(fileBlob);
    
    // Set sharing to "Anyone with link can view"
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileInfo = {
      id: file.getId(),
      name: file.getName(),
      size: file.getSize(),
      mimeType: file.getMimeType(),
      url: file.getUrl(),
      downloadUrl: `https://drive.google.com/uc?export=download&id=${file.getId()}`,
      createdDate: file.getDateCreated().toISOString(),
      modifiedDate: file.getLastUpdated().toISOString(),
      extension: getFileExtension(file.getName()),
      iconUrl: getFileIconUrl(file.getMimeType())
    };
    
    return createResponse(true, 'File uploaded successfully', fileInfo);
  } catch (error) {
    return createResponse(false, 'Upload failed: ' + error.toString());
  }
}

/**
 * List all files in a folder
 * Params: folderName
 */
function listFiles(params) {
  try {
    const folderName = params.folderName;
    
    if (!folderName) {
      return createResponse(false, 'Missing required parameter: folderName');
    }

    // Try to find the folder
    const mainFolder = DriveApp.getFolderById(MAIN_FOLDER_ID);
    const folders = mainFolder.getFoldersByName(folderName);
    
    if (!folders.hasNext()) {
      // Folder doesn't exist yet, return empty array
      return createResponse(true, 'Folder not found (empty)', { files: [], count: 0 });
    }
    
    const folder = folders.next();
    const files = folder.getFiles();
    const fileList = [];
    
    while (files.hasNext()) {
      const file = files.next();
      fileList.push({
        id: file.getId(),
        name: file.getName(),
        size: file.getSize(),
        mimeType: file.getMimeType(),
        url: file.getUrl(),
        downloadUrl: `https://drive.google.com/uc?export=download&id=${file.getId()}`,
        createdDate: file.getDateCreated().toISOString(),
        modifiedDate: file.getLastUpdated().toISOString(),
        extension: getFileExtension(file.getName()),
        iconUrl: getFileIconUrl(file.getMimeType())
      });
    }
    
    return createResponse(true, 'Files retrieved successfully', {
      files: fileList,
      count: fileList.length
    });
  } catch (error) {
    return createResponse(false, 'List files failed: ' + error.toString());
  }
}

/**
 * Delete a file
 * Params: fileId
 */
function deleteFile(params) {
  try {
    const fileId = params.fileId;
    
    if (!fileId) {
      return createResponse(false, 'Missing required parameter: fileId');
    }
    
    const file = DriveApp.getFileById(fileId);
    const fileName = file.getName();
    file.setTrashed(true);
    
    return createResponse(true, 'File deleted successfully', { fileName: fileName });
  } catch (error) {
    return createResponse(false, 'Delete failed: ' + error.toString());
  }
}

/**
 * Rename a folder
 * Params: oldFolderName, newFolderName
 */
function renameFolder(params) {
  try {
    const oldFolderName = params.oldFolderName;
    const newFolderName = params.newFolderName;
    
    if (!oldFolderName || !newFolderName) {
      return createResponse(false, 'Missing required parameters: oldFolderName, newFolderName');
    }

    // Find the old folder
    const mainFolder = DriveApp.getFolderById(MAIN_FOLDER_ID);
    const folders = mainFolder.getFoldersByName(oldFolderName);
    
    if (!folders.hasNext()) {
      // Folder doesn't exist, create new one with new name
      const newFolder = getOrCreateFolder(MAIN_FOLDER_ID, newFolderName);
      return createResponse(true, 'Old folder not found, created new folder', {
        folderId: newFolder.getId(),
        folderName: newFolder.getName(),
        folderUrl: newFolder.getUrl()
      });
    }
    
    // Rename the folder
    const folder = folders.next();
    const oldName = folder.getName();
    folder.setName(newFolderName);
    
    return createResponse(true, 'Folder renamed successfully', {
      folderId: folder.getId(),
      oldName: oldName,
      newName: folder.getName(),
      folderUrl: folder.getUrl()
    });
  } catch (error) {
    return createResponse(false, 'Rename failed: ' + error.toString());
  }
}

/**
 * Get or create a folder by name inside parent folder
 */
function getOrCreateFolder(parentFolderId, folderName) {
  const parentFolder = DriveApp.getFolderById(parentFolderId);
  const folders = parentFolder.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    // Folder already exists
    return folders.next();
  } else {
    // Create new folder
    const newFolder = parentFolder.createFolder(folderName);
    // Set sharing to "Anyone with link can view"
    newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return newFolder;
  }
}

/**
 * Get file extension from filename
 */
function getFileExtension(fileName) {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get icon URL based on MIME type
 */
function getFileIconUrl(mimeType) {
  const iconMap = {
    'application/pdf': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_pdf_x16.png',
    'application/msword': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_word_x16.png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_word_x16.png',
    'application/vnd.ms-excel': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_excel_x16.png',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_excel_x16.png',
    'application/vnd.ms-powerpoint': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_presentation_x16.png',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_presentation_x16.png',
    'image/jpeg': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_image_x16.png',
    'image/png': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_image_x16.png',
    'image/gif': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_image_x16.png',
    'video/mp4': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_video_x16.png',
    'video/quicktime': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_video_x16.png',
    'audio/mpeg': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_audio_x16.png',
    'text/plain': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_text_x16.png',
    'application/zip': 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_archive_x16.png'
  };
  
  return iconMap[mimeType] || 'https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_generic_x16.png';
}

/**
 * Create standardized JSON response
 */
function createResponse(success, message, data = null) {
  const response = {
    success: success,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test function - can be run manually to test folder creation
 */
function testFolderCreation() {
  const testFolder = getOrCreateFolder(MAIN_FOLDER_ID, 'Test Folder Name');
  Logger.log('Folder ID: ' + testFolder.getId());
  Logger.log('Folder Name: ' + testFolder.getName());
  Logger.log('Folder URL: ' + testFolder.getUrl());
}

/**
 * Test function - list all files in main folder
 */
function testListMainFolder() {
  const mainFolder = DriveApp.getFolderById(MAIN_FOLDER_ID);
  const folders = mainFolder.getFolders();
  
  Logger.log('Subfolders in main folder:');
  while (folders.hasNext()) {
    const folder = folders.next();
    Logger.log('- ' + folder.getName() + ' (ID: ' + folder.getId() + ')');
  }
}
