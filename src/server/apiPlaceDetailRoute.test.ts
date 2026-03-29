import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getAuthenticatedSessionMock,
  getPlaceDetailForUserMock,
  readSessionIdFromCookieHeaderMock,
} = vi.hoisted(() => ({
  getAuthenticatedSessionMock: vi.fn(),
  getPlaceDetailForUserMock: vi.fn(),
  readSessionIdFromCookieHeaderMock: vi.fn(),
}))

vi.mock('../server-core/auth/authService.js', () => ({
  getAuthenticatedSession: getAuthenticatedSessionMock,
}))

vi.mock('../server-core/auth/appSessionService.js', () => ({
  readSessionIdFromCookieHeader: readSessionIdFromCookieHeaderMock,
}))

vi.mock('../server-core/place/placeDataService.js', () => ({
  getPlaceDetailForUser: getPlaceDetailForUserMock,
}))

import handler from '../../api/places/[placeId].js'

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

describe('GET /api/places/:placeId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readSessionIdFromCookieHeaderMock.mockReturnValue('session-123')
    getAuthenticatedSessionMock.mockResolvedValue({
      status: 'authenticated',
      sessionId: 'session-123',
      user: { id: 'user-1', email: 'tester@nurimedia.co.kr', name: '테스트 사용자' },
    })
  })

  it('returns authenticated place detail payload', async () => {
    getPlaceDetailForUserMock.mockResolvedValue({ id: 'place-1', name: '누리 식당' })

    const { response, state } = createResponse()
    await handler({ method: 'GET', headers: {}, query: { placeId: 'place-1' } } as unknown as VercelRequest, response)

    expect(getPlaceDetailForUserMock).toHaveBeenCalledWith({
      placeId: 'place-1',
      viewerUserId: 'user-1',
    })
    expect(state.statusCode).toBe(200)
    expect(state.headers?.['Cache-Control']).toEqual(expect.stringContaining('no-store'))
    expect(state.body).toEqual({ status: 'success', place: { id: 'place-1', name: '누리 식당' } })
  })
})
