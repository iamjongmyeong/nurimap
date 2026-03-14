import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requestLoginLink } from '../_lib/_authService.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method_not_allowed' } })
    return
  }

  const email = typeof req.body?.email === 'string' ? req.body.email : ''
  const requireBypass = req.body?.requireBypass === true
  const result = await requestLoginLink(email, { requireBypass })

  if (result.status === 'error') {
    const statusCode = result.code === 'delivery_failed'
      ? 502
      : result.code === 'cooldown' || result.code === 'daily_limit'
        ? 429
        : 400
    res.status(statusCode).json(result)
    return
  }

  res.status(200).json(result)
}
