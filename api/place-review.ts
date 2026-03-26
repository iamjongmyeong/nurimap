import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  findActiveAppSessionById,
  isValidCsrfTokenPair,
  readCsrfTokenFromCookieHeader,
  readCsrfTokenFromHeaders,
  readSessionIdFromCookieHeader,
} from '../src/server-core/auth/appSessionService.js'
import { getAuthenticatedSession } from '../src/server-core/auth/authService.js'
import { submitPersistedPlaceReview } from '../src/server-core/place/placeDataService.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method_not_allowed', message: 'Method not allowed' } })
    return
  }

  const sessionId = readSessionIdFromCookieHeader(req.headers.cookie)
  const session = sessionId ? await findActiveAppSessionById({ sessionId }) : null
  if (!sessionId || !session) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Unauthorized' } })
    return
  }

  const cookieCsrfToken = readCsrfTokenFromCookieHeader(req.headers.cookie)
  const headerCsrfToken = readCsrfTokenFromHeaders(req.headers)
  if (!isValidCsrfTokenPair({
    cookieToken: cookieCsrfToken,
    headerToken: headerCsrfToken,
    expectedHash: session.csrf_token_hash,
  })) {
    res.status(403).json({ error: { code: 'csrf_invalid', message: 'Invalid CSRF token.' } })
    return
  }

  const authSession = await getAuthenticatedSession(sessionId)
  if (authSession.status === 'missing') {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Unauthorized' } })
    return
  }

  const placeId = typeof req.body?.placeId === 'string' ? req.body.placeId : ''
  const ratingScore = typeof req.body?.ratingScore === 'number' ? req.body.ratingScore : 0
  const reviewContent = typeof req.body?.reviewContent === 'string' ? req.body.reviewContent : ''
  const allowOverwrite = req.body?.allowOverwrite === true

  const result = await submitPersistedPlaceReview({
    placeId,
    userId: authSession.user.id,
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
