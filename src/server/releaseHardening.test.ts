import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestLoginOtp } from './authService'
import { lookupPlaceFromRawUrl } from './placeLookupService'

const originalEnv = { ...process.env }

const collectClientFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      if (fullPath.includes(`${path.sep}server`) || fullPath.includes(`${path.sep}test`)) {
        return []
      }

      return collectClientFiles(fullPath)
    }

    return fullPath.match(/\.(ts|tsx)$/) ? [fullPath] : []
  })

describe('Plan 11 release hardening', () => {
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
})
