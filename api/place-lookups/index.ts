import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  getAuthenticatedRequestContext,
  METHOD_NOT_ALLOWED_RESPONSE_BODY,
} from '../../src/server-core/auth/requestContext.js'
import { checkUserScopedRateLimit } from '../../src/server-core/http/requestRateLimit.js'
import { lookupPlaceFromRawUrl } from '../../src/server-core/place/placeLookupService.js'
import { logPlaceLookupFailure } from '../../src/server-core/runtime/opsLogger.js'
import { NAVER_URL_ERROR_MESSAGE } from '../../src/shared/naverUrl.js'

const PLACE_LOOKUP_RATE_LIMIT_MESSAGE = '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'
const PLACE_LOOKUP_RATE_LIMIT = {
  limit: 12,
  windowMs: 60_000,
} as const

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
    scope: 'place-lookup',
    key: requestContext.authSession.user.id,
    limit: PLACE_LOOKUP_RATE_LIMIT.limit,
    windowMs: PLACE_LOOKUP_RATE_LIMIT.windowMs,
  })
  if (!rateLimitResult.allowed) {
    logPlaceLookupFailure({
      code: 'rate_limited',
      rawUrl: typeof req.body?.rawUrl === 'string' ? req.body.rawUrl : '',
    })
    res.status(429).json({
      error: {
        code: 'rate_limited',
        message: PLACE_LOOKUP_RATE_LIMIT_MESSAGE,
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      },
    })
    return
  }

  const rawUrl = typeof req.body?.rawUrl === 'string' ? req.body.rawUrl : ''

  try {
    const result = await lookupPlaceFromRawUrl(rawUrl)
    if (result.status === 'error') {
      const statusCode = new Set(['invalid_url', 'place_id_extraction_failed']).has(result.error.code)
        ? 400
        : 502
      res.status(statusCode).json(result)
      return
    }

    res.status(200).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : NAVER_URL_ERROR_MESSAGE
    res.status(400).json({
      status: 'error',
      error: {
        code: 'lookup_failed',
        message,
      },
    })
  }
}
