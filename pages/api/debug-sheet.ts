import type { NextApiRequest, NextApiResponse } from 'next'
import { getSheetData } from '../../lib/googleSheets'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) return res.status(400).json({ error: 'GOOGLE_SHEET_ID not set' })

  const sheetName = req.query.sheet as string || 'Pengusulan Administrator dan Pengawas'

  try {
    const data = await getSheetData(sheetId, sheetName)
    
    return res.status(200).json({
      sheetName,
      headers: data.headers,
      subheaders: data.subheaders,
      hasSubheaders: (data.subheaders?.length || 0) > 0,
      rowCount: data.rows?.length || 0,
      firstRow: data.rows?.[0] || [],
      headerMerges: data.headerMerges
    })
  } catch (err: any) {
    console.error('Debug error:', err)
    return res.status(500).json({ error: err.message, details: err.toString() })
  }
}
