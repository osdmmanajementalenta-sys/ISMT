import type { NextApiRequest, NextApiResponse } from 'next'

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyd0ejO2yOjq8auZPs1tyvkX_-_doVUSJ6APHsGBTcOBsQgf0Xm76MKBXXz7APy8eG8cg/exec'

type ApiResponse = {
  success: boolean
  message: string
  data?: any
  error?: string
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Adjust based on your needs
    },
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { folderName, fileName, fileData, mimeType } = req.body

    if (!folderName || !fileName || !fileData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: folderName, fileName, fileData'
      })
    }

    // Prepare form data for Google Apps Script
    const formData = new URLSearchParams()
    formData.append('action', 'upload')
    formData.append('folderName', folderName)
    formData.append('fileName', fileName)
    formData.append('fileData', fileData)
    formData.append('mimeType', mimeType || 'application/octet-stream')

    // Send request to Google Apps Script
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const result = await response.json()

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
      })
    } else {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.message
      })
    }
  } catch (error: any) {
    console.error('File upload error:', error)
    return res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    })
  }
}
