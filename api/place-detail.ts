import type { VercelRequest, VercelResponse } from '@vercel/node'

import { readSessionIdFromCookieHeader } from '../src/server-core/auth/appSessionService.js'
import { getAuthenticatedSession } from '../src/server-core/auth/authService.js'
import { getPlaceDetailForUser } from '../src/server-core/place/placeDataService.js'

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
    place,
  })
}
