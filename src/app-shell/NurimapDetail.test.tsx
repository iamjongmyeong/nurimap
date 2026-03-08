import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { DetailRecommendationControl, DetailReviewComposer } from './NurimapAppShell'
import { resetAppShellStore, useAppShellStore } from './appShellStore'

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

describe('Plan 03 place detail', () => {
  beforeEach(() => {
    resetAppShellStore()
  })

  it('shows the required detail fields', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    const detail = screen.getByTestId('desktop-detail-panel')
    expect(detail).toHaveTextContent('누리 식당')
    expect(detail).toHaveTextContent('서울 마포구 양화로19길 22-16 1층')
    expect(detail).toHaveTextContent('등록자')
    expect(detail).toHaveTextContent('추천 수')
    expect(detail).toHaveTextContent('★ 4.7 · 리뷰 12')
    expect(detail).toHaveTextContent('김누리')
    expect(detail).toHaveTextContent('제로페이 결제가 잘 되고 회전이 빨라요.')
  })

  it('shows the my rating status', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('detail-my-rating-status')).toHaveTextContent('5점')
  })

  it('hides the review compose UI when my review exists', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.queryByTestId('detail-review-compose')).not.toBeInTheDocument()
    expect(screen.getByTestId('detail-my-review')).toBeInTheDocument()
  })

  it('shows the review compose UI when my review does not exist', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))

    expect(screen.getByTestId('detail-review-compose')).toBeInTheDocument()
    expect(screen.queryByTestId('detail-my-review')).not.toBeInTheDocument()
    expect(screen.getByTestId('detail-review-rating-star-5')).toHaveClass('btn-warning')
    expect(screen.getByTestId('detail-review-submit-button')).toHaveTextContent('리뷰 저장')
  })

  it('submits a new review, updates aggregates, and switches to my review state', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))
    await user.click(screen.getByTestId('detail-review-rating-star-4'))
    await user.type(screen.getByTestId('detail-review-content-input'), '상세 화면에서 새 리뷰를 남깁니다.')
    await user.click(screen.getByTestId('detail-review-submit-button'))

    await waitFor(() => {
      expect(screen.getByTestId('detail-my-review')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('detail-review-compose')).not.toBeInTheDocument()
    expect(screen.getByTestId('detail-my-review')).toHaveTextContent('상세 화면에서 새 리뷰를 남깁니다.')
    expect(screen.getByTestId('detail-my-rating-status')).toHaveTextContent('4점')
    expect(screen.getByTestId('desktop-detail-panel')).toHaveTextContent('★ 4.3 · 리뷰 9')
    expect(screen.getByTestId('detail-review-list')).toHaveTextContent('테스트 사용자')
    expect(screen.getByTestId('detail-review-list')).toHaveTextContent('2026-03-08')
  })

  it('shows the review submitting state and disables the save button while saving', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))
    await user.type(screen.getByTestId('detail-review-content-input'), '저장 중 상태 테스트')
    const submitButton = screen.getByTestId('detail-review-submit-button')
    const clickPromise = user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('detail-review-submit-loading')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    await clickPromise
  })

  it('keeps the entered review values after a save failure', async () => {
    const user = userEvent.setup()
    const view = render(
      <DetailReviewComposer
        onSubmit={() => ({
          status: 'error',
          message: '리뷰를 저장하지 못했어요. 다시 시도해 주세요.',
        })}
        placeId="place-review-fail"
      />,
    )

    await user.click(view.getByTestId('detail-review-rating-star-2'))
    await user.type(view.getByTestId('detail-review-content-input'), '실패 후에도 남아 있어야 하는 리뷰')
    await user.click(view.getByTestId('detail-review-submit-button'))

    expect(await view.findByText('리뷰를 저장하지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument()
    expect(view.getByTestId('detail-review-content-input')).toHaveValue('실패 후에도 남아 있어야 하는 리뷰')
    expect(view.getByTestId('detail-review-rating-star-2')).toHaveClass('btn-warning')
    expect(view.getByTestId('detail-review-submit-button')).toHaveTextContent('리뷰 저장')
  })

  it('provides the naver map link', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('detail-naver-link')).toHaveAttribute(
      'href',
      'https://map.naver.com/p/entry/place/10001',
    )
  })

  it('adds and removes a recommendation from the detail screen', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))
    expect(screen.getByTestId('detail-recommendation-count')).toHaveTextContent('5')
    expect(screen.getByTestId('detail-recommendation-button')).toHaveTextContent('추천')

    await user.click(screen.getByTestId('detail-recommendation-button'))
    await waitFor(() => {
      expect(screen.getByTestId('detail-recommendation-count')).toHaveTextContent('6')
      expect(screen.getByTestId('detail-recommendation-button')).toHaveTextContent('추천 취소')
    })

    await user.click(screen.getByTestId('detail-recommendation-button'))
    await waitFor(() => {
      expect(screen.getByTestId('detail-recommendation-count')).toHaveTextContent('5')
      expect(screen.getByTestId('detail-recommendation-button')).toHaveTextContent('추천')
    })
  })

  it('shows the recommendation submitting state and disables the button while toggling', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))
    const button = screen.getByTestId('detail-recommendation-button')
    const clickPromise = user.click(button)

    await waitFor(() => {
      expect(screen.getByTestId('detail-recommendation-loading')).toBeInTheDocument()
      expect(button).toBeDisabled()
    })

    await clickPromise
  })

  it('closes the desktop detail panel and returns to map browse on close', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))
    await user.click(screen.getByRole('button', { name: '상세 패널 닫기' }))

    expect(screen.queryByTestId('desktop-detail-panel')).not.toBeInTheDocument()
  })

  it('shows the mobile detail page as a full-screen page', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('mobile-detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-detail-page')).toHaveTextContent('전체 화면 상세')
  })

  it('returns to the map screen on mobile back and keeps the selected place', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))
    await user.click(screen.getByRole('button', { name: '← 뒤로' }))

    expect(screen.queryByTestId('mobile-detail-page')).not.toBeInTheDocument()
    expect(useAppShellStore.getState().selectedPlaceId).toBe('place-restaurant-1')
    expect(screen.getByTestId('map-center')).toHaveTextContent('37.55918, 126.92374')
  })


  it('returns to the map screen on mobile browser back and keeps the selected place', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(screen.queryByTestId('mobile-detail-page')).not.toBeInTheDocument()
    expect(useAppShellStore.getState().selectedPlaceId).toBe('place-cafe-1')
    expect(screen.getByTestId('map-center')).toHaveTextContent('37.55831, 126.92518')
  })

  it('shows the detail loading state', () => {
    setViewport(1280)
    useAppShellStore.setState({
      navigationState: 'place_detail_open',
      selectedPlaceId: 'place-restaurant-1',
      placeDetailLoad: 'loading',
    })
    render(<App />)

    expect(screen.getByTestId('place-detail-loading')).toBeInTheDocument()
  })

  it('shows the detail error state and retry action', () => {
    setViewport(1280)
    useAppShellStore.setState({
      navigationState: 'place_detail_open',
      selectedPlaceId: 'place-restaurant-1',
      placeDetailLoad: 'error',
    })
    render(<App />)

    expect(screen.getByTestId('place-detail-error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('keeps the last successful recommendation state on failure', async () => {
    const user = userEvent.setup()
    const view = render(
      <DetailRecommendationControl
        active={false}
        canRecommend
        count={3}
        onToggle={() => ({
          status: 'error',
          message: '추천 상태를 변경하지 못했어요. 다시 시도해 주세요.',
        })}
      />,
    )

    await user.click(view.getByTestId('detail-recommendation-button'))

    expect(await view.findByText('추천 상태를 변경하지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument()
    expect(view.getByTestId('detail-recommendation-count')).toHaveTextContent('3')
    expect(view.getByTestId('detail-recommendation-button')).toHaveTextContent('추천')
  })

  it('blocks recommendation when unauthenticated', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    const view = render(
      <DetailRecommendationControl active={false} canRecommend={false} count={3} onToggle={onToggle} />,
    )

    await user.click(view.getByTestId('detail-recommendation-button'))

    expect(await view.findByText('로그인 후에 추천할 수 있어요.')).toBeInTheDocument()
    expect(onToggle).not.toHaveBeenCalled()
    expect(view.getByTestId('detail-recommendation-count')).toHaveTextContent('3')
  })
})
