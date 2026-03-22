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

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/session')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/profile', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nurimap-csrf-token': 'csrf-123',
      },
    }))
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/auth/logout', {
      method: 'POST',
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
