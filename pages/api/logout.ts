import type { NextApiRequest, NextApiResponse } from 'next'
import { clearSessionCookie } from '../../lib/session'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  clearSessionCookie(res)
  return res.status(200).json({ ok: true })
}
