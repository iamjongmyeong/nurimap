import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  getAuthenticatedRequestContext,
  METHOD_NOT_ALLOWED_RESPONSE_BODY,
} from '../../src/server-core/auth/requestContext.js'
import { listPlacesForUser } from '../../src/server-core/place/placeDataService.js'

const setNoStoreHeaders = (res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setNoStoreHeaders(res)

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
