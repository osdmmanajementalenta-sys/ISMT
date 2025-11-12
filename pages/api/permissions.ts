import type { NextApiRequest, NextApiResponse } from 'next'
import { verifySessionToken } from '../../lib/session'
import { getSheetData } from '../../lib/googleSheets'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies?.osdm_session || req.headers.cookie?.split(';').find((c) => c.trim().startsWith('osdm_session='))?.split('=')[1]
  const payload = verifySessionToken(token)
  if (!payload) return res.status(401).json({ error: 'Not authenticated' })

  const type = payload.type || payload['type'] || ''
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not set' })

  try {
    const { headers, rows } = await getSheetData(sheetId, 'page_setting')
    const permissionMap: Record<string, Record<string, boolean>> = {}
    rows.forEach((r) => {
      const t = (r[0] || '').toString()
      permissionMap[t] = {}
      for (let i = 1; i < headers.length; i++) {
        const sheet = headers[i]
        const val = (r[i] || '').toString().toLowerCase()
        permissionMap[t][sheet] = val === 'yes' || val === 'y' || val === 'true'
      }
    })

    const allowed = permissionMap[type] || {}
    return res.status(200).json({ ok: true, type, allowed })
  } catch (err: any) {
    console.error('permissions error', err)
    return res.status(500).json({ error: err.message || 'unknown' })
  }
}
