import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
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

describe('Plan 02 browse basics', () => {
  beforeEach(() => {
    resetAppShellStore()
  })

  it('shows the initial map center coordinates', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('map-center')).toHaveTextContent('37.558721, 126.92444')
  })

  it('renders restaurant and cafe markers with different marker types', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('map-marker-place-restaurant-1')).toHaveAttribute('data-marker-type', 'restaurant')
    expect(screen.getByTestId('map-marker-place-cafe-1')).toHaveAttribute('data-marker-type', 'cafe')
  })

  it('opens the detail flow when a map marker is selected', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('map-marker-place-cafe-1'))

    expect(screen.getByTestId('desktop-detail-panel')).toHaveTextContent('양화로 카페')
  })

  it('shows marker labels at level 5', () => {
    setViewport(1280)
    useAppShellStore.setState({ mapLevel: 5 })
    render(<App />)

    expect(screen.getByTestId('map-label-place-restaurant-1')).toBeInTheDocument()
  })

  it('hides marker labels at level 6', () => {
    setViewport(1280)
    useAppShellStore.setState({ mapLevel: 6 })
    render(<App />)

    expect(screen.queryByTestId('map-label-place-restaurant-1')).not.toBeInTheDocument()
  })

  it('does not render map markers for places without coordinates', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.queryByTestId('map-marker-place-no-coord')).not.toBeInTheDocument()
  })

  it('renders list fields for places in the desktop sidebar', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('place-list-item-place-restaurant-1')).toHaveTextContent('누리 식당')
    expect(screen.getByTestId('place-list-item-place-restaurant-1')).toHaveTextContent('★ 4.7 · 리뷰 12')
  })

  it('shows the zeropay badge only for available places', () => {
    setViewport(1280)
    render(<App />)

    expect(within(screen.getByTestId('place-list-item-place-restaurant-1')).getByTestId('zeropay-badge')).toBeInTheDocument()
    expect(screen.getByTestId('place-list-item-place-cafe-1')).not.toHaveTextContent('제로페이')
    expect(screen.getByTestId('place-list-item-place-restaurant-2')).not.toHaveTextContent('제로페이')
  })

  it('opens the detail flow when a desktop list item is selected', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-2'))

    expect(screen.getByTestId('desktop-detail-panel')).toHaveTextContent('합정 점심집')
  })

  it('opens the full-screen mobile detail page when a mobile list item is selected', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('mobile-detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-detail-page')).toHaveTextContent('누리 식당')
  })

  it('renders the loading state in the list area', () => {
    setViewport(1280)
    useAppShellStore.setState({ placeListLoad: 'loading' })
    render(<App />)

    expect(screen.getByTestId('place-list-loading')).toBeInTheDocument()
  })

  it('renders the error state and retry action in the list area', () => {
    setViewport(1280)
    useAppShellStore.setState({ placeListLoad: 'error' })
    render(<App />)

    expect(screen.getByTestId('place-list-error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })
})
