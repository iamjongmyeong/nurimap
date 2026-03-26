import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  findActiveAppSessionById,
  isValidCsrfTokenPair,
  readCsrfTokenFromCookieHeader,
  readCsrfTokenFromHeaders,
  readSessionIdFromCookieHeader,
  serializeClearedAppSessionCookie,
  serializeClearedCsrfCookie,
} from '../../src/server-core/auth/appSessionService.js'
import { signOutAppSession } from '../../src/server-core/auth/authService.js'

const isSecureRequest = (req: VercelRequest) =>
  process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method_not_allowed', message: 'Method not allowed' } })
    return
  }

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
}
