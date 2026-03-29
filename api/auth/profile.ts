import type { VercelRequest, VercelResponse } from '@vercel/node'

import { saveAuthenticatedUserName } from '../../src/server-core/auth/authService.js'
import {
  getAuthenticatedRequestContext,
  METHOD_NOT_ALLOWED_RESPONSE_BODY,
} from '../../src/server-core/auth/requestContext.js'
import { captureServerException, initServerSentry } from '../../src/server-core/runtime/sentry.js'

initServerSentry()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
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

  const name = typeof req.body?.name === 'string' ? req.body.name : ''

  try {
    const result = await saveAuthenticatedUserName({
      userId: requestContext.authSession.user.id,
      name,
    })

    res.status(200).json({
      status: 'success',
      name: result.name,
    })
  } catch (error) {
    const isValidationError = error instanceof Error && error.message === 'Name is invalid.'
    if (!isValidationError) {
      await captureServerException({
        error,
        req,
        route: '/api/auth/profile',
        user: requestContext.authSession.user,
      })
    }
    res.status(isValidationError ? 422 : 500).json({
      error: {
        code: isValidationError ? 'invalid_name' : 'internal_error',
        message: isValidationError ? '이름을 다시 확인해 주세요.' : '이름을 저장하지 못했어요. 다시 시도해 주세요.',
      },
    })
  }
}
