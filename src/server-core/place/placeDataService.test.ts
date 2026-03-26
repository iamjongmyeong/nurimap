import { beforeEach, describe, expect, it, vi } from 'vitest'

const withDatabaseConnectionMock = vi.hoisted(() => vi.fn())
const withDatabaseTransactionMock = vi.hoisted(() => vi.fn())

vi.mock('../runtime/database.js', () => ({
  withDatabaseConnection: withDatabaseConnectionMock,
  withDatabaseTransaction: withDatabaseTransactionMock,
}))

import {
  getPlaceDetailForUser,
  listPlacesForUser,
  submitPersistedPlaceReview,
} from './placeDataService'

describe('placeDataService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hydrates list/detail place summaries with sorted reviews and my_review', async () => {
    withDatabaseConnectionMock.mockImplementation(async (work: (client: { query: ReturnType<typeof vi.fn> }) => Promise<unknown>) =>
      work({
        query: vi.fn()
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'place-1',
                naver_place_id: '10001',
                naver_place_url: 'https://map.naver.com/p/entry/place/10001',
                name: '누리 식당',
                road_address: '서울 마포구 양화로19길 22-16 1층',
                latitude: 37.55,
                longitude: 126.92,
                place_type: 'restaurant',
                zeropay_status: 'available',
                average_rating: 4.7,
                review_count: 2,
                added_by_name: '김누리',
              },
            ],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'review-2',
                place_id: 'place-1',
                author_user_id: 'user-2',
                author_name: '박지도',
                content: '',
                created_at: '2026-03-05T00:00:00.000Z',
                rating_score: 4,
              },
              {
                id: 'review-1',
                place_id: 'place-1',
                author_user_id: 'user-1',
                author_name: '김누리',
                content: '점심 모임으로 가기 좋은 식당이에요.',
                created_at: '2026-03-07T00:00:00.000Z',
                rating_score: 5,
              },
            ],
          }),
      }))

    const list = await listPlacesForUser('user-1')
    const detail = await getPlaceDetailForUser({
      placeId: 'place-1',
      viewerUserId: 'user-1',
    })

    expect(list[0]?.my_review?.author_name).toBe('김누리')
    expect(list[0]?.reviews[0]?.author_name).toBe('김누리')
    expect(detail?.review_count).toBe(2)
  })

  it('returns existing_review when overwrite is not allowed', async () => {
    withDatabaseTransactionMock.mockImplementation(async (work: (client: { query: ReturnType<typeof vi.fn> }) => Promise<unknown>) =>
      work({
        query: vi.fn()
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'place-1',
                naver_place_id: '10001',
                naver_place_url: 'https://map.naver.com/p/entry/place/10001',
                name: '누리 식당',
                road_address: '서울 마포구 양화로19길 22-16 1층',
                latitude: 37.55,
                longitude: 126.92,
                place_type: 'restaurant',
                zeropay_status: 'available',
                average_rating: 4.7,
                review_count: 2,
                added_by_name: '김누리',
              },
            ],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'review-1',
                content: '기존 리뷰',
                rating_score: 5,
              },
            ],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'place-1',
                naver_place_id: '10001',
                naver_place_url: 'https://map.naver.com/p/entry/place/10001',
                name: '누리 식당',
                road_address: '서울 마포구 양화로19길 22-16 1층',
                latitude: 37.55,
                longitude: 126.92,
                place_type: 'restaurant',
                zeropay_status: 'available',
                average_rating: 4.7,
                review_count: 2,
                added_by_name: '김누리',
              },
            ],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'review-1',
                place_id: 'place-1',
                author_user_id: 'user-1',
                author_name: '테스트 사용자',
                content: '기존 리뷰',
                created_at: '2026-03-07T00:00:00.000Z',
                rating_score: 5,
              },
            ],
          }),
      }))
    withDatabaseConnectionMock.mockImplementation(async (work: (client: { query: ReturnType<typeof vi.fn> }) => Promise<unknown>) =>
      work({
        query: vi.fn()
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'place-1',
                naver_place_id: '10001',
                naver_place_url: 'https://map.naver.com/p/entry/place/10001',
                name: '누리 식당',
                road_address: '서울 마포구 양화로19길 22-16 1층',
                latitude: 37.55,
                longitude: 126.92,
                place_type: 'restaurant',
                zeropay_status: 'available',
                average_rating: 4.7,
                review_count: 2,
                added_by_name: '김누리',
              },
            ],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'review-1',
                place_id: 'place-1',
                author_user_id: 'user-1',
                author_name: '테스트 사용자',
                content: '기존 리뷰',
                created_at: '2026-03-07T00:00:00.000Z',
                rating_score: 5,
              },
            ],
          }),
      }))

    const result = await submitPersistedPlaceReview({
      placeId: 'place-1',
      userId: 'user-1',
      draft: {
        rating_score: 4,
        review_content: '새 리뷰',
      },
    })

    expect(result.status).toBe('existing_review')
  })
})
