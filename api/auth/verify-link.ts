import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyLoginLink } from '../_lib/_authService'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method_not_allowed' } })
    return
  }

  const email = typeof req.body?.email === 'string' ? req.body.email : ''
  const nonce = typeof req.body?.nonce === 'string' ? req.body.nonce : ''
  const result = await verifyLoginLink({ email, nonce })

  if (result.status === 'error') {
    res.status(400).json(result)
    return
  }

  res.status(200).json(result)
}
