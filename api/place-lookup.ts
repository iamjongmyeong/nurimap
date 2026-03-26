import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  findActiveAppSessionById,
  isValidCsrfTokenPair,
  readCsrfTokenFromCookieHeader,
  readCsrfTokenFromHeaders,
  readSessionIdFromCookieHeader,
} from '../src/server-core/auth/appSessionService.js'
import { getAuthenticatedSession } from '../src/server-core/auth/authService.js'
import { lookupPlaceFromRawUrl } from '../src/server-core/place/placeLookupService.js'
import { NAVER_URL_ERROR_MESSAGE } from '../src/shared/naverUrl.js'
import { logPlaceLookupFailure } from '../src/server-core/runtime/opsLogger.js'
import { checkUserScopedRateLimit } from '../src/server-core/http/requestRateLimit.js'

const PLACE_LOOKUP_RATE_LIMIT_MESSAGE = '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'
const PLACE_LOOKUP_RATE_LIMIT = {
  limit: 12,
  windowMs: 60_000,
} as const

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method_not_allowed', message: 'Method not allowed' } })
    return
  }

  const sessionId = readSessionIdFromCookieHeader(req.headers.cookie)
  const session = sessionId ? await findActiveAppSessionById({ sessionId }) : null
  const cookieCsrfToken = readCsrfTokenFromCookieHeader(req.headers.cookie)
  const headerCsrfToken = readCsrfTokenFromHeaders(req.headers)

  if (!sessionId || !session) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Unauthorized' } })
    return
  }

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

  const rateLimitResult = checkUserScopedRateLimit({
    scope: 'place-lookup',
    key: authSession.user.id,
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
      res.status(result.error.code === 'lookup_failed' ? 502 : 422).json(result)
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
