import type { VercelRequest, VercelResponse } from '@vercel/node'

import canonicalHandler from './places/[placeId]/reviews/index.js'
import {
  getAuthenticatedRequestContext,
  METHOD_NOT_ALLOWED_RESPONSE_BODY,
} from '../src/server-core/auth/requestContext.js'
import { submitPersistedPlaceReview } from '../src/server-core/place/placeDataService.js'

const buildCanonicalRequest = (req: VercelRequest, placeId: string) => ({
  ...req,
  query: {
    ...req.query,
    placeId,
  },
}) as unknown as VercelRequest

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json(METHOD_NOT_ALLOWED_RESPONSE_BODY)
    return
  }

  const allowOverwrite = req.body?.allowOverwrite === true
  const placeId = typeof req.body?.placeId === 'string' ? req.body.placeId : ''

  if (!allowOverwrite) {
    await canonicalHandler(buildCanonicalRequest(req, placeId), res)
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

  const ratingScore = typeof req.body?.ratingScore === 'number' ? req.body.ratingScore : 0
  const reviewContent = typeof req.body?.reviewContent === 'string' ? req.body.reviewContent : ''

  const result = await submitPersistedPlaceReview({
    placeId,
    userId: requestContext.authSession.user.id,
    allowOverwrite,
    draft: {
      rating_score: ratingScore,
      review_content: reviewContent,
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

  res.status(200).json(result)
}
