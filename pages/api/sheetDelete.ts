import type { NextApiRequest, NextApiResponse } from 'next'
import { verifySessionToken } from '../../lib/session'
import { getSheetData } from '../../lib/googleSheets'
import { google } from 'googleapis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.cookies?.osdm_session || req.headers.cookie?.split(';').find((c) => c.trim().startsWith('osdm_session='))?.split('=')[1]
  const payload = verifySessionToken(token)
  if (!payload) return res.status(401).json({ error: 'Not authenticated' })

  const { sheetName, rowIndex } = req.body || {}
  if (!sheetName || typeof rowIndex !== 'number') {
    return res.status(400).json({ error: 'Missing parameters' })
  }

  try {
    // check permissions
    const settings = await getSheetData(process.env.GOOGLE_SHEET_ID || '', 'page_setting')
    const headers = settings.headers
    const rows = settings.rows
    const type = payload.type || ''
    const row = rows.find((r) => (r[0] || '').toString().toLowerCase() === type.toString().toLowerCase())
    if (!row) return res.status(403).json({ error: 'Access denied' })
    const sheetIdx = headers.findIndex((h) => h === sheetName)
    if (sheetIdx === -1) return res.status(403).json({ error: 'Access denied' })
    const val = (row[sheetIdx] || '').toString().toLowerCase()
    const allowed = val === 'yes' || val === 'y' || val === 'true'
    if (!allowed) return res.status(403).json({ error: 'Access denied' })

    // Setup Google Sheets API - using same pattern as googleSheets.ts
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || ''
    privateKey = privateKey.trim()
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1)
    }
    privateKey = privateKey.replace(/\\n/g, '\n')

    const client = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      undefined,
      privateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    )

    const sheets = google.sheets({ version: 'v4', auth: client })
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || ''

    // Get sheet ID from sheet name
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName)
    if (!sheet || !sheet.properties?.sheetId) {
      return res.status(404).json({ error: 'Sheet not found' })
    }

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1, // 0-based index
                endIndex: rowIndex, // exclusive
              },
            },
          },
        ],
      },
    })

    return res.status(200).json({ ok: true })
  } catch (err: any) {
    console.error('sheet delete error', err)
    return res.status(500).json({ error: err.message || 'unknown' })
  }
}
