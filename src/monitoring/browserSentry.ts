import * as Sentry from '@sentry/react'
import {
  DEFAULT_SENTRY_ENVIRONMENT,
  SENTRY_BROWSER_RUNTIME_TAG,
  SENTRY_IGNORED_ERROR_MESSAGES,
  resolveSentryEnvironment,
  resolveSentryUser,
  shouldDropSentryEvent,
} from './sentryShared'

let browserSentryInitialized = false

const readBrowserSentryDsn = () => {
  const value = import.meta.env.PUBLIC_SENTRY_DSN?.trim()
  return value ? value : null
}

const readBrowserSentryRelease = () => {
  const value = globalThis.__NURIMAP_SENTRY_RELEASE__
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

const readBrowserSentryEnvironment = () =>
  resolveSentryEnvironment(globalThis.__NURIMAP_SENTRY_ENVIRONMENT__ ?? DEFAULT_SENTRY_ENVIRONMENT)

export const isBrowserSentryEnabled = () =>
  (import.meta.env.PROD || import.meta.env.MODE === 'production')
  && readBrowserSentryEnvironment() === DEFAULT_SENTRY_ENVIRONMENT
  && Boolean(readBrowserSentryDsn())

export const initBrowserSentry = () => {
  if (browserSentryInitialized || !isBrowserSentryEnabled()) {
    return false
  }

  Sentry.init({
    dsn: readBrowserSentryDsn() ?? undefined,
    enabled: true,
    environment: readBrowserSentryEnvironment(),
    release: readBrowserSentryRelease(),
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
        runtime: SENTRY_BROWSER_RUNTIME_TAG,
      }

      return event
    },
  })

  Sentry.setTag('runtime', SENTRY_BROWSER_RUNTIME_TAG)
  browserSentryInitialized = true
  return true
}

export const syncBrowserSentryUser = ({
  email,
  name,
}: {
  email?: string | null
  name?: string | null
}) => {
  if (!browserSentryInitialized) {
    return
  }

  Sentry.setUser(resolveSentryUser({ email, name }))
}

export const clearBrowserSentryUser = () => {
  if (!browserSentryInitialized) {
    return
  }

  Sentry.setUser(null)
}
