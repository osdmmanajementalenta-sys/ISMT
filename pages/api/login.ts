import type { NextApiRequest, NextApiResponse } from 'next'
import { getSheetData } from '../../lib/googleSheets'
import { createSessionToken, setSessionCookie } from '../../lib/session'

type LoginReq = {
  user?: string
  pass?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body: LoginReq = req.body
  const username = body.user?.toString() || ''
  const password = body.pass?.toString() || ''

  if (!username || !password) return res.status(400).json({ error: 'user and pass required' })

  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) return res.status(500).json({ error: 'GOOGLE_SHEET_ID not set' })

  try {
    // read specifically the sheet named 'users'
    const { headers, rows } = await getSheetData(sheetId, 'users')

    // Expect columns: Username, Password, Nama, Type, allowUploadFiles, allowDeleteFiles (in that order)
    const found = rows.find((r) => {
      const u = (r[0] || '').toString()
      const p = (r[1] || '').toString()
      return u === username && p === password
    })

    if (!found) return res.status(401).json({ error: 'Invalid credentials' })

    const resultUser = {
      user: found[0] || '',
      name: found[2] || '',
      type: found[3] || '',
      allowUploadFiles: found[4] || '',
      allowDeleteFiles: found[5] || '',
    }

    // create session token and set HttpOnly cookie
    const token = createSessionToken({ 
      user: resultUser.user, 
      name: resultUser.name, 
      type: resultUser.type,
      allowUploadFiles: resultUser.allowUploadFiles,
      allowDeleteFiles: resultUser.allowDeleteFiles
    })
    setSessionCookie(res, token)

    return res.status(200).json({ ok: true, user: resultUser })
  } catch (err: any) {
    console.error('login error', err)
    return res.status(500).json({ error: err.message || 'unknown' })
  }
}
