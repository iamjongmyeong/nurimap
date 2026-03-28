import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  verifyLoginOtpMock,
  serializeAppSessionCookieMock,
  serializeCsrfCookieMock,
} = vi.hoisted(() => ({
  verifyLoginOtpMock: vi.fn(),
  serializeAppSessionCookieMock: vi.fn(),
  serializeCsrfCookieMock: vi.fn(),
}))

vi.mock('../server-core/auth/authService.js', () => ({
  verifyLoginOtp: verifyLoginOtpMock,
}))

vi.mock('../server-core/auth/appSessionService.js', () => ({
  APP_CSRF_HEADER_NAME: 'x-nurimap-csrf-token',
  serializeAppSessionCookie: serializeAppSessionCookieMock,
  serializeCsrfCookie: serializeCsrfCookieMock,
}))

import handler from '../../api/auth/verify-otp.js'

const createResponse = () => {
  const state: { body?: unknown; headers?: Record<string, unknown>; statusCode?: number } = {}
  const response = {
    setHeader: vi.fn((name: string, value: unknown) => {
      state.headers ??= {}
      state.headers[name] = value
      return response
    }),
    status: vi.fn((statusCode: number) => {
      state.statusCode = statusCode
      return response
    }),
    json: vi.fn((body: unknown) => {
      state.body = body
      return response
    }),
  }

  return {
    response: response as unknown as VercelResponse,
    state,
  }
}

describe('/api/auth/verify-otp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serializeAppSessionCookieMock.mockReturnValue('nurimap_session=session-123')
    serializeCsrfCookieMock.mockReturnValue('nurimap_csrf=csrf-123')
  })

  it('keeps verify-otp as a POST-only workflow endpoint', async () => {
    const { response, state } = createResponse()

    await handler({
      method: 'GET',
      headers: {},
      body: undefined,
    } as unknown as VercelRequest, response)

    expect(verifyLoginOtpMock).not.toHaveBeenCalled()
    expect(state.statusCode).toBe(405)
    expect(state.body).toEqual({
      error: {
        code: 'method_not_allowed',
        message: 'Method not allowed',
      },
    })
  })

  it('sets app session + csrf cookies on successful verify', async () => {
    verifyLoginOtpMock.mockResolvedValue({
      status: 'success',
      sessionId: 'session-123',
      csrfToken: 'csrf-123',
      nextPhase: 'authenticated',
      user: {
        id: 'user-1',
        email: 'tester@nurimedia.co.kr',
        name: '테스트 사용자',
      },
    })

    const request = {
      method: 'POST',
      headers: {
        origin: 'http://localhost:5173',
      },
      body: {
        email: 'tester@nurimedia.co.kr',
        token: '123456',
      },
    } as unknown as VercelRequest

    const { response, state } = createResponse()
    await handler(request, response)

    expect(verifyLoginOtpMock).toHaveBeenCalledWith({
      email: 'tester@nurimedia.co.kr',
      runtimeOrigin: 'http://localhost:5173',
      token: '123456',
    })
    expect(state.statusCode).toBe(200)
    expect(state.headers?.['Set-Cookie']).toEqual([
      'nurimap_session=session-123',
      'nurimap_csrf=csrf-123',
    ])
    expect(state.body).toEqual({
      status: 'success',
      nextPhase: 'authenticated',
      user: {
        id: 'user-1',
        email: 'tester@nurimedia.co.kr',
        name: '테스트 사용자',
      },
      csrfHeaderName: 'x-nurimap-csrf-token',
    })
  })

  it('passes tokenHash + verificationType through for local bypass compatibility', async () => {
    verifyLoginOtpMock.mockResolvedValue({
      status: 'success',
      sessionId: 'session-123',
      csrfToken: 'csrf-123',
      nextPhase: 'authenticated',
      user: {
        id: 'user-1',
        email: 'bypass.user@example.com',
        name: '테스트 사용자',
      },
    })

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {
        origin: 'http://localhost:5173',
      },
      body: {
        email: 'bypass.user@example.com',
        token: '',
        tokenHash: 'token-hash',
        verificationType: 'magiclink',
      },
    } as unknown as VercelRequest, response)

    expect(verifyLoginOtpMock).toHaveBeenCalledWith({
      email: 'bypass.user@example.com',
      runtimeOrigin: 'http://localhost:5173',
      token: '',
      tokenHash: 'token-hash',
      verificationType: 'magiclink',
    })
    expect(state.statusCode).toBe(200)
  })

  it('derives a private-lan runtimeOrigin from forwarded host headers during verify', async () => {
    verifyLoginOtpMock.mockResolvedValue({
      status: 'success',
      sessionId: 'session-123',
      csrfToken: 'csrf-123',
      nextPhase: 'authenticated',
      user: {
        id: 'user-1',
        email: 'tester@nurimedia.co.kr',
        name: '테스트 사용자',
      },
    })

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {
        'x-forwarded-host': '192.168.0.24:5173',
        'x-forwarded-proto': 'http',
      },
      body: {
        email: 'tester@nurimedia.co.kr',
        token: '123456',
      },
    } as unknown as VercelRequest, response)

    expect(verifyLoginOtpMock).toHaveBeenCalledWith({
      email: 'tester@nurimedia.co.kr',
      runtimeOrigin: 'http://192.168.0.24:5173',
      token: '123456',
    })
    expect(state.statusCode).toBe(200)
  })
})
