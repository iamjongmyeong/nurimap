import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('server Sentry runtime helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.PUBLIC_SENTRY_DSN
    delete process.env.SENTRY_DSN
    delete process.env.SENTRY_ENVIRONMENT
    delete process.env.SENTRY_RELEASE
    delete process.env.SENTRY_RELEASE_SOURCE
    delete process.env.VERCEL_GIT_COMMIT_SHA
    process.env.NODE_ENV = 'test'
  })

  it('falls back to PUBLIC_SENTRY_DSN and sourced release env when enabled for production', async () => {
    process.env.NODE_ENV = 'production'
    process.env.PUBLIC_SENTRY_DSN = 'https://public@example.ingest.sentry.io/123'
    process.env.SENTRY_ENVIRONMENT = 'production'
    process.env.SENTRY_RELEASE_SOURCE = 'VERCEL_GIT_COMMIT_SHA'
    process.env.VERCEL_GIT_COMMIT_SHA = 'abc123'

    const { isServerSentryEnabled, resolveServerSentryRelease } = await import('./sentry')

    expect(isServerSentryEnabled()).toBe(true)
    expect(resolveServerSentryRelease()).toBe('abc123')
  })

  it('prefers explicit SENTRY_RELEASE when present', async () => {
    process.env.SENTRY_RELEASE = 'manual-release'
    process.env.SENTRY_RELEASE_SOURCE = 'VERCEL_GIT_COMMIT_SHA'
    process.env.VERCEL_GIT_COMMIT_SHA = 'abc123'

    const { resolveServerSentryRelease } = await import('./sentry')

    expect(resolveServerSentryRelease()).toBe('manual-release')
  })
})
