import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { resetAppShellStore, useAppShellStore } from './app-shell/appShellStore'

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

describe('Nurimap app shell', () => {
  beforeEach(() => {
    resetAppShellStore()
  })

  it('renders the desktop sidebar', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
  })

  it('renders the desktop floating detail panel when detail is open', () => {
    setViewport(1280)
    useAppShellStore.setState({ navigationState: 'place_detail_open', selectedPlaceId: 'place-restaurant-1' })
    render(<App />)

    expect(screen.getByTestId('desktop-detail-panel')).toBeInTheDocument()
  })

  it('keeps the map visible behind the desktop detail panel', () => {
    setViewport(1280)
    useAppShellStore.setState({ navigationState: 'place_detail_open', selectedPlaceId: 'place-restaurant-1' })
    render(<App />)

    expect(screen.getByTestId('map-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('desktop-detail-panel')).toBeInTheDocument()
  })

  it('renders the mobile floating buttons', () => {
    setViewport(390)
    render(<App />)

    expect(screen.getByTestId('mobile-floating-actions')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '목록 보기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '장소 추가' })).toBeInTheDocument()
  })

  it('moves to the mobile place list page when the list button is clicked', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))

    expect(screen.getByTestId('mobile-list-page')).toBeInTheDocument()
  })

  it('does not render mobile floating actions on desktop', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.queryByTestId('mobile-floating-actions')).not.toBeInTheDocument()
  })

  it('renders the desktop add button with the required size', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('desktop-add-button')).toHaveStyle({
      width: '342px',
      height: '48px',
    })
  })

  it('renders the empty state when the list state is empty', () => {
    setViewport(1280)
    useAppShellStore.setState({ placeListLoad: 'empty' })
    render(<App />)

    expect(screen.getByText('아직 등록된 장소가 없어요')).toBeInTheDocument()
  })
})
