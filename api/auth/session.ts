import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  APP_CSRF_HEADER_NAME,
  findActiveAppSessionById,
  isValidCsrfTokenPair,
  readCsrfTokenFromCookieHeader,
  readCsrfTokenFromHeaders,
  readSessionIdFromCookieHeader,
  serializeClearedAppSessionCookie,
  serializeClearedCsrfCookie,
} from '../../src/server-core/auth/appSessionService.js'
import {
  getAuthenticatedSession,
  signOutAppSession,
} from '../../src/server-core/auth/authService.js'
import { METHOD_NOT_ALLOWED_RESPONSE_BODY } from '../../src/server-core/auth/requestContext.js'
import { initServerSentry } from '../../src/server-core/runtime/sentry.js'

initServerSentry()

const setNoStoreHeaders = (res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
}

const isSecureRequest = (req: VercelRequest) =>
  process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setNoStoreHeaders(res)

  if (req.method !== 'GET' && req.method !== 'DELETE') {
    res.status(405).json(METHOD_NOT_ALLOWED_RESPONSE_BODY)
    return
  }

  if (req.method === 'DELETE') {
    const sessionId = readSessionIdFromCookieHeader(req.headers.cookie)
    const session = sessionId ? await findActiveAppSessionById({ sessionId }) : null

    if (session) {
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
    }

    await signOutAppSession(sessionId)

    const secure = isSecureRequest(req)
    res.setHeader('Set-Cookie', [
      serializeClearedAppSessionCookie({ secure }),
      serializeClearedCsrfCookie({ secure }),
    ])
    res.status(200).json({ status: 'success' })
    return
  }

  const sessionId = readSessionIdFromCookieHeader(req.headers.cookie)
  const result = await getAuthenticatedSession(sessionId)

  if (result.status === 'missing') {
    res.status(200).json({ status: 'missing' })
    return
  }

  res.status(200).json({
    status: 'authenticated',
    user: result.user,
    csrfHeaderName: APP_CSRF_HEADER_NAME,
  })
}
