import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  getAuthenticatedRequestContext,
  METHOD_NOT_ALLOWED_RESPONSE_BODY,
} from '../../src/server-core/auth/requestContext.js'
import { listPlacesForUser } from '../../src/server-core/place/placeDataService.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json(METHOD_NOT_ALLOWED_RESPONSE_BODY)
    return
  }

  const requestContext = await getAuthenticatedRequestContext({ req })
  if (requestContext.status === 'error') {
    res.status(requestContext.statusCode).json(requestContext.body)
    return
  }

  const places = await listPlacesForUser(requestContext.authSession.user.id)
  res.status(200).json({
    status: 'success',
    places,
  })
}
