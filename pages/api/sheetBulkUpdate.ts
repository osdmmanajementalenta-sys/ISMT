import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { sheet, headers, rows } = req.body || {}
  
  if (!sheet || !headers || !rows) {
    return res.status(400).json({ error: 'Missing sheet, headers, or rows' })
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = process.env.GOOGLE_SHEET_ID

    // Clear existing data and write new data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheet}!A:Z`
    })

    // Write headers and rows
    const values = [headers, ...rows]
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheet}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values }
    })

    return res.status(200).json({ ok: true })
  } catch (error: any) {
    console.error('Bulk update error:', error)
    return res.status(500).json({ error: error.message || 'Failed to update sheet' })
  }
}
