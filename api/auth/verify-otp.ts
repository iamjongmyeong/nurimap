import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  APP_CSRF_HEADER_NAME,
  serializeAppSessionCookie,
  serializeCsrfCookie,
} from '../../src/server-core/auth/appSessionService.js'
import { verifyLoginOtp } from '../../src/server-core/auth/authService.js'
import { getRequestRuntimeOrigin } from '../../src/server-core/http/requestOrigin.js'

const isSecureRequest = (req: VercelRequest) =>
  process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method_not_allowed', message: 'Method not allowed' } })
    return
  }

  const email = typeof req.body?.email === 'string' ? req.body.email : ''
  const token = typeof req.body?.token === 'string' ? req.body.token : ''
  // Compatibility-only bypass adoption: canonical OTP verify uses `{ email, token }`,
  // while local bypass still adopts a provider session via token-hash fields.
  const tokenHash = typeof req.body?.tokenHash === 'string' ? req.body.tokenHash : undefined
  const verificationType = req.body?.verificationType === 'magiclink'
    || req.body?.verificationType === 'signup'
    || req.body?.verificationType === 'invite'
    ? req.body.verificationType
    : undefined
  const runtimeOrigin = getRequestRuntimeOrigin(req.headers) ?? undefined

  const result = await verifyLoginOtp({ email, token, tokenHash, verificationType, runtimeOrigin })
  if (result.status === 'error') {
    res.status(400).json(result)
    return
  }

  const secure = isSecureRequest(req)
  res.setHeader('Set-Cookie', [
    serializeAppSessionCookie({
      sessionId: result.sessionId,
      secure,
    }),
    serializeCsrfCookie({
      csrfToken: result.csrfToken,
      secure,
    }),
  ])

  res.status(200).json({
    status: 'success',
    nextPhase: result.nextPhase,
    user: result.user,
    csrfHeaderName: APP_CSRF_HEADER_NAME,
  })
}
