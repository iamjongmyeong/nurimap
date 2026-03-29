import type { VercelRequest, VercelResponse } from '@vercel/node'

import { requestLoginOtp } from '../../src/server-core/auth/authService.js'
import { getRequestRuntimeOrigin } from '../../src/server-core/http/requestOrigin.js'
import { initServerSentry } from '../../src/server-core/runtime/sentry.js'

initServerSentry()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method_not_allowed' } })
    return
  }

  const email = typeof req.body?.email === 'string' ? req.body.email : ''
  const requireBypass = req.body?.requireBypass === true
  const intent = req.body?.intent === 'status' ? 'status' : undefined
  const requestAttemptId = typeof req.body?.requestAttemptId === 'string'
    ? req.body.requestAttemptId
    : undefined
  const runtimeOrigin = getRequestRuntimeOrigin(req.headers) ?? undefined
  const result = await requestLoginOtp(email, {
    requireBypass,
    intent,
    requestAttemptId,
    runtimeOrigin,
  })

  if (result.status === 'error') {
    const statusCode = result.code === 'delivery_failed'
      ? 502
      : result.code === 'cooldown'
        ? 429
        : 400
    res.status(statusCode).json(result)
    return
  }

  res.status(200).json(result)
}
