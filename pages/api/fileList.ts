import type { NextApiRequest, NextApiResponse } from 'next'

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyd0ejO2yOjq8auZPs1tyvkX_-_doVUSJ6APHsGBTcOBsQgf0Xm76MKBXXz7APy8eG8cg/exec'

type ApiResponse = {
  success: boolean
  message: string
  data?: any
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { folderName } = req.query

    if (!folderName || typeof folderName !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: folderName'
      })
    }

    // Send request to Google Apps Script
    const url = `${GAS_WEB_APP_URL}?action=listFiles&folderName=${encodeURIComponent(folderName)}`
    const response = await fetch(url, {
      method: 'GET',
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
    console.error('File list error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve file list',
      error: error.message
    })
  }
}
