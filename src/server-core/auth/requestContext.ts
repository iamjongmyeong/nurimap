import type { VercelRequest } from '@vercel/node'

import type { AppSessionRecord } from './appSessionService.js'
import {
  findActiveAppSessionById,
  isValidCsrfTokenPair,
  readCsrfTokenFromCookieHeader,
  readCsrfTokenFromHeaders,
  readSessionIdFromCookieHeader,
} from './appSessionService.js'
import { getAuthenticatedSession } from './authService.js'

export const METHOD_NOT_ALLOWED_RESPONSE_BODY = {
  error: {
    code: 'method_not_allowed',
    message: 'Method not allowed',
  },
} as const

export const UNAUTHORIZED_RESPONSE_BODY = {
  error: {
    code: 'unauthorized',
    message: 'Unauthorized',
  },
} as const

export const INVALID_CSRF_RESPONSE_BODY = {
  error: {
    code: 'csrf_invalid',
    message: 'Invalid CSRF token.',
  },
} as const

type AuthenticatedSession = Extract<Awaited<ReturnType<typeof getAuthenticatedSession>>, { status: 'authenticated' }>

type AuthenticatedRequestContext =
  | {
      status: 'authenticated'
      appSession: AppSessionRecord | null
      authSession: AuthenticatedSession
      sessionId: string
    }
  | {
      status: 'error'
      body: typeof UNAUTHORIZED_RESPONSE_BODY | typeof INVALID_CSRF_RESPONSE_BODY
      statusCode: 401 | 403
    }

type AnonymousOrAuthenticatedRequestContext =
  | {
      status: 'authenticated'
      authSession: AuthenticatedSession
      sessionId: string
    }
  | {
      status: 'anonymous'
    }

export const getAuthenticatedRequestContext = async ({
  req,
  requireCsrf = false,
}: {
  req: VercelRequest
  requireCsrf?: boolean
}): Promise<AuthenticatedRequestContext> => {
  const sessionId = readSessionIdFromCookieHeader(req.headers.cookie)
  if (!sessionId) {
    return {
      status: 'error',
      statusCode: 401,
      body: UNAUTHORIZED_RESPONSE_BODY,
    }
  }

  let appSession: AppSessionRecord | null = null

  if (requireCsrf) {
    appSession = await findActiveAppSessionById({ sessionId })
    if (!appSession) {
      return {
        status: 'error',
        statusCode: 401,
        body: UNAUTHORIZED_RESPONSE_BODY,
      }
    }

    const cookieCsrfToken = readCsrfTokenFromCookieHeader(req.headers.cookie)
    const headerCsrfToken = readCsrfTokenFromHeaders(req.headers)
    if (!isValidCsrfTokenPair({
      cookieToken: cookieCsrfToken,
      headerToken: headerCsrfToken,
      expectedHash: appSession.csrf_token_hash,
    })) {
      return {
        status: 'error',
        statusCode: 403,
        body: INVALID_CSRF_RESPONSE_BODY,
      }
    }
  }

  const authSession = await getAuthenticatedSession(sessionId)
  if (authSession.status === 'missing') {
    return {
      status: 'error',
      statusCode: 401,
      body: UNAUTHORIZED_RESPONSE_BODY,
    }
  }

  return {
    status: 'authenticated',
    appSession,
    authSession,
    sessionId,
  }
}

export const getAnonymousOrAuthenticatedRequestContext = async ({
  req,
}: {
  req: VercelRequest
}): Promise<AnonymousOrAuthenticatedRequestContext> => {
  const sessionId = readSessionIdFromCookieHeader(req.headers.cookie)
  if (!sessionId) {
    return {
      status: 'anonymous',
    }
  }

  const authSession = await getAuthenticatedSession(sessionId)
  if (authSession.status === 'missing') {
    return {
      status: 'anonymous',
    }
  }

  return {
    status: 'authenticated',
    authSession,
    sessionId,
  }
}
