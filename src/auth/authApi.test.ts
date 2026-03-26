import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getSessionViaApi,
  requestOtpViaApi,
  saveNameViaApi,
  signOutViaApi,
  verifyOtpViaApi,
} from './authApi'

describe('authApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls request-otp endpoint with the canonical payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'success', mode: 'otp', message: '인증 코드를 보냈어요.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await requestOtpViaApi({
      email: 'tester@nurimedia.co.kr',
      requireBypass: true,
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/request-otp', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: 'tester@nurimedia.co.kr',
      requireBypass: true,
    })
    expect(result.payload).toEqual({
      status: 'success',
      mode: 'otp',
      message: '인증 코드를 보냈어요.',
    })
  })

  it('passes status intent and requestAttemptId through the request-otp endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        status: 'success',
        mode: 'otp',
        message: '인증 코드를 보냈어요.',
        requestResolution: 'accepted',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await requestOtpViaApi({
      email: 'tester@nurimedia.co.kr',
      intent: 'status',
      requestAttemptId: 'attempt-123',
    })

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: 'tester@nurimedia.co.kr',
      intent: 'status',
      requireBypass: false,
      requestAttemptId: 'attempt-123',
    })
    expect(result.payload).toEqual({
      status: 'success',
      mode: 'otp',
      message: '인증 코드를 보냈어요.',
      requestResolution: 'accepted',
    })
  })

  it('calls verify-otp endpoint with email and token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        status: 'success',
        nextPhase: 'authenticated',
        user: {
          id: 'user-1',
          email: 'tester@nurimedia.co.kr',
          name: '테스트 사용자',
        },
        csrfHeaderName: 'x-nurimap-csrf-token',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await verifyOtpViaApi({
      email: 'tester@nurimedia.co.kr',
      token: '123456',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/verify-otp', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: 'tester@nurimedia.co.kr',
      token: '123456',
    })
    expect(result.payload).toEqual({
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

  it('passes tokenHash and verificationType through verify-otp for local bypass compatibility', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        status: 'success',
        nextPhase: 'authenticated',
        user: {
          id: 'user-1',
          email: 'bypass.user@example.com',
          name: '테스트 사용자',
        },
        csrfHeaderName: 'x-nurimap-csrf-token',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await verifyOtpViaApi({
      email: 'bypass.user@example.com',
      token: '',
      tokenHash: 'token-hash',
      verificationType: 'magiclink',
    })

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: 'bypass.user@example.com',
      token: '',
      tokenHash: 'token-hash',
      verificationType: 'magiclink',
    })
  })

  it('calls session endpoint with explicit no-store cookie-aware options', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'missing' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await getSessionViaApi()

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({
      credentials: 'same-origin',
      cache: 'no-store',
    }))
  })

  it('forwards an abort signal when the session helper receives one', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'missing' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const abortController = new AbortController()

    await getSessionViaApi({
      signal: abortController.signal,
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({
      credentials: 'same-origin',
      cache: 'no-store',
      signal: abortController.signal,
    }))
  })

  it('calls session/profile/logout endpoints with the expected contracts', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          status: 'authenticated',
          user: {
            id: 'user-1',
            email: 'tester@nurimedia.co.kr',
            name: '테스트 사용자',
          },
          csrfHeaderName: 'x-nurimap-csrf-token',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          status: 'success',
          name: '홍길동',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const session = await getSessionViaApi()
    const profile = await saveNameViaApi({
      csrfHeaderName: 'x-nurimap-csrf-token',
      csrfToken: 'csrf-123',
      name: '홍길동',
    })
    await signOutViaApi({
      csrfHeaderName: 'x-nurimap-csrf-token',
      csrfToken: 'csrf-123',
    })

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/session', expect.objectContaining({
      cache: 'no-store',
      credentials: 'same-origin',
      signal: undefined,
    }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/profile', expect.objectContaining({
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-nurimap-csrf-token': 'csrf-123',
      },
    }))
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/auth/session', {
      method: 'DELETE',
      headers: {
        'x-nurimap-csrf-token': 'csrf-123',
      },
    })
    expect(session.payload).toEqual({
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: 'tester@nurimedia.co.kr',
        name: '테스트 사용자',
      },
      csrfHeaderName: 'x-nurimap-csrf-token',
    })
    expect(profile.payload).toEqual({
      status: 'success',
      name: '홍길동',
    })
  })
})
