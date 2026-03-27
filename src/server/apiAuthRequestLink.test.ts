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

import handler from '../../api/auth/request-otp.js'

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

describe('/api/auth/request-otp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps request-otp POST-only so the canonical workflow route stays bounded', async () => {
    const { response, state } = createResponse()

    await handler({
      method: 'GET',
      headers: {},
      body: undefined,
    } as unknown as VercelRequest, response)

    expect(requestLoginOtpMock).not.toHaveBeenCalled()
    expect(state.statusCode).toBe(405)
    expect(state.body).toEqual({
      error: {
        code: 'method_not_allowed',
      },
    })
  })

  it('keeps request-otp payload forwarding parity for status reconciliation fields', async () => {
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

  it('preserves cooldown status mapping on the canonical request-otp route', async () => {
    requestLoginOtpMock.mockResolvedValue({
      status: 'error',
      code: 'cooldown',
      message: '잠시 후 다시 시도해 주세요.',
      retryAfterSeconds: 42,
    })

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {},
      body: {
        email: 'tester@nurimedia.co.kr',
      },
    } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(429)
    expect(state.body).toEqual({
      status: 'error',
      code: 'cooldown',
      message: '잠시 후 다시 시도해 주세요.',
      retryAfterSeconds: 42,
    })
  })
})
