import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  METHOD_NOT_ALLOWED_RESPONSE_BODY,
} from '../../src/server-core/auth/requestContext.js'
import { getAnonymousOrAuthenticatedReadRequestContext } from '../../src/server-core/auth/readRequestContext.js'
import { getPlaceDetailForUser } from '../../src/server-core/place/placeDataService.js'
import { initServerSentry } from '../../src/server-core/runtime/sentry.js'

initServerSentry()

const setReadHeaders = (res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
}

const readPlaceId = (req: VercelRequest) =>
  Array.isArray(req.query?.placeId)
    ? req.query.placeId[0] ?? ''
    : typeof req.query?.placeId === 'string'
      ? req.query.placeId
      : ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setReadHeaders(res)

  if (req.method !== 'GET') {
    res.status(405).json(METHOD_NOT_ALLOWED_RESPONSE_BODY)
    return
  }

  const requestContext = await getAnonymousOrAuthenticatedReadRequestContext({ req })
  const viewerUserId = requestContext.status === 'authenticated'
    ? requestContext.authSession.user.id
    : null

  const place = await getPlaceDetailForUser({
    placeId: readPlaceId(req),
    viewerUserId,
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
