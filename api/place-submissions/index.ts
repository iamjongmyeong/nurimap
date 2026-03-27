import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  getAuthenticatedRequestContext,
  METHOD_NOT_ALLOWED_RESPONSE_BODY,
} from '../../src/server-core/auth/requestContext.js'
import { checkUserScopedRateLimit } from '../../src/server-core/http/requestRateLimit.js'
import { createPlaceSubmission } from '../../src/server-core/place/placeSubmissionService.js'
import { logPlaceEntryFailure } from '../../src/server-core/runtime/opsLogger.js'
import {
  GENERIC_PLACE_SUBMISSION_ERROR_MESSAGE,
  getPlaceRegistrationDraftFromBody,
  PLACE_SUBMISSION_RATE_LIMIT,
  PLACE_SUBMISSION_RATE_LIMIT_MESSAGE,
  resolvePlaceLookupDataFromBody,
} from './shared.js'

const getSuccessStatusCode = (status: 'created' | 'merged' | 'updated') =>
  status === 'created' ? 201 : 200

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

  const rateLimitResult = checkUserScopedRateLimit({
    scope: 'place-entry',
    key: requestContext.authSession.user.id,
    limit: PLACE_SUBMISSION_RATE_LIMIT.limit,
    windowMs: PLACE_SUBMISSION_RATE_LIMIT.windowMs,
  })
  if (!rateLimitResult.allowed) {
    logPlaceEntryFailure({
      code: 'rate_limited',
      details: {
        retry_after_seconds: rateLimitResult.retryAfterSeconds,
        user_id: requestContext.authSession.user.id,
      },
    })
    res.status(429).json({
      error: {
        code: 'rate_limited',
        message: PLACE_SUBMISSION_RATE_LIMIT_MESSAGE,
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      },
    })
    return
  }

  try {
    const lookupResult = await resolvePlaceLookupDataFromBody(req.body)
    if (lookupResult.status === 'error') {
      res.status(422).json(lookupResult)
      return
    }

    const result = await createPlaceSubmission({
      userId: requestContext.authSession.user.id,
      draft: getPlaceRegistrationDraftFromBody(req.body),
      lookupData: lookupResult.data,
    })

    if (result.status === 'error') {
      res.status(422).json({
        error: {
          code: 'place_save_failed',
          message: result.message,
        },
      })
      return
    }

  if (result.status === 'confirm_required') {
    res.status(409).json({
      ...result,
      submissionId: result.submission.id,
    })
    return
  }

    res.status(getSuccessStatusCode(result.status)).json(result)
  } catch (error) {
    logPlaceEntryFailure({
      code: 'internal_error',
      details: {
        error_message: error instanceof Error ? error.message : 'unknown_error',
      },
    })
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: GENERIC_PLACE_SUBMISSION_ERROR_MESSAGE,
      },
    })
  }
}
