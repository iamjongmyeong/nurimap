import type { VercelRequest, VercelResponse } from '@vercel/node'
import { consumeLoginLink } from '../_lib/_authService.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method_not_allowed' } })
    return
  }

  const email = typeof req.body?.email === 'string' ? req.body.email : ''
  const nonce = typeof req.body?.nonce === 'string' ? req.body.nonce : ''
  const result = await consumeLoginLink({ email, nonce })

  res.status(410).json(result)
}
