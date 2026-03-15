import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { preparePlaceEntryFromDraftMock, verifyAccessTokenMock } = vi.hoisted(() => ({
  verifyAccessTokenMock: vi.fn(),
  preparePlaceEntryFromDraftMock: vi.fn(),
}))

vi.mock('./_lib/_authService.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}))

vi.mock('./_lib/_placeEntryService.js', () => ({
  preparePlaceEntryFromDraft: preparePlaceEntryFromDraftMock,
}))

import handler from './place-entry.js'

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

describe('/api/place-entry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a JSON 500 error when place-entry preparation throws unexpectedly', async () => {
    verifyAccessTokenMock.mockResolvedValue({ id: 'user-1' })
    preparePlaceEntryFromDraftMock.mockRejectedValue(new Error('vercel runtime import failed'))

    const request = {
      method: 'POST',
      headers: {
        authorization: 'Bearer access-token',
      },
      body: {
        name: '등록 테스트 장소',
        roadAddress: '서울 마포구 등록로 1',
      },
    } as unknown as VercelRequest

    const { response, state } = createResponse()

    await handler(request, response)

    expect(verifyAccessTokenMock).toHaveBeenCalledWith('access-token')
    expect(preparePlaceEntryFromDraftMock).toHaveBeenCalledWith({
      name: '등록 테스트 장소',
      roadAddress: '서울 마포구 등록로 1',
      landLotAddress: null,
    })
    expect(state.statusCode).toBe(500)
    expect(state.body).toEqual({
      error: {
        code: 'internal_error',
        message: '등록하지 못했어요. 잠시 후 다시 시도해 주세요.',
      },
    })
  })
})
