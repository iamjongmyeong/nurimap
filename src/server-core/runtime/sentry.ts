import type { VercelRequest } from '@vercel/node'
import * as Sentry from '@sentry/node'
import {
  DEFAULT_SENTRY_ENVIRONMENT,
  SENTRY_IGNORED_ERROR_MESSAGES,
  SENTRY_SERVER_RUNTIME_TAG,
  resolveSentryEnvironment,
  resolveSentryUser,
  shouldDropSentryEvent,
} from '../../monitoring/sentryShared.js'

let serverSentryInitialized = false

const readServerSentryDsn = () => {
  const value = (process.env.SENTRY_DSN ?? process.env.PUBLIC_SENTRY_DSN ?? '').trim()
  return value ? value : null
}

export const resolveServerSentryRelease = () => {
  const explicitRelease = (process.env.SENTRY_RELEASE ?? '').trim()
  if (explicitRelease) {
    return explicitRelease
  }

  const releaseSource = (process.env.SENTRY_RELEASE_SOURCE ?? '').trim()
  if (releaseSource) {
    const sourcedRelease = (process.env[releaseSource] ?? '').trim()
    if (sourcedRelease) {
      return sourcedRelease
    }
  }

  const vercelRelease = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').trim()
  return vercelRelease || undefined
}

export const isServerSentryEnabled = () =>
  process.env.NODE_ENV === 'production'
  && resolveSentryEnvironment(process.env.SENTRY_ENVIRONMENT) === DEFAULT_SENTRY_ENVIRONMENT
  && Boolean(readServerSentryDsn())

export const initServerSentry = () => {
  if (serverSentryInitialized || !isServerSentryEnabled()) {
    return false
  }

  Sentry.init({
    dsn: readServerSentryDsn() ?? undefined,
    enabled: true,
    environment: resolveSentryEnvironment(process.env.SENTRY_ENVIRONMENT),
    release: resolveServerSentryRelease(),
    ignoreErrors: SENTRY_IGNORED_ERROR_MESSAGES,
    sendDefaultPii: false,
    beforeSend(event, hint) {
      if (shouldDropSentryEvent({
        event,
        originalException: hint.originalException,
      })) {
        return null
      }

      event.tags = {
        ...event.tags,
        runtime: SENTRY_SERVER_RUNTIME_TAG,
      }

      return event
    },
  })

  Sentry.setTag('runtime', SENTRY_SERVER_RUNTIME_TAG)
  serverSentryInitialized = true
  return true
}

export const captureServerException = async ({
  error,
  req,
  route,
  user,
}: {
  error: unknown
  req: VercelRequest
  route: string
  user?: {
    email?: string | null
    id?: string | null
    name?: string | null
  } | null
}) => {
  initServerSentry()
  if (!isServerSentryEnabled()) {
    return null
  }

  Sentry.withScope((scope) => {
    scope.setTag('runtime', SENTRY_SERVER_RUNTIME_TAG)
    scope.setTag('route', route)
    scope.setTag('method', req.method ?? 'UNKNOWN')

    const sentryUser = resolveSentryUser({
      email: user?.email,
      name: user?.name,
    })
    if (sentryUser) {
      scope.setUser({
        ...sentryUser,
        id: user?.id ?? undefined,
      })
    }

    scope.setContext('request', {
      method: req.method ?? 'UNKNOWN',
      url: req.url ?? route,
    })

    Sentry.captureException(error)
  })

  await Sentry.flush(2_000)
  return true
}
