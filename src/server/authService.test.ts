import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  listUsersMock,
  generateLinkMock,
  updateUserByIdMock,
  getUserMock,
  signInWithOtpMock,
  verifyOtpMock,
  adminSignOutMock,
  withDatabaseConnectionMock,
  withDatabaseTransactionMock,
  createAppSessionMock,
  createAppSessionTokensMock,
  findActiveAppSessionByIdMock,
  revokeAppSessionMock,
  touchAppSessionMock,
} = vi.hoisted(() => ({
  listUsersMock: vi.fn(),
  generateLinkMock: vi.fn(),
  updateUserByIdMock: vi.fn(),
  getUserMock: vi.fn(),
  signInWithOtpMock: vi.fn(),
  verifyOtpMock: vi.fn(),
  adminSignOutMock: vi.fn(),
  withDatabaseConnectionMock: vi.fn(),
  withDatabaseTransactionMock: vi.fn(),
  createAppSessionMock: vi.fn(),
  createAppSessionTokensMock: vi.fn(),
  findActiveAppSessionByIdMock: vi.fn(),
  revokeAppSessionMock: vi.fn(),
  touchAppSessionMock: vi.fn(),
}))

vi.mock('./supabaseAdmin.js', () => ({
  createSupabaseAdminClient: () => ({
    auth: {
      admin: {
        listUsers: listUsersMock,
        generateLink: generateLinkMock,
        updateUserById: updateUserByIdMock,
        signOut: adminSignOutMock,
      },
      getUser: getUserMock,
    },
  }),
  createSupabaseAuthClient: () => ({
    auth: {
      signInWithOtp: signInWithOtpMock,
      verifyOtp: verifyOtpMock,
    },
  }),
}))

vi.mock('./database.js', () => ({
  withDatabaseConnection: withDatabaseConnectionMock,
  withDatabaseTransaction: withDatabaseTransactionMock,
}))

vi.mock('./appSessionService.js', () => ({
  createAppSession: createAppSessionMock,
  createAppSessionTokens: createAppSessionTokensMock,
  findActiveAppSessionById: findActiveAppSessionByIdMock,
  revokeAppSession: revokeAppSessionMock,
  touchAppSession: touchAppSessionMock,
}))

import {
  getAuthenticatedSession,
  requestLoginOtp,
  saveAuthenticatedUserName,
  signOutAppSession,
  verifyLoginOtp,
} from './authService'

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
    verifyOtpMock.mockReset()
    adminSignOutMock.mockReset()
    withDatabaseConnectionMock.mockReset()
    withDatabaseTransactionMock.mockReset()
    createAppSessionMock.mockReset()
    createAppSessionTokensMock.mockReset()
    findActiveAppSessionByIdMock.mockReset()
    revokeAppSessionMock.mockReset()
    touchAppSessionMock.mockReset()
    listUsersMock.mockResolvedValue({ data: { users: [] }, error: null })
    updateUserByIdMock.mockResolvedValue({ error: null })
    signInWithOtpMock.mockResolvedValue({ data: { user: null, session: null }, error: null })
    verifyOtpMock.mockResolvedValue({ data: { user: null, session: null }, error: null })
    createAppSessionTokensMock.mockReturnValue({
      sessionId: 'session-123',
      csrfToken: 'csrf-123',
    })
    withDatabaseConnectionMock.mockImplementation(async (work: (client: unknown) => Promise<unknown>) =>
      work({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      }))
    withDatabaseTransactionMock.mockImplementation(async (work: (client: unknown) => Promise<unknown>) =>
      work({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      }))
    createAppSessionMock.mockResolvedValue({
      id: 'session-123',
      user_id: 'user-1',
      csrf_token_hash: 'hashed',
      expires_at: '2026-06-20T00:00:00.000Z',
      revoked_at: null,
      created_at: '2026-03-22T00:00:00.000Z',
      updated_at: '2026-03-22T00:00:00.000Z',
      last_seen_at: '2026-03-22T00:00:00.000Z',
    })
    findActiveAppSessionByIdMock.mockResolvedValue(null)
    revokeAppSessionMock.mockResolvedValue(null)
    touchAppSessionMock.mockResolvedValue(null)
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('returns bypass success for an allowlisted external email only on a local loopback runtime', async () => {
    process.env.AUTH_BYPASS_ENABLED = 'true'
    process.env.AUTH_BYPASS_EMAILS = 'bypass.user@example.com'
    process.env.PUBLIC_APP_URL = 'http://127.0.0.1:4173'
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

  it('hard-fails bypass-only requests outside a local loopback runtime even when the email is allowlisted', async () => {
    process.env.AUTH_BYPASS_ENABLED = 'true'
    process.env.AUTH_BYPASS_EMAILS = 'bypass.user@example.com'
    process.env.PUBLIC_APP_URL = 'https://nurimap.vercel.app'

    const result = await requestLoginOtp('bypass.user@example.com', { requireBypass: true })

    expect(result).toEqual({
      status: 'error',
      code: 'bypass_required',
      message: '로컬 auto-login을 사용하려면 bypass 계정과 서버 bypass 설정이 필요해요.',
    })
    expect(generateLinkMock).not.toHaveBeenCalled()
    expect(signInWithOtpMock).not.toHaveBeenCalled()
  })

  it('does not use bypass for an allowlisted external email outside a local loopback runtime', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    process.env.AUTH_BYPASS_ENABLED = 'true'
    process.env.AUTH_BYPASS_EMAILS = 'bypass.user@example.com'
    process.env.PUBLIC_APP_URL = 'https://nurimap.vercel.app'

    const result = await requestLoginOtp('bypass.user@example.com')

    expect(result).toEqual({
      status: 'error',
      code: 'invalid_domain',
      message: '누리미디어 구성원만 사용할 수 있어요.',
    })
    expect(generateLinkMock).not.toHaveBeenCalled()
    expect(signInWithOtpMock).not.toHaveBeenCalled()
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

  it('sends otp for an exact email allowlisted outside the configured domain', async () => {
    process.env.AUTH_ALLOWED_EMAIL_DOMAIN = 'nurimedia.co.kr'
    process.env.AUTH_ALLOWED_EMAILS = 'allowed.user@example.com'

    listUsersMock
      .mockResolvedValueOnce({ data: { users: [] }, error: null })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: 'user-allow-1',
              email: 'allowed.user@example.com',
              app_metadata: {},
              user_metadata: {},
            },
          ],
        },
        error: null,
      })

    const result = await requestLoginOtp('allowed.user@example.com')

    expect(result).toEqual({
      status: 'success',
      mode: 'otp',
      message: '인증 코드를 보냈어요.',
    })
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: 'allowed.user@example.com',
      options: {
        shouldCreateUser: true,
      },
    })
    expect(updateUserByIdMock).toHaveBeenCalledWith('user-allow-1', {
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

    const result = await requestLoginOtp('tester@nurimedia.co.kr')

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
                day_count: 3,
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

  it('verifies otp via backend and returns an opaque app session contract', async () => {
    verifyOtpMock.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'tester@nurimedia.co.kr',
          app_metadata: {
            nurimap_auth: {
              day_key: '2026-03-22',
              day_count: 1,
              last_requested_at: '2026-03-22T00:00:00.000Z',
              last_verified_at: null,
            },
          },
          user_metadata: { name: '테스트 사용자' },
        },
        session: {
          access_token: 'provider-access-token',
        },
      },
      error: null,
    })

    const result = await verifyLoginOtp({
      email: 'tester@nurimedia.co.kr',
      token: '123456',
    })

    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: 'tester@nurimedia.co.kr',
      token: '123456',
      type: 'email',
    })
    expect(createAppSessionMock).toHaveBeenCalled()
    expect(result).toEqual({
      status: 'success',
      csrfToken: 'csrf-123',
      sessionId: 'session-123',
      nextPhase: 'authenticated',
      user: {
        id: 'user-1',
        email: 'tester@nurimedia.co.kr',
        name: '테스트 사용자',
      },
    })
  })

  it('uses the verified user email when token-hash verify is called without an email body value', async () => {
    process.env.PUBLIC_APP_URL = 'http://127.0.0.1:4173'
    let recordedInsertParams: unknown[] | null = null
    verifyOtpMock.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'bypass.user@example.com',
          app_metadata: {
            nurimap_auth: {
              day_key: '2026-03-22',
              day_count: 1,
              last_requested_at: '2026-03-22T00:00:00.000Z',
              last_verified_at: null,
            },
          },
          user_metadata: {},
        },
        session: {
          access_token: 'provider-access-token',
        },
      },
      error: null,
    })
    withDatabaseTransactionMock.mockImplementation(async (work: (client: { query: ReturnType<typeof vi.fn> }) => Promise<unknown>) =>
      work({
        query: vi.fn(async (...args: unknown[]) => {
          recordedInsertParams = (args[1] as unknown[]) ?? null
          return { rows: [] }
        }),
      }))

    const result = await verifyLoginOtp({
      email: '',
      token: '',
      tokenHash: 'token-hash',
      verificationType: 'magiclink',
    })

    expect(result.status).toBe('success')
    expect(recordedInsertParams?.[1]).toBe('bypass.user@example.com')
  })

  it('rejects token-hash verification outside a local loopback runtime', async () => {
    process.env.PUBLIC_APP_URL = 'https://nurimap.vercel.app'

    await expect(verifyLoginOtp({
      email: '',
      token: '',
      tokenHash: 'token-hash',
      verificationType: 'magiclink',
    })).resolves.toEqual({
      status: 'error',
      message: '이 코드는 사용할 수 없어요.',
    })

    expect(verifyOtpMock).not.toHaveBeenCalled()
    expect(createAppSessionMock).not.toHaveBeenCalled()
  })

  it('returns a recoverable otp error when verification fails', async () => {
    verifyOtpMock.mockResolvedValue({
      data: {
        user: null,
        session: null,
      },
      error: {
        message: 'otp expired',
      },
    })

    await expect(verifyLoginOtp({
      email: 'tester@nurimedia.co.kr',
      token: '000000',
    })).resolves.toEqual({
      status: 'error',
      message: '이 코드는 사용할 수 없어요.',
    })
  })

  it('loads an authenticated session user from the opaque app session id', async () => {
    findActiveAppSessionByIdMock.mockResolvedValue({
      id: 'db-session-uuid',
      user_id: 'user-1',
      csrf_token_hash: 'hashed',
      expires_at: '2026-06-20T00:00:00.000Z',
      revoked_at: null,
      created_at: '2026-03-22T00:00:00.000Z',
      updated_at: '2026-03-22T00:00:00.000Z',
      last_seen_at: '2026-03-22T00:00:00.000Z',
    })
    withDatabaseConnectionMock.mockImplementation(async (work: (client: { query: ReturnType<typeof vi.fn> }) => Promise<unknown>) =>
      work({
        query: vi.fn().mockResolvedValue({
          rows: [
            {
              id: 'user-1',
              email: 'tester@nurimedia.co.kr',
              name: '테스트 사용자',
            },
          ],
        }),
      }))

    await expect(getAuthenticatedSession('session-123')).resolves.toEqual({
      status: 'authenticated',
      sessionId: 'session-123',
      user: {
        id: 'user-1',
        email: 'tester@nurimedia.co.kr',
        name: '테스트 사용자',
      },
    })
    expect(touchAppSessionMock).toHaveBeenCalledWith({ sessionId: 'session-123' })
  })

  it('saves a validated display name through backend-owned profile logic', async () => {
    const result = await saveAuthenticatedUserName({
      userId: 'user-1',
      name: '홍길동',
    })

    expect(result).toEqual({
      status: 'success',
      name: '홍길동',
    })
    expect(updateUserByIdMock).toHaveBeenCalledWith('user-1', {
      user_metadata: {
        name: '홍길동',
      },
    })
  })

  it('revokes the opaque app session on sign out', async () => {
    await expect(signOutAppSession('session-123')).resolves.toEqual({
      status: 'success',
    })
    expect(revokeAppSessionMock).toHaveBeenCalledWith({
      sessionId: 'session-123',
    })
  })

  it('formats cooldown messages as 0분 SS초 when less than a minute remains', async () => {
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
                day_count: 3,
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
      message: '0분 42초 후에 다시 시도해주세요.',
      retryAfterSeconds: 42,
    })
    expect(signInWithOtpMock).not.toHaveBeenCalled()
  })

})
