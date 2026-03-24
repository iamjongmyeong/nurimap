import type { VercelRequest, VercelResponse } from '@vercel/node'

import { APP_CSRF_HEADER_NAME, readSessionIdFromCookieHeader } from '../_lib/_appSessionService.js'
import { getAuthenticatedSession } from '../_lib/_authService.js'

const setNoStoreHeaders = (res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setNoStoreHeaders(res)

  if (req.method !== 'GET') {
    res.status(405).json({ error: { code: 'method_not_allowed', message: 'Method not allowed' } })
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
