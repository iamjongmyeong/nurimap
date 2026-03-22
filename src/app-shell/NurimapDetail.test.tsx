import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { resetAppShellStore, useAppShellStore } from './appShellStore'
import type { PlaceSummary } from './types'

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

describe('Sprint 16 place detail refresh', () => {
  beforeEach(() => {
    resetAppShellStore()
    window.history.replaceState({}, '', '/')
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
    expect(screen.getByTestId('detail-meta-type')).toHaveTextContent('식당')
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

  it('returns from desktop detail to browse mode with the new back control', async () => {
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
  })

  it('keeps the map visible while desktop detail is shown in the sidebar', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('map-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('map-level')).toHaveTextContent('level 2')
    expect(screen.getByTestId('desktop-sidebar')).toContainElement(screen.getByTestId('desktop-detail-panel'))
  })

  it('shows the refreshed mobile detail page as a full-screen page', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('mobile-detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-detail-page')).toHaveTextContent('누리 식당')
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
    expect(screen.getByTestId('detail-review-cta')).toHaveClass('h-10', 'w-full', 'shrink-0', 'gap-[10px]', 'px-0', 'py-2', 'text-sm', 'rounded-[12px]', 'bg-[#5862fb]')
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
    expect(await screen.findByTestId('review-add-surface')).toHaveTextContent('평가')
    expect(screen.getByTestId('review-add-surface')).toHaveTextContent('후기(선택)')
    expect(screen.getByText('평가')).toHaveClass("font-['Pretendard']", 'text-[12px]', 'font-medium', 'leading-[18px]', 'tracking-[-0.3px]', 'text-[#1c1c1c]')
    expect(screen.getByText('후기(선택)')).toHaveClass("font-['Pretendard']", 'text-[12px]', 'font-medium', 'leading-[18px]', 'tracking-[-0.3px]', 'text-[#1c1c1c]')
    expect(screen.getByTestId('review-add-submit-button')).toHaveTextContent('등록')
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

  it('grows the add-rating review textarea height when the entered content exceeds the minimum height', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))
    await user.click(screen.getByRole('button', { name: '평가 남기기' }))

    const reviewInput = screen.getByTestId('review-add-content-input') as HTMLTextAreaElement

    Object.defineProperty(reviewInput, 'scrollHeight', {
      configurable: true,
      value: 164,
    })

    await user.type(reviewInput, '첫 줄\\n둘째 줄\\n셋째 줄\\n넷째 줄\\n다섯째 줄\\n여섯째 줄')

    expect(reviewInput.style.height).toBe('164px')
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

  it('returns to the map screen on mobile back and keeps the selected place', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))
    expect(window.location.pathname).toBe('/places/place-restaurant-1')
    await user.click(screen.getByRole('button', { name: '뒤로 가기' }))

    expect(window.location.pathname).toBe('/')
    expect(screen.queryByTestId('mobile-detail-page')).not.toBeInTheDocument()
    expect(useAppShellStore.getState().selectedPlaceId).toBe('place-restaurant-1')
    expect(screen.getByTestId('map-level')).toHaveTextContent('level 2')
    expect(screen.queryByTestId('map-center')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-focus-place')).not.toBeInTheDocument()
  })

  it('returns to the map screen on mobile browser back and keeps the selected place', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))
    expect(window.location.pathname).toBe('/places/place-cafe-1')

    act(() => {
      window.history.replaceState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(window.location.pathname).toBe('/')
    expect(screen.queryByTestId('mobile-detail-page')).not.toBeInTheDocument()
    expect(useAppShellStore.getState().selectedPlaceId).toBe('place-cafe-1')
    expect(screen.getByTestId('map-level')).toHaveTextContent('level 2')
    expect(screen.queryByTestId('map-center')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-focus-place')).not.toBeInTheDocument()
  })

  it('shows the detail loading state', () => {
    setViewport(1280)
    window.history.replaceState({}, '', '/places/place-restaurant-1')
    useAppShellStore.setState({
      selectedPlaceId: 'place-restaurant-1',
      placeDetailLoad: 'loading',
    })
    render(<App />)

    expect(screen.getByTestId('place-detail-loading')).toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
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

  it('opens the detail screen from a direct /places route entry', () => {
    setViewport(1280)
    window.history.replaceState({}, '', '/places/place-restaurant-1')
    render(<App />)

    expect(screen.getByTestId('desktop-detail-panel')).toHaveTextContent('누리 식당')
    expect(screen.getByTestId('map-level')).toHaveTextContent('level 2')
  })
})
