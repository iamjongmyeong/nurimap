import type { VercelRequest, VercelResponse } from '@vercel/node'

import { readSessionIdFromCookieHeader } from './_lib/_appSessionService.js'
import { getAuthenticatedSession } from './_lib/_authService.js'
import { getPlaceDetailForUser } from './_lib/_placeDataService.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: { code: 'method_not_allowed', message: 'Method not allowed' } })
    return
  }

  const sessionId = readSessionIdFromCookieHeader(req.headers.cookie)
  const authSession = await getAuthenticatedSession(sessionId)
  if (authSession.status === 'missing') {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Unauthorized' } })
    return
  }

  const placeId = typeof req.query?.placeId === 'string' ? req.query.placeId : ''
  const place = await getPlaceDetailForUser({
    placeId,
    viewerUserId: authSession.user.id,
  })

  if (!place) {
    res.status(404).json({ error: { code: 'not_found', message: 'Place not found.' } })
    return
  }

  res.status(200).json({
    status: 'success',
    data: place,
  })
}
