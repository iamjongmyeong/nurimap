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

import { consumeLoginLink, requestLoginLink, verifyLoginLink } from './authService'

const originalEnv = { ...process.env }

const createFetchResponse = ({
  ok = true,
  status = 200,
  body = { id: 'resend-message-123' },
}: {
  ok?: boolean
  status?: number
  body?: unknown
} = {}) => ({
  ok,
  status,
  text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
})

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
    fetchMock.mockResolvedValue(createFetchResponse())
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

    const result = await requestLoginLink('bypass.user@example.com', { requireBypass: true })

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

  it('fails closed before sending a normal link when bypass-only mode is requested', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    process.env.PUBLIC_APP_URL = 'https://nurimap.vercel.app'
    process.env.RESEND_API_KEY = 'resend-test-key'
    process.env.RESEND_FROM_EMAIL = 'login@nurimap.app'

    const result = await requestLoginLink('tester@nurimedia.co.kr', { requireBypass: true })

    expect(result).toEqual({
      status: 'error',
      code: 'bypass_required',
      message: '로컬 auto-login을 사용하려면 bypass 계정과 서버 bypass 설정이 필요해요.',
    })
    expect(generateLinkMock).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
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
    const loginUrl = 'https://nurimap.vercel.app/auth/verify?email=tester%40nurimedia.co.kr&nonce=00000000-0000-4000-8000-000000000000'

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

  it('logs resend acceptance timings with the provider message id', async () => {
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
    fetchMock.mockResolvedValue(
      createFetchResponse({
        ok: true,
        status: 202,
        body: { id: 'resend-message-789' },
      }),
    )
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const result = await requestLoginLink('tester@nurimedia.co.kr')

    expect(result).toEqual({
      status: 'success',
      mode: 'link',
      message: '로그인 링크를 보냈어요.',
    })
    expect(infoSpy).toHaveBeenCalledWith(
      '[ops] auth.request_link.accepted',
      expect.objectContaining({
        email: expect.stringContaining('@nurimedia.co.kr'),
        provider: 'resend',
        provider_message_id: 'resend-message-789',
        provider_status_code: 202,
        find_user_ms: expect.any(Number),
        generate_link_ms: expect.any(Number),
        persist_state_ms: expect.any(Number),
        send_email_ms: expect.any(Number),
        total_ms: expect.any(Number),
      }),
    )
  })

  it('logs resend rejection details when delivery fails after link generation', async () => {
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
    fetchMock.mockResolvedValue(
      createFetchResponse({
        ok: false,
        status: 429,
        body: {
          name: 'rate_limit_exceeded',
          message: 'Daily provider limit reached',
        },
      }),
    )
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await requestLoginLink('tester@nurimedia.co.kr')

    expect(result).toEqual({
      status: 'error',
      code: 'delivery_failed',
      message: '로그인 링크를 보내지 못했어요. 다시 시도해 주세요.',
    })
    expect(warnSpy).toHaveBeenCalledWith(
      '[ops] auth.request_link.delivery_failed',
      expect.objectContaining({
        email: expect.stringContaining('@nurimedia.co.kr'),
        failure_stage: 'send_email',
        provider: 'resend',
        provider_status_code: 429,
        provider_error_code: 'rate_limit_exceeded',
        provider_error_message: 'Daily provider limit reached',
        total_ms: expect.any(Number),
      }),
    )
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

  it('formats cooldown messages as MM분 SS초 when minutes remain', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    process.env.PUBLIC_APP_URL = 'https://nurimap.vercel.app'

    listUsersMock.mockResolvedValue({
      data: {
        users: [
          {
            id: 'user-1',
            email: 'tester@nurimedia.co.kr',
            app_metadata: {
              nurimap_auth: {
                day_key: '2026-03-08',
                day_count: 5,
                last_requested_at: new Date(Date.now() - 233 * 1000).toISOString(),
                active_nonce: null,
                active_token_hash: null,
                active_verification_type: null,
                active_expires_at: null,
                last_consumed_nonce: null,
              },
            },
            user_metadata: {},
          },
        ],
      },
      error: null,
    })

    const result = await requestLoginLink('tester@nurimedia.co.kr')

    expect(result).toEqual({
      status: 'error',
      code: 'cooldown',
      message: '1분 07초 후에 다시 시도해주세요.',
      retryAfterSeconds: 67,
    })
    expect(generateLinkMock).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('formats cooldown messages as SS초 when less than a minute remains', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    process.env.PUBLIC_APP_URL = 'https://nurimap.vercel.app'

    listUsersMock.mockResolvedValue({
      data: {
        users: [
          {
            id: 'user-1',
            email: 'tester@nurimedia.co.kr',
            app_metadata: {
              nurimap_auth: {
                day_key: '2026-03-08',
                day_count: 5,
                last_requested_at: new Date(Date.now() - 258 * 1000).toISOString(),
                active_nonce: null,
                active_token_hash: null,
                active_verification_type: null,
                active_expires_at: null,
                last_consumed_nonce: null,
              },
            },
            user_metadata: {},
          },
        ],
      },
      error: null,
    })

    const result = await requestLoginLink('tester@nurimedia.co.kr')

    expect(result).toEqual({
      status: 'error',
      code: 'cooldown',
      message: '42초 후에 다시 시도해주세요.',
      retryAfterSeconds: 42,
    })
    expect(generateLinkMock).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not consume a fresh login nonce before session adoption succeeds', async () => {
    const loginState = {
      day_key: '',
      day_count: 0,
      last_requested_at: '2026-03-15T07:30:00.000Z',
      active_nonce: 'nonce-1',
      active_token_hash: 'token-hash-1',
      active_verification_type: 'magiclink',
      active_expires_at: '2099-03-15T07:35:00.000Z',
      last_consumed_nonce: null,
    }

    listUsersMock.mockResolvedValue({
      data: {
        users: [
          {
            id: 'user-1',
            email: 'tester@nurimedia.co.kr',
            app_metadata: {
              nurimap_auth: loginState,
            },
            user_metadata: {},
          },
        ],
      },
      error: null,
    })

    const firstResult = await verifyLoginLink({
      email: 'tester@nurimedia.co.kr',
      nonce: 'nonce-1',
    })
    const secondResult = await verifyLoginLink({
      email: 'tester@nurimedia.co.kr',
      nonce: 'nonce-1',
    })

    expect(firstResult).toEqual({
      status: 'success',
      tokenHash: 'token-hash-1',
      verificationType: 'magiclink',
    })
    expect(secondResult).toEqual(firstResult)
    expect(updateUserByIdMock).not.toHaveBeenCalled()
  })

  it('marks a login nonce as used only after consumption is finalized', async () => {
    const activeLoginState = {
      day_key: '',
      day_count: 0,
      last_requested_at: '2026-03-15T07:30:00.000Z',
      active_nonce: 'nonce-1',
      active_token_hash: 'token-hash-1',
      active_verification_type: 'magiclink',
      active_expires_at: '2099-03-15T07:35:00.000Z',
      last_consumed_nonce: null,
    }

    listUsersMock
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: 'user-1',
              email: 'tester@nurimedia.co.kr',
              app_metadata: {
                nurimap_auth: activeLoginState,
              },
              user_metadata: {},
            },
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: 'user-1',
              email: 'tester@nurimedia.co.kr',
              app_metadata: {
                nurimap_auth: {
                  ...activeLoginState,
                  active_nonce: null,
                  active_token_hash: null,
                  active_verification_type: null,
                  active_expires_at: null,
                  last_consumed_nonce: 'nonce-1',
                },
              },
              user_metadata: {},
            },
          ],
        },
        error: null,
      })

    const consumeResult = await consumeLoginLink({
      email: 'tester@nurimedia.co.kr',
      nonce: 'nonce-1',
    })
    const verifyResult = await verifyLoginLink({
      email: 'tester@nurimedia.co.kr',
      nonce: 'nonce-1',
    })

    expect(consumeResult).toEqual({
      status: 'success',
    })
    expect(updateUserByIdMock).toHaveBeenCalledWith('user-1', {
      app_metadata: {
        nurimap_auth: {
          ...activeLoginState,
          active_nonce: null,
          active_token_hash: null,
          active_verification_type: null,
          active_expires_at: null,
          last_consumed_nonce: 'nonce-1',
        },
      },
      user_metadata: {},
    })
    expect(verifyResult).toEqual({
      status: 'error',
      reason: 'used',
    })
  })
})
