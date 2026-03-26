import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  getAuthenticatedRequestContext,
  METHOD_NOT_ALLOWED_RESPONSE_BODY,
} from '../../../../src/server-core/auth/requestContext.js'
import { submitPersistedPlaceReview } from '../../../../src/server-core/place/placeDataService.js'

const readPlaceId = (req: VercelRequest) =>
  Array.isArray(req.query?.placeId)
    ? req.query.placeId[0] ?? ''
    : typeof req.query?.placeId === 'string'
      ? req.query.placeId
      : ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json(METHOD_NOT_ALLOWED_RESPONSE_BODY)
    return
  }

  const requestContext = await getAuthenticatedRequestContext({
    req,
    requireCsrf: true,
  })
  if (requestContext.status === 'error') {
    res.status(requestContext.statusCode).json(requestContext.body)
    return
  }

  const result = await submitPersistedPlaceReview({
    placeId: readPlaceId(req),
    userId: requestContext.authSession.user.id,
    allowOverwrite: false,
    draft: {
      rating_score: typeof req.body?.ratingScore === 'number' ? req.body.ratingScore : 0,
      review_content: typeof req.body?.reviewContent === 'string' ? req.body.reviewContent : '',
    },
  })

  if (result.status === 'error') {
    res.status(422).json({
      error: {
        code: 'review_save_failed',
        message: result.message,
      },
    })
    return
  }

  if (result.status === 'existing_review') {
    res.status(409).json(result)
    return
  }

  res.status(201).json(result)
}
