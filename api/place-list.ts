import type { VercelRequest, VercelResponse } from '@vercel/node'

import { readSessionIdFromCookieHeader } from '../src/server-core/auth/appSessionService.js'
import { getAuthenticatedSession } from '../src/server-core/auth/authService.js'
import { listPlacesForUser } from '../src/server-core/place/placeDataService.js'

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

  const places = await listPlacesForUser(authSession.user.id)
  res.status(200).json({
    status: 'success',
    places,
  })
}
