export const DEFAULT_SENTRY_ENVIRONMENT = 'production'
export const DEFAULT_SENTRY_USER_FALLBACK = 'email_only' as const
export const SENTRY_BROWSER_RUNTIME_TAG = 'browser'
export const SENTRY_SERVER_RUNTIME_TAG = 'serverless'

export const SENTRY_IGNORED_HTTP_STATUSES = new Set([400, 401, 403, 404, 409, 422, 429])
export const SENTRY_IGNORED_ERROR_CODES = new Set([
  'csrf_invalid',
  'existing_review',
  'invalid_name',
  'invalid_url',
  'lookup_failed',
  'not_found',
  'place_id_extraction_failed',
  'place_save_failed',
  'rate_limited',
  'review_save_failed',
  'unauthorized',
])
export const SENTRY_IGNORED_ERROR_MESSAGES = [
  'Failed to fetch',
  'Load failed',
  'NetworkError',
  'Network request failed',
  'The operation was aborted',
  'The user aborted a request',
  '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
]
export const SENTRY_IGNORED_EXCEPTION_TYPES = new Set(['AbortError'])

type SentryUserInput = {
  email?: string | null
  name?: string | null
}

type ErrorLikeShape = {
  code?: unknown
  error?: {
    code?: unknown
    message?: unknown
    status?: unknown
  }
  message?: unknown
  name?: unknown
  response?: {
    status?: unknown
    data?: {
      error?: {
        code?: unknown
        message?: unknown
      }
      status?: unknown
    }
    error?: {
      code?: unknown
      message?: unknown
    }
  }
  status?: unknown
}

const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export const resolveSentryEnvironment = (value: string | null | undefined) =>
  normalizeString(value) ?? DEFAULT_SENTRY_ENVIRONMENT

export const resolveSentryUser = ({
  email,
  name,
}: SentryUserInput) => {
  const normalizedEmail = normalizeString(email)
  if (!normalizedEmail) {
    return null
  }

  const normalizedName = normalizeString(name)
  if (normalizedName) {
    return {
      email: normalizedEmail,
      username: normalizedName,
    }
  }

  return {
    email: normalizedEmail,
  }
}

export const extractErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null
  }

  const candidate = error as ErrorLikeShape
  return normalizeString(candidate.code)
    ?? normalizeString(candidate.error?.code)
    ?? normalizeString(candidate.response?.error?.code)
    ?? normalizeString(candidate.response?.data?.error?.code)
}

export const extractErrorStatus = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') {
    return null
  }

  const candidate = error as ErrorLikeShape
  const possibleValues = [
    candidate.status,
    candidate.error?.status,
    candidate.response?.status,
  ]

  for (const value of possibleValues) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return null
}

export const extractErrorMessage = (error: unknown): string | null => {
  if (error instanceof Error) {
    return normalizeString(error.message)
  }

  if (!error || typeof error !== 'object') {
    return null
  }

  const candidate = error as ErrorLikeShape
  return normalizeString(candidate.message)
    ?? normalizeString(candidate.error?.message)
    ?? normalizeString(candidate.response?.error?.message)
    ?? normalizeString(candidate.response?.data?.error?.message)
}

export const extractErrorType = (error: unknown): string | null => {
  if (error instanceof Error) {
    return normalizeString(error.name)
  }

  if (!error || typeof error !== 'object') {
    return null
  }

  const candidate = error as ErrorLikeShape
  return normalizeString(candidate.name)
}

const extractEventExceptionValue = (event: unknown) => {
  if (!event || typeof event !== 'object') {
    return null
  }

  const candidate = event as {
    exception?: {
      values?: Array<{
        type?: string
        value?: string
      }>
    }
    message?: string
  }

  const firstException = candidate.exception?.values?.[0]
  return {
    type: normalizeString(firstException?.type),
    value: normalizeString(firstException?.value) ?? normalizeString(candidate.message),
  }
}

export const shouldIgnoreSentryError = ({
  code,
  message,
  status,
  type,
}: {
  code?: string | null
  message?: string | null
  status?: number | null
  type?: string | null
}) => {
  if (typeof status === 'number' && SENTRY_IGNORED_HTTP_STATUSES.has(status)) {
    return true
  }

  if (code && SENTRY_IGNORED_ERROR_CODES.has(code)) {
    return true
  }

  if (type && SENTRY_IGNORED_EXCEPTION_TYPES.has(type)) {
    return true
  }

  if (!message) {
    return false
  }

  return SENTRY_IGNORED_ERROR_MESSAGES.some((ignoredMessage) =>
    message.includes(ignoredMessage))
}

export const shouldDropSentryEvent = ({
  event,
  originalException,
}: {
  event: unknown
  originalException?: unknown
}) => {
  const eventSummary = extractEventExceptionValue(event)

  return shouldIgnoreSentryError({
    code: extractErrorCode(originalException),
    message: eventSummary?.value ?? extractErrorMessage(originalException),
    status: extractErrorStatus(originalException),
    type: eventSummary?.type ?? extractErrorType(originalException),
  })
}
