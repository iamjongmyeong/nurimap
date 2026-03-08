import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const listUsersMock = vi.fn()
const generateLinkMock = vi.fn()
const updateUserByIdMock = vi.fn()
const getUserMock = vi.fn()

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
    listUsersMock.mockReset()
    generateLinkMock.mockReset()
    updateUserByIdMock.mockReset()
    getUserMock.mockReset()
    listUsersMock.mockResolvedValue({ data: { users: [] }, error: null })
    updateUserByIdMock.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    process.env = { ...originalEnv }
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
      message: '허용된 회사 이메일만 사용할 수 있어요.',
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
      message: '허용된 회사 이메일만 사용할 수 있어요.',
    })
  })
})
