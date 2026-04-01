import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  getAnonymousOrAuthenticatedRequestContext,
  METHOD_NOT_ALLOWED_RESPONSE_BODY,
} from '../../src/server-core/auth/requestContext.js'
import { listPlacesForUser } from '../../src/server-core/place/placeDataService.js'
import { initServerSentry } from '../../src/server-core/runtime/sentry.js'

initServerSentry()

const setReadHeaders = (res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setReadHeaders(res)

  if (req.method !== 'GET') {
    res.status(405).json(METHOD_NOT_ALLOWED_RESPONSE_BODY)
    return
  }

  const requestContext = await getAnonymousOrAuthenticatedRequestContext({ req })
  const viewerUserId = requestContext.status === 'authenticated'
    ? requestContext.authSession.user.id
    : null

  const places = await listPlacesForUser(viewerUserId)
  res.status(200).json({
    status: 'success',
    places,
  })
}
