import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAccessToken } from './_lib/_authService'
import { lookupPlaceFromRawUrl } from './_lib/_placeLookupService'
import { NAVER_URL_ERROR_MESSAGE } from './_lib/_naverUrl'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method_not_allowed', message: 'Method not allowed' } })
    return
  }

  const authorization = req.headers.authorization
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
  const user = accessToken ? await verifyAccessToken(accessToken) : null
  if (!user) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Unauthorized' } })
    return
  }

  const rawUrl = typeof req.body?.rawUrl === 'string' ? req.body.rawUrl : ''

  try {
    const result = await lookupPlaceFromRawUrl(rawUrl)
    if (result.status === 'error') {
      res.status(result.error.code === 'lookup_failed' ? 502 : 422).json(result)
      return
    }

    res.status(200).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : NAVER_URL_ERROR_MESSAGE
    res.status(400).json({
      status: 'error',
      error: {
        code: 'lookup_failed',
        message,
      },
    })
  }
}
