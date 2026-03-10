import crypto from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const listUsersMock = vi.fn()
const generateLinkMock = vi.fn()
const updateUserByIdMock = vi.fn()
const getUserMock = vi.fn()
const fetchMock = vi.fn()

vi.mock('./supabaseAdmin.js', () => ({
  createSupabaseAdminClient: () => ({
    auth: {
      admin: {
        listUsers: listUsersMock,
        generateLink: generateLinkMock,
        updateUserById: updateUserByIdMock,
      },
    },
  }),
  createSupabaseBrowserlessClient: () => ({
    auth: {
      getUser: getUserMock,
    },
  }),
}))

import { requestLoginLink } from './authService'

const originalEnv = { ...process.env }

describe('allowlisted bypass auth request flow', () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    listUsersMock.mockReset()
    generateLinkMock.mockReset()
    updateUserByIdMock.mockReset()
    getUserMock.mockReset()
    fetchMock.mockReset()
    listUsersMock.mockResolvedValue({ data: { users: [] }, error: null })
    updateUserByIdMock.mockResolvedValue({ error: null })
    fetchMock.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('returns bypass success for an allowlisted external email when bypass is enabled', async () => {
    process.env.AUTH_BYPASS_ENABLED = 'true'
    process.env.AUTH_BYPASS_EMAILS = 'bypass.user@example.com'
    process.env.PUBLIC_APP_URL = 'https://nurimap.vercel.app'
    generateLinkMock.mockResolvedValue({
      data: {
        properties: {
          hashed_token: 'bypass-token-hash',
          verification_type: 'magiclink',
        },
      },
      error: null,
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await requestLoginLink('bypass.user@example.com')

    expect(result).toEqual({
      status: 'success',
      mode: 'bypass',
      message: '테스트 계정으로 바로 로그인합니다.',
      tokenHash: 'bypass-token-hash',
      verificationType: 'magiclink',
    })
    expect(listUsersMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      '[ops] auth.request_link.bypass_login',
      expect.objectContaining({ email: expect.stringContaining('@example.com') }),
    )
  })

  it('still blocks non-allowlisted external emails', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    process.env.AUTH_BYPASS_ENABLED = 'true'
    process.env.AUTH_BYPASS_EMAILS = 'bypass.user@example.com'

    const result = await requestLoginLink('outside.user@example.com')

    expect(result).toEqual({
      status: 'error',
      code: 'invalid_domain',
      message: '누리미디어 구성원만 사용할 수 있어요.',
    })
  })

  it('does not bypass when bypass is disabled', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    process.env.AUTH_BYPASS_ENABLED = 'false'
    process.env.AUTH_BYPASS_EMAILS = 'bypass.user@example.com'

    const result = await requestLoginLink('bypass.user@example.com')

    expect(result).toEqual({
      status: 'error',
      code: 'invalid_domain',
      message: '누리미디어 구성원만 사용할 수 있어요.',
    })
  })

  it('sends the Sprint 12 email template with the app wrapper login URL', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    process.env.PUBLIC_APP_URL = 'https://nurimap.vercel.app'
    process.env.RESEND_API_KEY = 'resend-test-key'
    process.env.RESEND_FROM_EMAIL = 'login@nurimap.app'

    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000000')
    generateLinkMock.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          user_metadata: {},
        },
        properties: {
          hashed_token: 'magic-hash',
          verification_type: 'magiclink',
        },
      },
      error: null,
    })

    const result = await requestLoginLink('tester@nurimedia.co.kr')

    expect(result).toEqual({
      status: 'success',
      mode: 'link',
      message: '로그인 링크를 보냈어요.',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(String(options.body)) as {
      subject: string
      html: string
      text: string
      to: string[]
    }
    const loginUrl = 'https://nurimap.vercel.app?auth_mode=verify&email=tester%40nurimedia.co.kr&nonce=00000000-0000-4000-8000-000000000000'

    expect(url).toBe('https://api.resend.com/emails')
    expect(payload.to).toEqual(['tester@nurimedia.co.kr'])
    expect(payload.subject).toBe('[NURIMAP] 로그인 링크')
    expect(payload.html).toContain('NURIMAP LOGIN')
    expect(payload.html).toContain('누리맵 로그인')
    expect(payload.html).not.toContain('누리맵에 로그인하려면 아래 버튼을 클릭해주세요 👇')
    expect(payload.html).toContain('버튼이 동작하지 않으면 아래 링크를 직접 열어주세요.')
    expect(payload.html).toContain('5분 동안만 유효합니다.')
    expect(payload.html).toContain(loginUrl)
    expect(payload.html).not.toContain('undefined')
    expect(payload.text).toContain('[NURIMAP] 로그인 링크')
    expect(payload.text).not.toContain('누리맵에 로그인하려면 아래 링크를 열어주세요.')
    expect(payload.text).toContain('5분 동안만 유효합니다.')
    expect(payload.text).toContain(loginUrl)
  })

  it('fails instead of sending an undefined login URL when PUBLIC_APP_URL is missing', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    process.env.PUBLIC_APP_URL = ''
    process.env.RESEND_API_KEY = 'resend-test-key'
    process.env.RESEND_FROM_EMAIL = 'login@nurimap.app'

    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000000')

    const result = await requestLoginLink('tester@nurimedia.co.kr')

    expect(result).toEqual({
      status: 'error',
      code: 'delivery_failed',
      message: '로그인 링크를 보내지 못했어요. 다시 시도해 주세요.',
    })
    expect(generateLinkMock).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
