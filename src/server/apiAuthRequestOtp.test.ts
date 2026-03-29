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

  it('keeps request-otp as a POST-only workflow endpoint', async () => {
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

  it('forwards send payload fields to requestLoginOtp', async () => {
    requestLoginOtpMock.mockResolvedValue({
      status: 'success',
      mode: 'otp',
      message: '인증 코드를 보냈어요.',
    })

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {
        host: 'localhost:5173',
      },
      body: {
        email: 'tester@nurimedia.co.kr',
        requireBypass: false,
        intent: 'send',
        requestAttemptId: 'attempt-123',
      },
    } as unknown as VercelRequest, response)

    expect(requestLoginOtpMock).toHaveBeenCalledWith('tester@nurimedia.co.kr', {
      requireBypass: false,
      intent: undefined,
      requestAttemptId: 'attempt-123',
      runtimeOrigin: 'http://localhost:5173',
    })
    expect(state.statusCode).toBe(200)
    expect(state.body).toEqual({
      status: 'success',
      mode: 'otp',
      message: '인증 코드를 보냈어요.',
    })
  })

  it('forwards a private-lan Host header to requestLoginOtp unchanged', async () => {
    requestLoginOtpMock.mockResolvedValue({
      status: 'success',
      mode: 'otp',
      message: '인증 코드를 보냈어요.',
    })

    const { response } = createResponse()
    await handler({
      method: 'POST',
      headers: {
        host: '192.168.0.24:5173',
      },
      body: {
        email: 'tester@nurimedia.co.kr',
      },
    } as unknown as VercelRequest, response)

    expect(requestLoginOtpMock).toHaveBeenCalledWith('tester@nurimedia.co.kr', {
      requireBypass: false,
      intent: undefined,
      requestAttemptId: undefined,
      runtimeOrigin: 'http://192.168.0.24:5173',
    })
  })

  it('forwards status intent to requestLoginOtp without changing response shape', async () => {
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
        host: 'localhost:5173',
      },
      body: {
        email: 'tester@nurimedia.co.kr',
        intent: 'status',
        requestAttemptId: 'attempt-accepted',
      },
    } as unknown as VercelRequest, response)

    expect(requestLoginOtpMock).toHaveBeenCalledWith('tester@nurimedia.co.kr', {
      requireBypass: false,
      intent: 'status',
      requestAttemptId: 'attempt-accepted',
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

  it('derives a private-lan runtimeOrigin from the Host header when Origin is missing', async () => {
    requestLoginOtpMock.mockResolvedValue({
      status: 'success',
      mode: 'otp',
      message: '인증 코드를 보냈어요.',
    })

    const { response } = createResponse()
    await handler({
      method: 'POST',
      headers: {
        host: '10.0.0.42:4173',
      },
      body: {
        email: 'tester@nurimedia.co.kr',
      },
    } as unknown as VercelRequest, response)

    expect(requestLoginOtpMock).toHaveBeenCalledWith('tester@nurimedia.co.kr', {
      requireBypass: false,
      intent: undefined,
      requestAttemptId: undefined,
      runtimeOrigin: 'http://10.0.0.42:4173',
    })
  })

  it('ignores a spoofed Origin header and uses the actual Host-derived runtimeOrigin', async () => {
    requestLoginOtpMock.mockResolvedValue({
      status: 'success',
      mode: 'otp',
      message: '인증 코드를 보냈어요.',
    })

    const { response } = createResponse()
    await handler({
      method: 'POST',
      headers: {
        origin: 'https://attacker.example.com',
        host: 'localhost:5173',
      },
      body: {
        email: 'tester@nurimedia.co.kr',
      },
    } as unknown as VercelRequest, response)

    expect(requestLoginOtpMock).toHaveBeenCalledWith('tester@nurimedia.co.kr', {
      requireBypass: false,
      intent: undefined,
      requestAttemptId: undefined,
      runtimeOrigin: 'http://localhost:5173',
    })
  })

  it('maps delivery_failed to 502 so the workflow exception still exposes transport failure distinctly', async () => {
    requestLoginOtpMock.mockResolvedValue({
      status: 'error',
      code: 'delivery_failed',
      message: '메일 전송에 실패했어요.',
    })

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {},
      body: {
        email: 'tester@nurimedia.co.kr',
      },
    } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(502)
    expect(state.body).toEqual({
      status: 'error',
      code: 'delivery_failed',
      message: '메일 전송에 실패했어요.',
    })
  })
})
