import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getAuthenticatedSessionMock, listPlacesForUserMock, readSessionIdFromCookieHeaderMock } = vi.hoisted(() => ({
  getAuthenticatedSessionMock: vi.fn(),
  listPlacesForUserMock: vi.fn(),
  readSessionIdFromCookieHeaderMock: vi.fn(),
}))

vi.mock('../server-core/auth/authService.js', () => ({
  getAuthenticatedSession: getAuthenticatedSessionMock,
}))

vi.mock('../server-core/auth/appSessionService.js', () => ({
  readSessionIdFromCookieHeader: readSessionIdFromCookieHeaderMock,
}))

vi.mock('../server-core/place/placeDataService.js', () => ({
  listPlacesForUser: listPlacesForUserMock,
}))

import handler from '../../api/places/index.js'

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

describe('GET /api/places', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readSessionIdFromCookieHeaderMock.mockReturnValue('session-123')
    getAuthenticatedSessionMock.mockResolvedValue({
      status: 'authenticated',
      sessionId: 'session-123',
      user: { id: 'user-1', email: 'tester@nurimedia.co.kr', name: '테스트 사용자' },
    })
  })

  it('returns authenticated place list payload', async () => {
    listPlacesForUserMock.mockResolvedValue([{ id: 'place-1', name: '누리 식당' }])

    const { response, state } = createResponse()
    await handler({ method: 'GET', headers: {} } as unknown as VercelRequest, response)

    expect(listPlacesForUserMock).toHaveBeenCalledWith('user-1')
    expect(state.statusCode).toBe(200)
    expect(state.body).toEqual({ status: 'success', places: [{ id: 'place-1', name: '누리 식당' }] })
  })
})
