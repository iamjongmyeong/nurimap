import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { resetAppShellStore } from './app-shell/appShellStore'
import { MOCK_PLACES } from './app-shell/mockPlaces'
import { resetTestAuthState, setTestAuthState } from './auth/testAuthState'

vi.mock('agentation', () => ({
  Agentation: ({ endpoint }: { endpoint?: string }) => (
    <div data-testid="agentation-toolbar" data-endpoint={endpoint ?? ''}>
      Agentation
    </div>
  ),
}))

const originalFetch = globalThis.fetch
const ADD_PLACE_ROUTE = '/add-place'

const cloneMockPlace = (placeId: string) => {
  const matched = MOCK_PLACES.find((place) => place.id === placeId)
  if (!matched) return null
  return {
    ...matched,
    my_review: matched.my_review ? { ...matched.my_review } : null,
    reviews: matched.reviews.map((review) => ({ ...review })),
  }
}

const getPlaceIdFromDetailUrl = (url: string) => {
  const match = url.match(/^\/api\/places\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

const isPlaceReviewUrl = (url: string) => /^\/api\/places\/[^/]+\/reviews$/.test(url)

const createAppShellFetchMock = () =>
  vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)

    if (url === '/api/places') {
      return new Response(JSON.stringify({
        status: 'success',
        places: MOCK_PLACES,
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

    if (isPlaceReviewUrl(url)) {
      return new Response(JSON.stringify({ error: { message: 'not implemented in this suite' } }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    if (url === 'http://localhost:4747/health') {
      return new Response(JSON.stringify({ status: 'unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ status: 'missing' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })

const createAuthenticatedAppShellFetchMock = () => {
  const baseFetchMock = createAppShellFetchMock()

  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)

    if (url === '/api/auth/session') {
      return new Response(JSON.stringify({
        status: 'authenticated',
        user: {
          id: 'user-1',
          email: 'tester@nurimedia.co.kr',
          name: '테스트 사용자',
        },
        csrfHeaderName: 'x-nurimap-csrf-token',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    return await baseFetchMock(input)
  })
}

const setViewport = (width: number, height = 844) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: height,
  })

  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

describe('Nurimap app shell', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    resetAppShellStore()
    resetTestAuthState()
    window.history.replaceState({}, '', '/')
    globalThis.fetch = createAppShellFetchMock() as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    resetTestAuthState()
    globalThis.fetch = originalFetch
  })

  it('renders Agentation in local mode when explicitly enabled without a healthy sync server', async () => {
    vi.stubEnv('VITE_ENABLE_AGENTATION', 'true')
    setViewport(1280)
    render(<App />)

    const toolbar = await screen.findByTestId('agentation-toolbar')
    expect(toolbar).toHaveAttribute('data-endpoint', '')
  })

  it('passes the sync endpoint to Agentation after the health check succeeds', async () => {
    vi.stubEnv('VITE_ENABLE_AGENTATION', 'true')
    const fetchMock = createAppShellFetchMock()
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === 'http://localhost:4747/health') {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      return await createAppShellFetchMock()(input)
    })
    globalThis.fetch = fetchMock as typeof fetch
    setViewport(1280)
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('agentation-toolbar')).toHaveAttribute('data-endpoint', 'http://localhost:4747')
    })
  })

  it('renders the desktop sidebar with the white surface background', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('desktop-sidebar')).toHaveClass('bg-[#fff]')
  })

  it('renders the desktop floating detail panel when detail is open', () => {
    setViewport(1280)
    window.history.replaceState({}, '', '/places/place-restaurant-1')
    render(<App />)

    expect(screen.getByTestId('desktop-detail-panel')).toBeInTheDocument()
  })

  it('keeps the map visible behind the desktop detail panel', () => {
    setViewport(1280)
    window.history.replaceState({}, '', '/places/place-restaurant-1')
    render(<App />)

    expect(screen.getByTestId('map-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('desktop-detail-panel')).toBeInTheDocument()
  })

  it('renders the mobile bottom tab bar over the full-screen list page on first entry', () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(390)
    render(<App />)

    expect(screen.getByTestId('mobile-shell')).toHaveClass('overflow-hidden')
    expect(screen.getByTestId('mobile-shell')).toHaveStyle({
      top: 'var(--nurimap-viewport-offset-top, 0px)',
      height: 'var(--nurimap-viewport-height, 100dvh)',
      minHeight: 'var(--nurimap-viewport-height, 100dvh)',
    })
    expect(screen.getByTestId('mobile-list-page')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-list-header')).toContainElement(screen.getByAltText('Nurimedia 로고'))
    expect(screen.getByTestId('mobile-list-header-content')).toHaveClass('pl-6', 'pr-5', 'pt-6', 'pb-4')
    expect(screen.getByTestId('mobile-list-header')).toHaveStyle({
      paddingTop: 'var(--nurimap-safe-area-top, 0px)',
    })
    expect(screen.getByTestId('mobile-list-header').className).not.toContain('border-b')
    expect(screen.getByTestId('mobile-list-page')).toHaveTextContent('누리맵')
    expect(screen.getByTestId('mobile-list-page')).toHaveClass('h-full', 'min-h-0', 'overflow-hidden', 'pb-14')
    expect(screen.getByTestId('mobile-list-page')).toHaveStyle({
      paddingBottom: 'calc(56px + var(--nurimap-safe-area-bottom, 0px))',
    })
    expect(screen.getByTestId('mobile-list-scroll-region')).toHaveClass('overflow-y-auto', 'overscroll-contain')
    expect(screen.getByTestId('mobile-list-login-button')).toHaveAccessibleName('로그인')
    expect(screen.getByTestId('mobile-list-login-button')).toHaveClass('h-6', 'w-6')
    expect(screen.getByTestId('mobile-list-login-button')).toHaveClass('text-[#C9C9C9]')
    expect(screen.getByTestId('mobile-list-login-button').className).not.toContain('border')
    expect(screen.getByTestId('mobile-bottom-tab-bar')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-bottom-tab-bar')).toHaveClass('fixed')
    expect(screen.getByTestId('mobile-bottom-tab-bar')).toHaveStyle({
      paddingBottom: 'var(--nurimap-safe-area-bottom, 0px)',
    })
    expect(screen.getByTestId('mobile-bottom-tab-bar')).toHaveClass('h-14')
    expect(screen.getByTestId('mobile-bottom-tab-bar').className).not.toContain('shadow-[')
    expect(screen.getByTestId('mobile-bottom-tab-bar').className).toContain('before:bg-[#f0f0f0]')
    expect(screen.getByTestId('mobile-bottom-tab-bar-grid')).toHaveClass('h-14')
    expect(Array.from(screen.getByTestId('mobile-bottom-tab-bar-grid').children).map((child) => child.getAttribute('data-testid'))).toEqual([
      'mobile-tab-list',
      'mobile-tab-add',
      'mobile-tab-map',
    ])
    expect(screen.getByTestId('mobile-tab-list')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('mobile-tab-map')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('mobile-tab-list')).toHaveClass('h-10', 'w-10', 'px-2', 'pt-[2px]', 'pb-0', 'gap-1')
    expect(screen.getByTestId('mobile-tab-add')).toHaveClass('h-10', 'w-10', 'px-2', 'pt-[2px]', 'pb-0', 'gap-1')
    expect(screen.getByTestId('mobile-tab-map')).toHaveClass('h-10', 'w-10', 'px-2', 'pt-[2px]', 'pb-0', 'gap-1')
    expect(screen.getByTestId('mobile-tab-list-icon')).toHaveClass('h-6', 'w-6', 'shrink-0')
    expect(screen.getByTestId('mobile-tab-add-icon')).toHaveClass('h-6', 'w-6', 'shrink-0')
    expect(screen.getByTestId('mobile-tab-map-icon')).toHaveClass('h-6', 'w-6', 'shrink-0')
    expect(screen.getByText('목록')).toHaveClass('h-[10px]', 'whitespace-nowrap', "font-['Pretendard']", 'text-[10px]', 'font-normal', 'leading-[10px]')
    expect(screen.getByText('추가')).toHaveClass('h-[10px]', 'whitespace-nowrap', "font-['Pretendard']", 'text-[10px]', 'font-normal', 'leading-[10px]')
    expect(screen.getByText('지도')).toHaveClass('h-[10px]', 'whitespace-nowrap', "font-['Pretendard']", 'text-[10px]', 'font-normal', 'leading-[10px]')
    expect(screen.getByTestId('mobile-tab-list-icon')).toHaveAttribute('src', '/assets/icons/icon-bottom-tab-list-black.svg')
    expect(screen.getByTestId('mobile-tab-add-icon')).toHaveAttribute('src', '/assets/icons/icon-bottom-tab-plus-gray.svg')
    expect(screen.getByTestId('mobile-tab-map-icon')).toHaveAttribute('src', '/assets/icons/icon-bottom-tab-map-gray.svg')
    expect(screen.getByText('목록')).toBeInTheDocument()
    expect(screen.getByText('추가')).toBeInTheDocument()
    expect(screen.getByText('지도')).toBeInTheDocument()
  })

  it('moves to the mobile map page when the map button is clicked from the list-first root', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByTestId('mobile-list-page')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-list-logout-button')).toHaveClass('text-[#C9C9C9]')
    expect(screen.getByTestId('mobile-list-logout-button').querySelector('img')).toHaveAttribute('src', '/assets/icons/icon-auth-logout.svg')
    expect(screen.getByTestId('mobile-tab-list')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('mobile-tab-map')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('mobile-tab-map-icon')).toHaveAttribute('src', '/assets/icons/icon-bottom-tab-map-gray.svg')
    expect(screen.getByTestId('mobile-tab-list-icon')).toHaveAttribute('src', '/assets/icons/icon-bottom-tab-list-black.svg')

    await user.click(screen.getByRole('button', { name: '지도' }))

    expect(screen.getByTestId('map-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('map-canvas')).toHaveClass('h-full', 'min-h-0')
    expect(screen.getByTestId('mobile-tab-map')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('mobile-tab-list')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('mobile-tab-map-icon')).toHaveAttribute('src', '/assets/icons/icon-bottom-tab-map-black.svg')
    expect(screen.getByTestId('mobile-tab-list-icon')).toHaveAttribute('src', '/assets/icons/icon-bottom-tab-list-gray.svg')
  })

  it('renders the mobile list-first page instead of the unified browse bootstrap while the Kakao runtime is still bootstrapping', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('PUBLIC_KAKAO_MAP_APP_KEY', 'test-kakao-key')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    globalThis.fetch = createAuthenticatedAppShellFetchMock() as typeof fetch
    setViewport(390)
    render(<App />)

    expect(await screen.findByTestId('mobile-list-page')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-tab-list')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('mobile-tab-map')).toHaveAttribute('data-active', 'false')
    expect(screen.queryByTestId('browse-bootstrap-loading')).not.toBeInTheDocument()
    expect(screen.queryByTestId('browse-bootstrap-error')).not.toBeInTheDocument()
  })

  it('shows the map surface loading state instead of the unified browse bootstrap when the map tab is opened before the Kakao runtime is ready', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('PUBLIC_KAKAO_MAP_APP_KEY', 'test-kakao-key')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    globalThis.fetch = createAuthenticatedAppShellFetchMock() as typeof fetch
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await screen.findByTestId('mobile-list-page')
    await user.click(screen.getByRole('button', { name: '지도' }))

    expect(screen.getByTestId('mobile-tab-map')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('map-loading-state')).toBeInTheDocument()
    expect(screen.queryByTestId('browse-bootstrap-loading')).not.toBeInTheDocument()
  })

  it('locks document scroll for the mobile shell and restores it on unmount', () => {
    setViewport(390)
    const { unmount } = render(<App />)

    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.overscrollBehavior).toBe('none')
    expect(document.documentElement.style.getPropertyValue('--nurimap-viewport-height')).toBe('844px')

    unmount()

    expect(document.documentElement.style.overflow).toBe('')
    expect(document.body.style.overflow).toBe('')
    expect(document.body.style.overscrollBehavior).toBe('')
  })

  it('hydrates safe-area viewport variables from visualViewport metrics for embedded webviews', () => {
    const originalVisualViewport = window.visualViewport
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()

    setViewport(390, 844)
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 780,
        offsetTop: 24,
        addEventListener,
        removeEventListener,
      },
    })

    const { unmount } = render(<App />)

    expect(document.documentElement.style.getPropertyValue('--nurimap-viewport-height')).toBe('780px')
    expect(document.documentElement.style.getPropertyValue('--nurimap-viewport-offset-top')).toBe('24px')
    expect(document.documentElement.style.getPropertyValue('--nurimap-viewport-offset-bottom')).toBe('40px')
    expect(screen.getByTestId('mobile-shell')).toHaveStyle({
      top: 'var(--nurimap-viewport-offset-top, 0px)',
      height: 'var(--nurimap-viewport-height, 100dvh)',
    })
    expect(screen.getByTestId('mobile-bottom-tab-bar')).toHaveStyle({
      paddingBottom: 'var(--nurimap-safe-area-bottom, 0px)',
    })
    expect(addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))

    unmount()
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: originalVisualViewport,
    })
  })

  it('does not render the mobile bottom tab bar on desktop', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.queryByTestId('mobile-bottom-tab-bar')).not.toBeInTheDocument()
  })

  it('opens the desktop sidebar place-add surface at /add-place when the add CTA is clicked', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))

    expect(window.location.pathname).toBe(ADD_PLACE_ROUTE)
    expect(screen.getByTestId('desktop-sidebar')).toContainElement(screen.getByTestId('desktop-place-add-panel'))
  })

  it('opens the mobile place-add page at /add-place and hides the bottom tab bar when the add tab is clicked', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))

    expect(window.location.pathname).toBe(ADD_PLACE_ROUTE)
    expect(screen.getByTestId('mobile-place-add-page')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-bottom-tab-bar')).not.toBeInTheDocument()
  })

  it('restores the prior mobile list context when browser back leaves /add-place', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    expect(screen.getByTestId('mobile-list-page')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    expect(window.location.pathname).toBe(ADD_PLACE_ROUTE)
    expect(screen.getByTestId('mobile-place-add-page')).toBeInTheDocument()

    act(() => {
      window.history.back()
    })

    await waitFor(() => {
      expect(window.location.pathname).toBe('/')
      expect(screen.getByTestId('mobile-list-page')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-tab-list')).toHaveAttribute('data-active', 'true')
    })
  })

  it('opens the desktop sidebar place-add surface on direct /add-place entry when authenticated', () => {
    setViewport(1280)
    window.history.replaceState({}, '', ADD_PLACE_ROUTE)
    render(<App />)

    expect(screen.getByTestId('desktop-sidebar')).toContainElement(screen.getByTestId('desktop-place-add-panel'))
  })

  it('opens the mobile place-add page on direct /add-place entry when authenticated and falls back to the list-first root on browser back', async () => {
    setViewport(390)
    window.history.replaceState({}, '', ADD_PLACE_ROUTE)
    render(<App />)

    expect(screen.getByTestId('mobile-place-add-page')).toBeInTheDocument()
    expect(window.location.pathname).toBe(ADD_PLACE_ROUTE)

    act(() => {
      window.history.back()
    })

    await waitFor(() => {
      expect(window.location.pathname).toBe('/')
      expect(screen.getByTestId('mobile-list-page')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-tab-list')).toHaveAttribute('data-active', 'true')
      expect(screen.getByTestId('mobile-tab-map')).toHaveAttribute('data-active', 'false')
    })
  })

  it('returns to desktop browse when anonymous direct /add-place entry is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    window.history.replaceState({}, '', ADD_PLACE_ROUTE)
    render(<App />)

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith('누가 추가했는지 알 수 있도록 로그인해주세요.')
    })

    await waitFor(() => {
      expect(window.location.pathname).toBe('/')
    })

    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
    expect(screen.queryByTestId('desktop-place-add-panel')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '인증 코드 전송' })).not.toBeInTheDocument()
  })

  it('restores direct /add-place entry after anonymous desktop auth succeeds', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    window.history.replaceState({}, '', ADD_PLACE_ROUTE)
    render(<App />)

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith('누가 추가했는지 알 수 있도록 로그인해주세요.')
    })

    expect(await screen.findByRole('button', { name: '인증 코드 전송' })).toBeInTheDocument()

    setTestAuthState({
      phase: 'authenticated',
      user: { email: 'tester@nurimedia.co.kr', name: '테스트 사용자' },
      message: null,
      failureReason: null,
    })

    await waitFor(() => {
      expect(window.location.pathname).toBe(ADD_PLACE_ROUTE)
      expect(screen.getByTestId('desktop-sidebar')).toContainElement(screen.getByTestId('desktop-place-add-panel'))
    })
  })

  it('renders the compact desktop add button inside the refreshed top bar', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('desktop-browse-topbar')).toContainElement(screen.getByTestId('desktop-add-button'))
    expect(screen.getByTestId('desktop-add-button')).toHaveTextContent('추가')
    expect(screen.getByTestId('desktop-add-button')).toHaveAccessibleName('장소 추가')
    expect(screen.getByTestId('desktop-add-button')).toHaveClass('h-9')
  })

})
