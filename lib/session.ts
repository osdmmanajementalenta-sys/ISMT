import crypto from 'crypto'
import { NextApiResponse } from 'next'

const SECRET = (process.env.SESSION_SECRET || process.env.GOOGLE_PRIVATE_KEY || '').trim()
if (!SECRET) {
  console.warn('SESSION_SECRET not set; falling back to GOOGLE_PRIVATE_KEY (not recommended)')
}

function base64url(input: string) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function sign(payload: string) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64').replace(/=/g, '')
}

export function createSessionToken(obj: Record<string, any>, expiresInSeconds = 60 * 60 * 8) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
  const payload = { ...obj, exp }
  const json = JSON.stringify(payload)
  const b64 = base64url(json)
  const sig = sign(b64)
  return `${b64}.${sig}`
}

export function verifySessionToken(token: string | undefined) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [b64, sig] = parts
  const expected = sign(b64)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return null
  if (!crypto.timingSafeEqual(Uint8Array.from(a), Uint8Array.from(b))) return null
  } catch (e) {
    return null
  }
  try {
    const json = Buffer.from(b64, 'base64').toString('utf8')
    const obj = JSON.parse(json)
    if (typeof obj.exp === 'number' && obj.exp < Math.floor(Date.now() / 1000)) return null
    return obj
  } catch (e) {
    return null
  }
}

export function setSessionCookie(res: NextApiResponse, token: string, maxAgeSec = 60 * 60 * 8) {
  const isProd = process.env.NODE_ENV === 'production'
  const cookie = `osdm_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${isProd ? '; Secure' : ''}`
  res.setHeader('Set-Cookie', cookie)
}

export function clearSessionCookie(res: NextApiResponse) {
  const cookie = `osdm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  res.setHeader('Set-Cookie', cookie)
}
