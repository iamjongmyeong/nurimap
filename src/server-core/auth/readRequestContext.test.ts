import type { VercelRequest } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getAuthenticatedSessionMock, readSessionIdFromCookieHeaderMock } = vi.hoisted(() => ({
  getAuthenticatedSessionMock: vi.fn(),
  readSessionIdFromCookieHeaderMock: vi.fn(),
}))

vi.mock('./authService.js', () => ({
  getAuthenticatedSession: getAuthenticatedSessionMock,
}))

vi.mock('./appSessionService.js', () => ({
  readSessionIdFromCookieHeader: readSessionIdFromCookieHeaderMock,
}))

import { getAnonymousOrAuthenticatedReadRequestContext } from './readRequestContext'

describe('getAnonymousOrAuthenticatedReadRequestContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns anonymous when no app session cookie exists', async () => {
    readSessionIdFromCookieHeaderMock.mockReturnValue(null)

    const result = await getAnonymousOrAuthenticatedReadRequestContext({
      req: { headers: {} } as VercelRequest,
    })

    expect(getAuthenticatedSessionMock).not.toHaveBeenCalled()
    expect(result).toEqual({ status: 'anonymous' })
  })

  it('returns anonymous when the app session is stale', async () => {
    readSessionIdFromCookieHeaderMock.mockReturnValue('session-123')
    getAuthenticatedSessionMock.mockResolvedValue({ status: 'missing' })

    const result = await getAnonymousOrAuthenticatedReadRequestContext({
      req: { headers: {} } as VercelRequest,
    })

    expect(getAuthenticatedSessionMock).toHaveBeenCalledWith('session-123')
    expect(result).toEqual({ status: 'anonymous' })
  })

  it('returns the authenticated viewer when the session is valid', async () => {
    readSessionIdFromCookieHeaderMock.mockReturnValue('session-123')
    getAuthenticatedSessionMock.mockResolvedValue({
      status: 'authenticated',
      sessionId: 'session-123',
      user: { id: 'user-1', email: 'tester@nurimedia.co.kr', name: '테스트 사용자' },
    })

    const result = await getAnonymousOrAuthenticatedReadRequestContext({
      req: { headers: {} } as VercelRequest,
    })

    expect(result).toEqual({
      status: 'authenticated',
      sessionId: 'session-123',
      authSession: {
        status: 'authenticated',
        sessionId: 'session-123',
        user: { id: 'user-1', email: 'tester@nurimedia.co.kr', name: '테스트 사용자' },
      },
    })
  })
})
