import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAccessToken } from './_lib/_authService.js'
import { preparePlaceEntryFromDraft } from './_lib/_placeEntryService.js'

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

  const name = typeof req.body?.name === 'string' ? req.body.name : ''
  const roadAddress = typeof req.body?.roadAddress === 'string' ? req.body.roadAddress : ''
  const landLotAddress = typeof req.body?.landLotAddress === 'string' ? req.body.landLotAddress : null

  const result = await preparePlaceEntryFromDraft({
    name,
    roadAddress,
    landLotAddress,
  })

  if (result.status === 'error') {
    res.status(422).json(result)
    return
  }

  res.status(200).json(result)
}
