import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  sentryInitMock,
  sentrySetTagMock,
  sentrySetUserMock,
} = vi.hoisted(() => ({
  sentryInitMock: vi.fn(),
  sentrySetTagMock: vi.fn(),
  sentrySetUserMock: vi.fn(),
}))

vi.mock('@sentry/react', () => ({
  init: sentryInitMock,
  setTag: sentrySetTagMock,
  setUser: sentrySetUserMock,
}))

describe('browser Sentry helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    globalThis.__NURIMAP_SENTRY_RELEASE__ = 'test-release'
    globalThis.__NURIMAP_SENTRY_ENVIRONMENT__ = 'production'
  })

  it('initializes browser Sentry only for production builds with a DSN', async () => {
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('PUBLIC_SENTRY_DSN', 'https://public@example.ingest.sentry.io/123')

    const { initBrowserSentry } = await import('./browserSentry')

    expect(initBrowserSentry()).toBe(true)
    expect(sentryInitMock).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://public@example.ingest.sentry.io/123',
      environment: 'production',
      release: 'test-release',
      sendDefaultPii: false,
    }))
    expect(sentrySetTagMock).toHaveBeenCalledWith('runtime', 'browser')
  })

  it('does not initialize outside production builds', async () => {
    vi.stubEnv('MODE', 'test')
    vi.stubEnv('PUBLIC_SENTRY_DSN', 'https://public@example.ingest.sentry.io/123')

    const { initBrowserSentry } = await import('./browserSentry')

    expect(initBrowserSentry()).toBe(false)
    expect(sentryInitMock).not.toHaveBeenCalled()
  })

  it('syncs email + name into email + username user context', async () => {
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('PUBLIC_SENTRY_DSN', 'https://public@example.ingest.sentry.io/123')

    const { initBrowserSentry, syncBrowserSentryUser } = await import('./browserSentry')

    initBrowserSentry()
    syncBrowserSentryUser({
      email: 'tester@nurimedia.co.kr',
      name: '테스트 사용자',
    })

    expect(sentrySetUserMock).toHaveBeenLastCalledWith({
      email: 'tester@nurimedia.co.kr',
      username: '테스트 사용자',
    })
  })

  it('applies email_only fallback when name is missing', async () => {
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('PUBLIC_SENTRY_DSN', 'https://public@example.ingest.sentry.io/123')

    const { initBrowserSentry, syncBrowserSentryUser } = await import('./browserSentry')

    initBrowserSentry()
    syncBrowserSentryUser({
      email: 'tester@nurimedia.co.kr',
      name: null,
    })

    expect(sentrySetUserMock).toHaveBeenLastCalledWith({
      email: 'tester@nurimedia.co.kr',
    })
  })

  it('drops known browser noise in beforeSend', async () => {
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('PUBLIC_SENTRY_DSN', 'https://public@example.ingest.sentry.io/123')

    const { initBrowserSentry } = await import('./browserSentry')

    initBrowserSentry()

    const initOptions = sentryInitMock.mock.calls[0]?.[0]
    const beforeSend = initOptions?.beforeSend as ((event: Record<string, unknown>, hint: { originalException?: unknown }) => unknown)

    const result = beforeSend({
      message: 'Failed to fetch',
    }, {
      originalException: new Error('Failed to fetch'),
    })

    expect(result).toBeNull()
  })

  it('keeps actionable browser errors and tags them as browser runtime', async () => {
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('PUBLIC_SENTRY_DSN', 'https://public@example.ingest.sentry.io/123')

    const { initBrowserSentry } = await import('./browserSentry')

    initBrowserSentry()

    const initOptions = sentryInitMock.mock.calls[0]?.[0]
    const beforeSend = initOptions?.beforeSend as ((event: Record<string, unknown>, hint: { originalException?: unknown }) => Record<string, unknown>)

    const event = {
      message: 'Unexpected runtime failure',
    }

    const result = beforeSend(event, {
      originalException: new Error('Unexpected runtime failure'),
    })

    expect(result).toEqual({
      message: 'Unexpected runtime failure',
      tags: {
        runtime: 'browser',
      },
    })
  })
})
