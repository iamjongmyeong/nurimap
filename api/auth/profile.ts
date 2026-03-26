import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  findActiveAppSessionById,
  isValidCsrfTokenPair,
  readCsrfTokenFromCookieHeader,
  readCsrfTokenFromHeaders,
  readSessionIdFromCookieHeader,
} from '../../src/server-core/auth/appSessionService.js'
import { getAuthenticatedSession, saveAuthenticatedUserName } from '../../src/server-core/auth/authService.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method_not_allowed', message: 'Method not allowed' } })
    return
  }

  const sessionId = readSessionIdFromCookieHeader(req.headers.cookie)
  const session = sessionId ? await findActiveAppSessionById({ sessionId }) : null
  if (!sessionId || !session) {
    res.status(401).json({
      error: {
        code: 'unauthorized',
        message: 'Unauthorized',
      },
    })
    return
  }

  const cookieCsrfToken = readCsrfTokenFromCookieHeader(req.headers.cookie)
  const headerCsrfToken = readCsrfTokenFromHeaders(req.headers)
  if (!isValidCsrfTokenPair({
    cookieToken: cookieCsrfToken,
    headerToken: headerCsrfToken,
    expectedHash: session.csrf_token_hash,
  })) {
    res.status(403).json({
      error: {
        code: 'csrf_invalid',
        message: 'Invalid CSRF token.',
      },
    })
    return
  }

  const authSession = await getAuthenticatedSession(sessionId)
  if (authSession.status === 'missing') {
    res.status(401).json({
      error: {
        code: 'unauthorized',
        message: 'Unauthorized',
      },
    })
    return
  }

  const name = typeof req.body?.name === 'string' ? req.body.name : ''

  try {
    const result = await saveAuthenticatedUserName({
      userId: authSession.user.id,
      name,
    })

    res.status(200).json({
      status: 'success',
      name: result.name,
    })
  } catch (error) {
    const isValidationError = error instanceof Error && error.message === 'Name is invalid.'
    res.status(isValidationError ? 422 : 500).json({
      error: {
        code: isValidationError ? 'invalid_name' : 'internal_error',
        message: isValidationError ? '이름을 다시 확인해 주세요.' : '이름을 저장하지 못했어요. 다시 시도해 주세요.',
      },
    })
  }
}
