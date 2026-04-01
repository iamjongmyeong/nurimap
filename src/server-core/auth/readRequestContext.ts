import type { VercelRequest } from '@vercel/node'

import { readSessionIdFromCookieHeader } from './appSessionService.js'
import { getAuthenticatedSession } from './authService.js'

type AuthenticatedSession = Extract<Awaited<ReturnType<typeof getAuthenticatedSession>>, { status: 'authenticated' }>

export type AnonymousOrAuthenticatedReadRequestContext =
  | {
      status: 'anonymous'
    }
  | {
      status: 'authenticated'
      authSession: AuthenticatedSession
      sessionId: string
    }

export const getAnonymousOrAuthenticatedReadRequestContext = async ({
  req,
}: {
  req: VercelRequest
}): Promise<AnonymousOrAuthenticatedReadRequestContext> => {
  const sessionId = readSessionIdFromCookieHeader(req.headers.cookie)
  if (!sessionId) {
    return { status: 'anonymous' }
  }

  const authSession = await getAuthenticatedSession(sessionId)
  if (authSession.status === 'missing') {
    return { status: 'anonymous' }
  }

  return {
    status: 'authenticated',
    authSession,
    sessionId,
  }
}
