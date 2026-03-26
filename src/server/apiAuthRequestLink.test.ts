import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requestLoginOtpMock,
} = vi.hoisted(() => ({
  requestLoginOtpMock: vi.fn(),
}))

vi.mock('../server-core/auth/authService.js', () => ({
  requestLoginOtp: requestLoginOtpMock,
}))

import handler from '../../api/auth/request-link.js'

const createResponse = () => {
  const state: { body?: unknown; statusCode?: number } = {}
  const response = {
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

describe('/api/auth/request-link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards the same canonical request fields to requestLoginOtp as the request-otp route', async () => {
    requestLoginOtpMock.mockResolvedValue({
      status: 'success',
      mode: 'otp',
      message: '인증 코드를 보냈어요.',
      requestResolution: 'accepted',
    })

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {
        origin: 'http://localhost:5173',
      },
      body: {
        email: 'tester@nurimedia.co.kr',
        requireBypass: true,
        intent: 'status',
        requestAttemptId: 'attempt-legacy-alias',
      },
    } as unknown as VercelRequest, response)

    expect(requestLoginOtpMock).toHaveBeenCalledWith('tester@nurimedia.co.kr', {
      requireBypass: true,
      intent: 'status',
      requestAttemptId: 'attempt-legacy-alias',
      runtimeOrigin: 'http://localhost:5173',
    })
    expect(state.statusCode).toBe(200)
    expect(state.body).toEqual({
      status: 'success',
      mode: 'otp',
      message: '인증 코드를 보냈어요.',
      requestResolution: 'accepted',
    })
  })
})
