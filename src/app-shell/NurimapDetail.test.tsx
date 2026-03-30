import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { resetAppShellStore, useAppShellStore } from './appShellStore'
import { MOCK_PLACES } from './mockPlaces'
import type { PlaceSummary } from './types'

vi.mock('agentation', () => ({
  Agentation: () => null,
}))

const originalFetch = globalThis.fetch

const cloneMockPlace = (placeId: string) => {
  const matched = MOCK_PLACES.find((place) => place.id === placeId)
  if (!matched) return null
  return {
    ...matched,
    my_review: matched.my_review ? { ...matched.my_review } : null,
    reviews: matched.reviews.map((review) => ({ ...review })),
  }
}

const toPlaceListSummary = (place: PlaceSummary) => ({
  id: place.id,
  naver_place_id: place.naver_place_id,
  naver_place_url: place.naver_place_url,
  name: place.name,
  road_address: place.road_address,
  latitude: place.latitude,
  longitude: place.longitude,
  place_type: place.place_type,
  zeropay_status: place.zeropay_status,
  average_rating: place.average_rating,
  review_count: place.review_count,
  added_by_name: place.added_by_name,
})

const getPlaceIdFromDetailUrl = (url: string) => {
  const match = url.match(/^\/api\/places\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

const getPlaceIdFromReviewUrl = (url: string) => {
  const match = url.match(/^\/api\/places\/([^/]+)\/reviews$/)
  return match ? decodeURIComponent(match[1]) : null
}

const createDetailFetchMock = () =>
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)

    if (url === '/api/places') {
      return new Response(JSON.stringify({
        status: 'success',
        places: MOCK_PLACES.map(toPlaceListSummary),
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const placeId = getPlaceIdFromDetailUrl(url)
    if (placeId) {
      const place = cloneMockPlace(placeId)
      if (!place) {
        return new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ status: 'success', place }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const reviewPlaceId = getPlaceIdFromReviewUrl(url)
    if (reviewPlaceId) {
      const body = init?.body ? JSON.parse(String(init.body)) : {}
      const place = cloneMockPlace(reviewPlaceId)
      if (!place) {
        return new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404, headers: { 'Content-Type': 'application/json' } })
      }

      if (place.id === 'place-review-fail') {
        return new Response(JSON.stringify({ error: { message: '리뷰를 저장하지 못했어요. 다시 시도해 주세요.' } }), { status: 500, headers: { 'Content-Type': 'application/json' } })
      }

      const nextReview = {
        id: `review-${place.id}-mine`,
        author_name: '테스트 사용자',
        content: body.reviewContent ?? '',
        created_at: '2026-03-08',
        rating_score: body.ratingScore,
      }
      const reviewCount = place.review_count + 1
      const averageRating = Math.round(((place.average_rating * place.review_count + body.ratingScore) / reviewCount) * 10) / 10
      return new Response(JSON.stringify({
        status: 'saved',
        place: {
          ...place,
          average_rating: averageRating,
          review_count: reviewCount,
          my_review: nextReview,
          reviews: [nextReview, ...place.reviews],
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: { message: 'unexpected request' } }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  })

const setViewport = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })

  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

describe('Nurimap place detail', () => {
  beforeEach(() => {
    resetAppShellStore()
    window.history.replaceState({}, '', '/')
    globalThis.fetch = createDetailFetchMock() as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('shows the redesigned desktop detail fields and removes legacy modules', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    const detail = screen.getByTestId('desktop-detail-panel')
    expect(detail).toHaveTextContent('누리 식당')
    expect(screen.getByTestId('detail-address')).toHaveTextContent('서울 마포구 양화로19길 22-16 1층')
    expect(screen.getByTestId('detail-added-by')).toHaveTextContent('김누리님이 추가한 장소')
    expect(screen.getByTestId('detail-meta-type')).toHaveTextContent('음식점')
    expect(screen.getByTestId('detail-zeropay-row')).toHaveTextContent('제로페이 가능')
    expect(screen.getByTestId('detail-meta-rating')).toHaveTextContent('4.7 (12)')
    expect(screen.getByTestId('detail-zeropay-indicator')).toBeInTheDocument()
    expect(screen.getByTestId('detail-review-section')).toHaveTextContent('평가 및 리뷰')
    expect(screen.getByTestId('detail-review-list')).toHaveTextContent('김누리')
    expect(screen.getByTestId('detail-review-list')).toHaveTextContent('박지도')
    expect(screen.queryByTestId('detail-review-content-review-2')).not.toBeInTheDocument()
    expect(detail).not.toHaveTextContent('네이버 지도 이동')
    expect(detail).not.toHaveTextContent('내 리뷰')
    expect(screen.queryByTestId('detail-review-compose')).not.toBeInTheDocument()
    expect(screen.queryByTestId('detail-my-review')).not.toBeInTheDocument()
    expect(screen.queryByTestId('detail-naver-link')).not.toBeInTheDocument()
    expect(screen.queryByTestId('detail-review-cta')).not.toBeInTheDocument()
  })

  it('shows the 평가 남기기 CTA on desktop detail when my_review is null', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))

    expect(screen.getByTestId('desktop-detail-panel')).toBeInTheDocument()
    expect(screen.getByTestId('detail-review-cta')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '평가 남기기' })).toBeInTheDocument()
  })

  it('opens the add-rating child surface from desktop detail and returns on back', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))
    await user.click(screen.getByRole('button', { name: '평가 남기기' }))

    expect(await screen.findByTestId('mobile-review-add-page')).toBeInTheDocument()
    expect(screen.getByTestId('review-add-surface')).toHaveTextContent('평가')
    expect(window.location.pathname).toBe('/places/place-cafe-1')

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }))

    expect(screen.getByTestId('desktop-detail-panel')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-review-add-page')).not.toBeInTheDocument()
    expect(screen.getByTestId('detail-review-cta')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/places/place-cafe-1')
  })

  it('shows reviews newest first in the detail list', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    const reviewListText = screen.getByTestId('detail-review-list').textContent ?? ''
    expect(reviewListText.indexOf('김누리')).toBeLessThan(reviewListText.indexOf('박지도'))
    expect(reviewListText).toContain('2026.03.07')
    expect(reviewListText).toContain('2026.03.05')
  })

  it('shows zeropay verification-needed status in detail', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))

    expect(screen.getByTestId('detail-zeropay-indicator')).toBeInTheDocument()
    expect(screen.getByTestId('detail-zeropay-row')).toHaveTextContent('제로페이 확인 필요')
  })

  it('shows zeropay unavailable status in detail', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-2'))

    expect(screen.getByTestId('detail-zeropay-indicator')).toBeInTheDocument()
    expect(screen.getByTestId('detail-zeropay-row')).toHaveTextContent('제로페이 불가능')
  })

  it('returns from desktop detail to browse mode without leaving a selected-looking browse state', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))
    expect(window.location.pathname).toBe('/places/place-restaurant-1')
    await user.click(screen.getByRole('button', { name: '목록으로 돌아가기' }))

    expect(window.location.pathname).toBe('/')
    expect(screen.queryByTestId('desktop-detail-panel')).not.toBeInTheDocument()
    expect(screen.getByTestId('desktop-browse-topbar')).toBeInTheDocument()
    expect(screen.getByTestId('desktop-browse-footer')).toBeInTheDocument()
    expect(useAppShellStore.getState().selectedPlaceId).toBeNull()
    expect(screen.getByTestId('place-list-item-place-restaurant-1').className).not.toContain('bg-[#f7f8ff]')
  })

  it('keeps the map visible while desktop detail is shown in the sidebar', async () => {
    setViewport(1280)
    useAppShellStore.setState({ mapLevel: 1 })
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('map-canvas')).toBeInTheDocument()
    expect(useAppShellStore.getState().mapLevel).toBe(1)
    expect(screen.getByTestId('desktop-sidebar')).toContainElement(screen.getByTestId('desktop-detail-panel'))
  })

  it('returns from desktop browser back without auto-zoom and without a selected-looking browse state', async () => {
    setViewport(1280)
    useAppShellStore.setState({ mapLevel: 1 })
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))
    expect(window.location.pathname).toBe('/places/place-restaurant-1')

    act(() => {
      window.history.replaceState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(window.location.pathname).toBe('/')
    expect(screen.queryByTestId('desktop-detail-panel')).not.toBeInTheDocument()
    expect(useAppShellStore.getState().selectedPlaceId).toBeNull()
    expect(useAppShellStore.getState().mapLevel).toBe(1)
    expect(screen.getByTestId('place-list-item-place-restaurant-1').className).not.toContain('bg-[#f7f8ff]')
  })

  it('shows the refreshed mobile detail page as a full-screen page', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('mobile-detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-detail-page')).toHaveTextContent('누리 식당')
    expect(screen.getByTestId('detail-header')).toHaveStyle({
      paddingTop: 'var(--nurimap-safe-area-top, 0px)',
    })
    expect(screen.getByTestId('detail-address')).toHaveTextContent('서울 마포구 양화로19길 22-16 1층')
    expect(screen.getByTestId('detail-added-by')).toHaveTextContent('김누리님이 추가한 장소')
    expect(screen.getByLabelText('뒤로 가기')).toBeInTheDocument()
    expect(screen.queryByTestId('detail-review-cta')).not.toBeInTheDocument()
  })

  it('shows the 평가 남기기 CTA only when my_review is null on mobile detail', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))

    expect(screen.getByTestId('detail-review-cta-container')).toHaveClass('px-6', 'pb-6', 'pt-0', 'items-center', 'justify-center')
    expect(screen.getByTestId('detail-review-cta-container').className).not.toContain('border-t')
    expect(screen.getByTestId('detail-review-cta')).toBeInTheDocument()
    expect(screen.getByTestId('detail-review-cta')).toHaveClass('h-12', 'w-full', 'shrink-0', 'gap-[10px]', 'px-0', 'py-3', 'text-sm', 'font-semibold', 'rounded-[12px]', 'bg-[#5862fb]')
    expect(screen.getByRole('button', { name: '평가 남기기' })).toBeInTheDocument()
  })

  it('opens the add-rating child surface and returns to detail on back', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))
    await user.click(screen.getByRole('button', { name: '평가 남기기' }))

    expect(await screen.findByTestId('mobile-review-add-page')).toBeInTheDocument()
    const addRatingScrollRegion = screen.getByTestId('detail-add-rating-scroll-region')
    expect(await screen.findByTestId('review-add-surface')).toHaveTextContent('평가')
    expect(addRatingScrollRegion).toHaveClass('flex-1', 'overflow-y-auto', 'overscroll-contain', 'px-6', 'pb-6')
    expect(addRatingScrollRegion).not.toHaveClass('pt-6')
    expect(screen.getByTestId('review-add-surface')).toHaveClass('mt-6')
    expect(screen.getByTestId('review-add-surface')).toHaveTextContent('후기(선택)')
    expect(screen.getByText('평가')).toHaveClass("font-['Pretendard']", 'text-[12px]', 'font-medium', 'leading-[18px]', 'tracking-[-0.3px]', 'text-[#1c1c1c]')
    expect(screen.getByText('후기(선택)')).toHaveClass("font-['Pretendard']", 'text-[12px]', 'font-medium', 'leading-[18px]', 'tracking-[-0.3px]', 'text-[#1c1c1c]')
    expect(screen.getByTestId('review-add-content-input')).toHaveClass('h-[144px]', 'min-h-[144px]', 'overflow-y-auto', 'px-3', 'py-3', 'text-base')
    expect(screen.getByTestId('review-add-submit-button')).toHaveTextContent('등록')
    expect(screen.getByTestId('review-add-submit-button')).toHaveClass('h-12', 'py-3', 'font-semibold')
    expect(window.location.pathname).toBe('/places/place-cafe-1')

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }))

    expect(screen.getByTestId('mobile-detail-page')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-review-add-page')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/places/place-cafe-1')
  })

  it('returns to detail and shows the new review immediately after a successful add-rating submission', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))
    await user.click(screen.getByRole('button', { name: '평가 남기기' }))
    await user.click(screen.getByTestId('review-add-rating-star-5'))
    await user.type(screen.getByTestId('review-add-content-input'), '새 리뷰 작성 테스트')
    await user.click(screen.getByTestId('review-add-submit-button'))

    expect(await screen.findByTestId('mobile-detail-page')).toBeInTheDocument()
    expect(await screen.findByTestId('detail-review-list')).toHaveTextContent('새 리뷰 작성 테스트')
    expect(screen.getByTestId('detail-review-list')).toHaveTextContent('테스트 사용자')
    expect(screen.getByTestId('detail-meta-rating')).toHaveTextContent('4.4 (9)')
    expect(screen.queryByTestId('detail-review-cta')).not.toBeInTheDocument()
  })

  it('shows only a spinner while add-rating submission is in progress', async () => {
    setViewport(390)
    const user = userEvent.setup()
    const baseFetch = createDetailFetchMock()
    let releaseReviewResponse: (() => Promise<void>) | null = null

    globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (getPlaceIdFromReviewUrl(url)) {
        return new Promise<Response>((resolve) => {
          releaseReviewResponse = async () => {
            resolve(await baseFetch(input, init))
          }
        })
      }

      return baseFetch(input, init)
    }) as typeof fetch

    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))
    await user.click(screen.getByRole('button', { name: '평가 남기기' }))
    await user.click(screen.getByTestId('review-add-rating-star-5'))
    await user.type(screen.getByTestId('review-add-content-input'), '등록 중 스피너만 노출')
    await user.click(screen.getByTestId('review-add-submit-button'))

    const submitButton = screen.getByTestId('review-add-submit-button')

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(submitButton).not.toHaveTextContent('등록')
      expect(submitButton).not.toHaveTextContent('등록 중')
      expect(submitButton).toHaveAccessibleName('등록 중')
      expect(screen.getByTestId('review-add-submit-spinner')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(releaseReviewResponse).not.toBeNull()
    })

    await act(async () => {
      await releaseReviewResponse?.()
    })

    expect(await screen.findByTestId('mobile-detail-page')).toBeInTheDocument()
  })

  it('keeps a saved multiline review visible after returning to browse and reopening the same place', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))
    await user.click(screen.getByRole('button', { name: '평가 남기기' }))
    await user.click(screen.getByTestId('review-add-rating-star-5'))
    await user.type(screen.getByTestId('review-add-content-input'), '첫 줄\n둘째 줄')
    await user.click(screen.getByTestId('review-add-submit-button'))

    expect(await screen.findByTestId('mobile-detail-page')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }))

    expect(window.location.pathname).toBe('/')
    expect(screen.queryByTestId('mobile-detail-page')).not.toBeInTheDocument()
    expect(useAppShellStore.getState().selectedPlaceId).toBeNull()

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    expect(screen.getByTestId('place-list-item-place-cafe-1').className).not.toContain('bg-[#f7f8ff]')
    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))

    const savedReview = await screen.findByTestId('detail-review-content-review-place-cafe-1-mine')
    expect(savedReview.textContent).toBe('첫 줄\n둘째 줄')
    expect(savedReview).toHaveClass('whitespace-pre-line')
    expect(screen.getByTestId('detail-review-list')).toHaveTextContent('테스트 사용자')
    expect(screen.getByTestId('detail-meta-rating')).toHaveTextContent('4.4 (9)')
    expect(screen.queryByTestId('detail-review-cta')).not.toBeInTheDocument()
  })

  it('keeps entered values visible when add-rating submission fails', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-review-fail'))
    await user.click(await screen.findByRole('button', { name: '평가 남기기' }))
    await user.click(screen.getByTestId('review-add-rating-star-4'))
    await user.type(screen.getByTestId('review-add-content-input'), '저장 실패 시도')
    await user.click(screen.getByTestId('review-add-submit-button'))

    expect(await screen.findByText('리뷰를 저장하지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-review-add-page')).toBeInTheDocument()
    expect(screen.getByTestId('review-add-content-input')).toHaveValue('저장 실패 시도')
  })

  it('keeps the add-rating review textarea fixed at 144px and scrollable for multiline input', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))
    await user.click(screen.getByRole('button', { name: '평가 남기기' }))

    const reviewInput = screen.getByTestId('review-add-content-input') as HTMLTextAreaElement

    await user.type(reviewInput, '첫 줄\\n둘째 줄\\n셋째 줄\\n넷째 줄\\n다섯째 줄\\n여섯째 줄')

    expect(reviewInput).toHaveClass('h-[144px]', 'min-h-[144px]', 'overflow-y-auto')
    expect(reviewInput.style.height).toBe('')
  })

  it('clamps pasted add-rating review content to 500 characters and discards the overflow', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))
    await user.click(screen.getByRole('button', { name: '평가 남기기' }))

    const pastedReview = 'a'.repeat(501)
    fireEvent.change(screen.getByTestId('review-add-content-input'), { target: { value: pastedReview } })

    expect(screen.getByTestId('review-add-content-input')).toHaveValue('a'.repeat(500))
  })

  it('returns to the map screen on mobile map-origin in-app back without auto-zoom and without a selected-looking browse state', async () => {
    setViewport(390)
    useAppShellStore.setState({ mapLevel: 4 })
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '지도' }))
    await user.click(screen.getByTestId('map-marker-place-restaurant-1'))
    expect(window.location.pathname).toBe('/places/place-restaurant-1')

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }))

    expect(window.location.pathname).toBe('/')
    expect(screen.queryByTestId('mobile-detail-page')).not.toBeInTheDocument()
    expect(screen.getByTestId('map-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-tab-map')).toHaveAttribute('data-active', 'true')
    expect(useAppShellStore.getState().selectedPlaceId).toBeNull()
    expect(useAppShellStore.getState().mapLevel).toBe(4)
    expect(screen.queryByTestId('map-center')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-focus-place')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    expect(screen.getByTestId('place-list-item-place-restaurant-1').className).not.toContain('bg-[#f7f8ff]')
  })

  it('returns to the map screen on mobile map-origin history.back without auto-zoom and without a selected-looking browse state', async () => {
    setViewport(390)
    useAppShellStore.setState({ mapLevel: 4 })
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '지도' }))
    await user.click(screen.getByTestId('map-marker-place-cafe-1'))
    expect(window.location.pathname).toBe('/places/place-cafe-1')

    act(() => {
      window.history.back()
    })

    await waitFor(() => {
      expect(window.location.pathname).toBe('/')
      expect(screen.queryByTestId('mobile-detail-page')).not.toBeInTheDocument()
      expect(screen.getByTestId('map-canvas')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-tab-map')).toHaveAttribute('data-active', 'true')
    })

    expect(useAppShellStore.getState().selectedPlaceId).toBeNull()
    expect(useAppShellStore.getState().mapLevel).toBe(4)
    expect(screen.queryByTestId('map-center')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-focus-place')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    expect(screen.getByTestId('place-list-item-place-cafe-1').className).not.toContain('bg-[#f7f8ff]')
  })

  it('falls back to the list screen on mobile no-origin synthetic browser restore without a selected-looking browse state', async () => {
    setViewport(390)
    useAppShellStore.setState({ mapLevel: 4 })
    window.history.replaceState({}, '', '/places/place-cafe-1')
    render(<App />)

    expect(await screen.findByTestId('mobile-detail-page')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/places/place-cafe-1')

    act(() => {
      window.history.replaceState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(window.location.pathname).toBe('/')
    expect(screen.queryByTestId('mobile-detail-page')).not.toBeInTheDocument()
    expect(screen.getByTestId('mobile-list-page')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-tab-list')).toHaveAttribute('data-active', 'true')
    expect(useAppShellStore.getState().selectedPlaceId).toBeNull()
    expect(useAppShellStore.getState().mapLevel).toBe(4)
    expect(screen.queryByTestId('map-center')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-focus-place')).not.toBeInTheDocument()
    expect(screen.getByTestId('place-list-item-place-cafe-1').className).not.toContain('bg-[#f7f8ff]')
  })

  it('shows the full-screen loading state while detail is loading', () => {
    setViewport(1280)
    window.history.replaceState({}, '', '/places/place-restaurant-1')
    useAppShellStore.setState({
      selectedPlaceId: 'place-restaurant-1',
      placeDetailLoad: 'loading',
    })
    render(<App />)

    expect(screen.getByTestId('browse-bootstrap-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('place-detail-loading')).not.toBeInTheDocument()
    expect(screen.queryByTestId('desktop-detail-panel')).not.toBeInTheDocument()
  })

  it('shows the detail error state and retry action', () => {
    setViewport(1280)
    window.history.replaceState({}, '', '/places/place-restaurant-1')
    useAppShellStore.setState({
      selectedPlaceId: 'place-restaurant-1',
      placeDetailLoad: 'error',
    })
    render(<App />)

    expect(screen.getByTestId('place-detail-error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toHaveClass('h-12', 'py-3', 'font-semibold')
  })

  it('leaves the review section body empty when there are no reviews', () => {
    setViewport(390)
    window.history.replaceState({}, '', '/places/place-empty-review')
    const emptyReviewPlace: PlaceSummary = {
      id: 'place-empty-review',
      naver_place_id: '10099',
      naver_place_url: 'https://map.naver.com/p/entry/place/10099',
      name: '빈 리뷰 장소',
      road_address: '서울 마포구 빈리뷰로 1',
      latitude: 37.5581,
      longitude: 126.9241,
      place_type: 'restaurant',
      zeropay_status: 'available',
      average_rating: 0,
      review_count: 0,
      added_by_name: '테스트 등록자',
      my_review: null,
      reviews: [],
    }

    useAppShellStore.setState({
      placeDetailLoad: 'ready',
      selectedPlaceId: emptyReviewPlace.id,
      places: [emptyReviewPlace],
    })
    render(<App />)

    expect(screen.getByTestId('detail-review-section')).toHaveTextContent('평가 및 리뷰')
    expect(screen.getByTestId('detail-review-list')).toBeEmptyDOMElement()
    expect(screen.queryByText('아직 등록된 리뷰가 없어요.')).not.toBeInTheDocument()
  })

  it('opens the desktop detail screen from a direct /places route entry without changing map zoom', () => {
    setViewport(1280)
    window.history.replaceState({}, '', '/places/place-restaurant-1')
    useAppShellStore.setState({ mapLevel: 1 })
    render(<App />)

    expect(screen.getByTestId('desktop-detail-panel')).toHaveTextContent('누리 식당')
    expect(useAppShellStore.getState().mapLevel).toBe(1)
  })

  it('opens the mobile detail screen from a direct /places route entry without changing map zoom', () => {
    setViewport(390)
    window.history.replaceState({}, '', '/places/place-restaurant-1')
    useAppShellStore.setState({ mapLevel: 4 })
    render(<App />)

    expect(screen.getByTestId('mobile-detail-page')).toHaveTextContent('누리 식당')
    expect(useAppShellStore.getState().mapLevel).toBe(4)
  })
})
