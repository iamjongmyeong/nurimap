import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestLoginOtp } from '../server-core/auth/authService'
import { lookupPlaceFromRawUrl } from '../server-core/place/placeLookupService'

const originalEnv = { ...process.env }

const collectTsFiles = ({
  dir,
  excludedDirectories,
}: {
  dir: string
  excludedDirectories: string[]
}): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      const directoryName = path.basename(fullPath)
      if (excludedDirectories.includes(directoryName)) {
        return []
      }

      return collectTsFiles({
        dir: fullPath,
        excludedDirectories,
      })
    }

    return fullPath.match(/\.(ts|tsx)$/) && !fullPath.match(/\.test\.(ts|tsx)$/) ? [fullPath] : []
  })

const collectClientFiles = (dir: string) =>
  collectTsFiles({
    dir,
    excludedDirectories: ['server', 'server-core', 'test'],
  })

const collectRuntimeFiles = (dir: string) =>
  collectTsFiles({
    dir,
    excludedDirectories: ['test'],
  })

describe('release hardening', () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('ships a robots.txt that blocks all crawling', () => {
    const robots = readFileSync(path.resolve(process.cwd(), 'public/robots.txt'), 'utf8')

    expect(robots).toContain('User-agent: *')
    expect(robots).toContain('Disallow: /')
  })

  it('adds noindex and nofollow metadata to the root HTML', () => {
    const indexHtml = readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8')

    expect(indexHtml).toContain('name="robots"')
    expect(indexHtml).toContain('content="noindex, nofollow"')
  })

  it('applies an X-Robots-Tag header in Vercel config', () => {
    const vercelConfig = JSON.parse(readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
      headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>
    }

    const globalHeaderRule = vercelConfig.headers?.find((rule) => rule.source === '/(.*)')
    expect(globalHeaderRule).toBeDefined()
    expect(globalHeaderRule?.headers).toEqual(
      expect.arrayContaining([{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]),
    )
  })

  it('applies core browser security headers in Vercel config', () => {
    const vercelConfig = JSON.parse(readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
      headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>
    }

    const globalHeaderRule = vercelConfig.headers?.find((rule) => rule.source === '/(.*)')
    expect(globalHeaderRule?.headers).toEqual(expect.arrayContaining([
      { key: 'Content-Security-Policy', value: expect.stringContaining("default-src 'self'") },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Strict-Transport-Security', value: expect.stringContaining('max-age=31536000') },
    ]))
  })

  it('preserves the /auth/verify fallback rewrite in Vercel config', () => {
    const vercelConfig = JSON.parse(readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
      rewrites?: Array<{ source: string; destination: string }>
    }

    expect(vercelConfig.rewrites).toEqual(
      expect.arrayContaining([
        {
          source: '/auth/verify',
          destination: '/',
        },
      ]),
    )
  })

  it('does not reference sensitive server env vars from client code', () => {
    const clientFiles = collectClientFiles(path.resolve(process.cwd(), 'src'))
    const forbiddenEnvNames = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_SECRET_KEY',
      'SUPABASE_JWT_SECRET',
      'RESEND_API_KEY',
      'KAKAO_REST_API_KEY',
    ]

    for (const file of clientFiles) {
      const source = readFileSync(file, 'utf8')
      for (const envName of forbiddenEnvNames) {
        expect(source, `${path.relative(process.cwd(), file)} references ${envName}`).not.toContain(envName)
      }
    }
  })

  it('keeps runtime source free of recommendation implementation tokens', () => {
    const runtimeFiles = [
      ...collectRuntimeFiles(path.resolve(process.cwd(), 'src')),
      ...collectRuntimeFiles(path.resolve(process.cwd(), 'api')),
    ]
    const forbiddenRecommendationTokens = [
      'recommendation_toggle',
      'my_recommendation_active',
      'recommendation_count',
    ]

    for (const file of runtimeFiles) {
      const source = readFileSync(file, 'utf8')
      for (const token of forbiddenRecommendationTokens) {
        expect(source, `${path.relative(process.cwd(), file)} reintroduced ${token}`).not.toContain(token)
      }
    }
  })

  it('logs masked auth request failures', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await requestLoginOtp('user@example.com')

    expect(result.status).toBe('error')
    expect(warnSpy).toHaveBeenCalled()
    expect(JSON.stringify(warnSpy.mock.calls)).toContain('auth.request_link.invalid_domain')
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('user@example.com')
  })

  it('logs place lookup failures', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await lookupPlaceFromRawUrl('https://map.naver.com/p/entry/place/456789012')

    expect(result.status).toBe('error')
    expect(warnSpy).toHaveBeenCalled()
    expect(JSON.stringify(warnSpy.mock.calls)).toContain('place_lookup.lookup_failed')
  })

  it('keeps deploy-guard scripts redacting auth token fields from saved API responses', () => {
    const realUserFlowScript = readFileSync(
      path.resolve(process.cwd(), 'scripts/qa/deploy-guard/run-playwright-real-user-flow.mjs'),
      'utf8',
    )
    const edgeUserActionsScript = readFileSync(
      path.resolve(process.cwd(), 'scripts/qa/deploy-guard/run-playwright-edge-user-actions.mjs'),
      'utf8',
    )

    for (const source of [realUserFlowScript, edgeUserActionsScript]) {
      expect(source).toContain('[REDACTED_TOKEN_HASH]')
      expect(source).toContain('[REDACTED_SESSION_ID]')
      expect(source).toContain('[REDACTED_CSRF_TOKEN]')
    }
  })
})
