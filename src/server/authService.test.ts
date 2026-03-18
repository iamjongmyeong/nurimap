import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const listUsersMock = vi.fn()
const generateLinkMock = vi.fn()
const updateUserByIdMock = vi.fn()
const getUserMock = vi.fn()
const signInWithOtpMock = vi.fn()

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
      signInWithOtp: signInWithOtpMock,
    },
  }),
}))

import { consumeLoginLink, requestLoginLink, requestLoginOtp, verifyLoginLink } from './authService'

const originalEnv = { ...process.env }

describe('Sprint 18 otp auth request flow', () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
    listUsersMock.mockReset()
    generateLinkMock.mockReset()
    updateUserByIdMock.mockReset()
    getUserMock.mockReset()
    signInWithOtpMock.mockReset()
    listUsersMock.mockResolvedValue({ data: { users: [] }, error: null })
    updateUserByIdMock.mockResolvedValue({ error: null })
    signInWithOtpMock.mockResolvedValue({ data: { user: null, session: null }, error: null })
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

    const result = await requestLoginOtp('bypass.user@example.com', { requireBypass: true })

    expect(result).toEqual({
      status: 'success',
      mode: 'bypass',
      message: '테스트 계정으로 바로 로그인합니다.',
      tokenHash: 'bypass-token-hash',
      verificationType: 'magiclink',
    })
    expect(listUsersMock).not.toHaveBeenCalled()
    expect(signInWithOtpMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      '[ops] auth.request_link.bypass_login',
      expect.objectContaining({ email: expect.stringContaining('@example.com') }),
    )
  })

  it('still blocks non-allowlisted external emails', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    process.env.AUTH_BYPASS_ENABLED = 'true'
    process.env.AUTH_BYPASS_EMAILS = 'bypass.user@example.com'

    const result = await requestLoginOtp('outside.user@example.com')

    expect(result).toEqual({
      status: 'error',
      code: 'invalid_domain',
      message: '누리미디어 구성원만 사용할 수 있어요.',
    })
  })

  it('fails closed before sending a normal otp when bypass-only mode is requested', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    process.env.PUBLIC_APP_URL = 'https://nurimap.vercel.app'

    const result = await requestLoginOtp('tester@nurimedia.co.kr', { requireBypass: true })

    expect(result).toEqual({
      status: 'error',
      code: 'bypass_required',
      message: '로컬 auto-login을 사용하려면 bypass 계정과 서버 bypass 설정이 필요해요.',
    })
    expect(generateLinkMock).not.toHaveBeenCalled()
    expect(signInWithOtpMock).not.toHaveBeenCalled()
  })

  it('does not bypass when bypass is disabled', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    process.env.AUTH_BYPASS_ENABLED = 'false'
    process.env.AUTH_BYPASS_EMAILS = 'bypass.user@example.com'

    const result = await requestLoginOtp('bypass.user@example.com')

    expect(result).toEqual({
      status: 'error',
      code: 'invalid_domain',
      message: '누리미디어 구성원만 사용할 수 있어요.',
    })
  })

  it('sends otp via supabase and persists otp-era bookkeeping only', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'

    listUsersMock.mockResolvedValue({
      data: {
        users: [
          {
            id: 'user-1',
            email: 'tester@nurimedia.co.kr',
            app_metadata: {
              nurimap_auth: {
                day_key: '2026-03-18',
                day_count: 2,
                last_requested_at: new Date(Date.now() - 10 * 1000).toISOString(),
                last_verified_at: '2026-03-07T10:00:00.000Z',
                active_nonce: 'legacy-nonce',
                active_token_hash: 'legacy-token',
              },
            },
            user_metadata: { name: 'Tester' },
          },
        ],
      },
      error: null,
    })

    const result = await requestLoginOtp('tester@nurimedia.co.kr')

    expect(result).toEqual({
      status: 'success',
      mode: 'otp',
      message: '인증 코드를 보냈어요.',
    })
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: 'tester@nurimedia.co.kr',
      options: {
        shouldCreateUser: true,
      },
    })
    expect(updateUserByIdMock).toHaveBeenCalledWith('user-1', {
      app_metadata: {
        nurimap_auth: {
          day_key: expect.any(String),
          day_count: 3,
          last_requested_at: expect.any(String),
          last_verified_at: '2026-03-07T10:00:00.000Z',
        },
      },
      user_metadata: { name: 'Tester' },
    })
  })

  it('persists otp bookkeeping after supabase provisions a new allowed-domain user', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'

    listUsersMock
      .mockResolvedValueOnce({ data: { users: [] }, error: null })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: 'user-2',
              email: 'new.user@nurimedia.co.kr',
              app_metadata: {},
              user_metadata: {},
            },
          ],
        },
        error: null,
      })

    const result = await requestLoginOtp('new.user@nurimedia.co.kr')

    expect(result).toEqual({
      status: 'success',
      mode: 'otp',
      message: '인증 코드를 보냈어요.',
    })
    expect(updateUserByIdMock).toHaveBeenCalledWith('user-2', {
      app_metadata: {
        nurimap_auth: {
          day_key: expect.any(String),
          day_count: 1,
          last_requested_at: expect.any(String),
          last_verified_at: null,
        },
      },
      user_metadata: {},
    })
  })

  it('logs request acceptance timings after otp delivery is accepted', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    listUsersMock.mockResolvedValue({
      data: {
        users: [
          {
            id: 'user-1',
            email: 'tester@nurimedia.co.kr',
            app_metadata: {},
            user_metadata: {},
          },
        ],
      },
      error: null,
    })
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const result = await requestLoginOtp('tester@nurimedia.co.kr')

    expect(result).toEqual({
      status: 'success',
      mode: 'otp',
      message: '인증 코드를 보냈어요.',
    })
    expect(infoSpy).toHaveBeenCalledWith(
      '[ops] auth.request_link.accepted',
      expect.objectContaining({
        email: expect.stringContaining('@nurimedia.co.kr'),
        provider_message_id: null,
        provider_status_code: 200,
        find_user_ms: expect.any(Number),
        generate_link_ms: expect.any(Number),
        persist_state_ms: expect.any(Number),
        send_email_ms: expect.any(Number),
        total_ms: expect.any(Number),
      }),
    )
  })

  it('logs supabase otp delivery failures', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    signInWithOtpMock.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        status: 503,
        code: 'otp_delivery_failed',
        message: 'SMTP unavailable',
      },
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await requestLoginOtp('tester@nurimedia.co.kr')

    expect(result).toEqual({
      status: 'error',
      code: 'delivery_failed',
      message: '인증 코드를 보내지 못했어요. 다시 시도해 주세요.',
    })
    expect(warnSpy).toHaveBeenCalledWith(
      '[ops] auth.request_link.delivery_failed',
      expect.objectContaining({
        email: expect.stringContaining('@nurimedia.co.kr'),
        failure_stage: 'send_otp',
        provider: 'supabase',
        provider_status_code: 503,
        provider_error_code: 'otp_delivery_failed',
        provider_error_message: 'SMTP unavailable',
        total_ms: expect.any(Number),
      }),
    )
  })

  it('no longer requires PUBLIC_APP_URL for normal otp requests', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    process.env.PUBLIC_APP_URL = ''
    listUsersMock.mockResolvedValue({
      data: {
        users: [
          {
            id: 'user-1',
            email: 'tester@nurimedia.co.kr',
            app_metadata: {},
            user_metadata: {},
          },
        ],
      },
      error: null,
    })

    const result = await requestLoginLink('tester@nurimedia.co.kr')

    expect(result).toEqual({
      status: 'success',
      mode: 'otp',
      message: '인증 코드를 보냈어요.',
    })
  })

  it('formats cooldown messages as MM분 SS초 when minutes remain', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'

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
                last_verified_at: null,
              },
            },
            user_metadata: {},
          },
        ],
      },
      error: null,
    })

    const result = await requestLoginOtp('tester@nurimedia.co.kr')

    expect(result).toEqual({
      status: 'error',
      code: 'cooldown',
      message: '1분 07초 후에 다시 시도해주세요.',
      retryAfterSeconds: 67,
    })
    expect(signInWithOtpMock).not.toHaveBeenCalled()
  })

  it('formats cooldown messages as SS초 when less than a minute remains', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'

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
                last_verified_at: null,
              },
            },
            user_metadata: {},
          },
        ],
      },
      error: null,
    })

    const result = await requestLoginOtp('tester@nurimedia.co.kr')

    expect(result).toEqual({
      status: 'error',
      code: 'cooldown',
      message: '42초 후에 다시 시도해주세요.',
      retryAfterSeconds: 42,
    })
    expect(signInWithOtpMock).not.toHaveBeenCalled()
  })

  it('returns an explicit legacy fallback for verify-link', async () => {
    const result = await verifyLoginLink({
      email: 'tester@nurimedia.co.kr',
      nonce: 'legacy-nonce',
    })

    expect(result).toEqual({
      status: 'error',
      reason: 'invalidated',
      message: '이 경로는 더 이상 로그인 확인에 사용되지 않아요. 새 인증 코드를 요청해 주세요.',
    })
    expect(updateUserByIdMock).not.toHaveBeenCalled()
  })

  it('returns an explicit legacy fallback for consume-link', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await consumeLoginLink({
      email: 'tester@nurimedia.co.kr',
      nonce: 'legacy-nonce',
    })

    expect(result).toEqual({
      status: 'error',
      reason: 'invalidated',
      message: '이 경로는 더 이상 로그인 확인에 사용되지 않아요. 새 인증 코드를 요청해 주세요.',
    })
    expect(updateUserByIdMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      '[ops] auth.consume_link.failed',
      expect.objectContaining({
        email: expect.stringContaining('@nurimedia.co.kr'),
        reason: 'invalidated',
      }),
    )
  })
})
