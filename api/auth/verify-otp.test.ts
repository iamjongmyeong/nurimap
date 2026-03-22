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

vi.mock('../_lib/_authService.js', () => ({
  verifyLoginOtp: verifyLoginOtpMock,
}))

vi.mock('../_lib/_appSessionService.js', () => ({
  APP_CSRF_HEADER_NAME: 'x-nurimap-csrf-token',
  serializeAppSessionCookie: serializeAppSessionCookieMock,
  serializeCsrfCookie: serializeCsrfCookieMock,
}))

import handler from './verify-otp.js'

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
      headers: {},
      body: {
        email: 'tester@nurimedia.co.kr',
        token: '123456',
      },
    } as unknown as VercelRequest

    const { response, state } = createResponse()
    await handler(request, response)

    expect(verifyLoginOtpMock).toHaveBeenCalledWith({
      email: 'tester@nurimedia.co.kr',
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
})
