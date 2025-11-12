import type { NextApiRequest, NextApiResponse } from 'next'
import { verifySessionToken } from '../../lib/session'
import { appendSheetRow, getSheetData } from '../../lib/googleSheets'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.cookies?.osdm_session || req.headers.cookie?.split(';').find((c) => c.trim().startsWith('osdm_session='))?.split('=')[1]
  const payload = verifySessionToken(token)
  if (!payload) return res.status(401).json({ error: 'Not authenticated' })

  const { sheetName, values } = req.body || {}
  if (!sheetName || !Array.isArray(values)) return res.status(400).json({ error: 'Missing parameters' })

  try {
    // permission check
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

    // append row (pad/truncate to header length)
    const headerLen = headers.length || values.length
    const rowValues = new Array(headerLen - 1).fill('').map((_, i) => values[i] ?? '') // skip usertype col
    await appendSheetRow(process.env.GOOGLE_SHEET_ID || '', sheetName, rowValues)
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    console.error('sheet append error', err)
    return res.status(500).json({ error: err.message || 'unknown' })
  }
}
