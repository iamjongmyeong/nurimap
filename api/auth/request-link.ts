import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requestLoginLink } from '../_lib/authService.ts'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method_not_allowed' } })
    return
  }

  const email = typeof req.body?.email === 'string' ? req.body.email : ''
  const result = await requestLoginLink(email)

  if (result.status === 'error') {
    const statusCode = result.code === 'invalid_domain' ? 400 : result.code === 'delivery_failed' ? 502 : 429
    res.status(statusCode).json(result)
    return
  }

  res.status(200).json(result)
}
