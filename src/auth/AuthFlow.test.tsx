import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { AuthProvider } from './AuthProvider'
import { resetTestAuthState, setTestAuthState } from './testAuthState'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getSessionMock,
  getUserMock,
  verifyOtpMock,
  signOutMock,
  updateUserMock,
  onAuthStateChangeMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  getUserMock: vi.fn(),
  verifyOtpMock: vi.fn(),
  signOutMock: vi.fn(),
  updateUserMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
}))

vi.mock('agentation', () => ({
  Agentation: () => null,
}))

vi.mock('./supabaseBrowser', () => ({
  supabaseBrowser: {
    auth: {
      getSession: getSessionMock,
      getUser: getUserMock,
      verifyOtp: verifyOtpMock,
      signOut: signOutMock,
      updateUser: updateUserMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
  },
}))

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

describe('Sprint 12 auth flow', () => {
  beforeEach(() => {
    resetTestAuthState()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    window.localStorage.clear()
    window.history.replaceState({}, '', '/')
    getSessionMock.mockResolvedValue({ data: { session: null } })
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })
    verifyOtpMock.mockResolvedValue({
      data: { session: null, user: null },
      error: new Error('verifyOtp not configured'),
    })
    signOutMock.mockResolvedValue({ error: null })
    updateUserMock.mockResolvedValue({ error: null })
    onAuthStateChangeMock.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    window.history.replaceState({}, '', '/')
  })

  it('blocks protected screens when unauthenticated', () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    render(<App />)

    expect(screen.getByText('NURIMAP LOGIN')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이메일로 로그인 링크 전송' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('example@nurimedia.co.kr')).toBeInTheDocument()
    expect(screen.queryByText('@nurimedia.co.kr 이메일로 로그인 링크를 요청할 수 있습니다.')).not.toBeInTheDocument()
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument()
  })

  it('keeps the email label accessible while visually hiding it', () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    render(<App />)

    expect(screen.getByLabelText('이메일')).toHaveAttribute('placeholder', 'example@nurimedia.co.kr')
    expect(screen.getByText('이메일')).toHaveClass('sr-only')
  })

  it('shows the empty-email warning when submitted without input', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '이메일로 로그인 링크 전송' }))

    expect(await screen.findByText('이메일을 입력해 주세요.')).toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).toHaveValue('')
  })

  it('shows an inline error and keeps the email input for an invalid domain', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('이메일')
    await user.type(input, 'user@example.com')
    await user.click(screen.getByRole('button', { name: '이메일로 로그인 링크 전송' }))

    expect(await screen.findByText('누리미디어 구성원만 사용할 수 있어요.')).toBeInTheDocument()
    expect(input).toHaveValue('user@example.com')
  })

  it('shows the cooldown inline error and keeps the email input', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('이메일')
    await user.type(input, 'cooldown@nurimedia.co.kr')
    await user.click(screen.getByRole('button', { name: '이메일로 로그인 링크 전송' }))

    expect(await screen.findByText('300초 후에 다시 시도해 주세요.')).toBeInTheDocument()
    expect(input).toHaveValue('cooldown@nurimedia.co.kr')
  })

  it('shows the daily limit inline error and keeps the email input', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('이메일')
    await user.type(input, 'limit@nurimedia.co.kr')
    await user.click(screen.getByRole('button', { name: '이메일로 로그인 링크 전송' }))

    expect(await screen.findByText('오늘은 더 이상 로그인 링크를 요청할 수 없어요.')).toBeInTheDocument()
    expect(input).toHaveValue('limit@nurimedia.co.kr')
  })

  it('disables the request button while requesting the login link', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'tester@nurimedia.co.kr')
    const button = screen.getByRole('button', { name: '이메일로 로그인 링크 전송' })
    const clickPromise = user.click(button)

    await waitFor(() => {
      expect(button).toBeDisabled()
    })

    await clickPromise
    expect(await screen.findByText('로그인 링크를 보냈어요.')).toBeInTheDocument()
  })

  it('shows the link-sent state inside the same auth shell with the requested email', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'tester@nurimedia.co.kr')
    await user.click(screen.getByRole('button', { name: '이메일로 로그인 링크 전송' }))

    expect(await screen.findByText('로그인 링크를 보냈어요.')).toBeInTheDocument()
    expect(screen.getByText('tester@nurimedia.co.kr')).toBeInTheDocument()
    expect(screen.getByText('NURIMAP LOGIN')).toBeInTheDocument()
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument()
  })

  it('submits when enter is pressed in a non-empty email input', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'tester@nurimedia.co.kr{enter}')

    expect(await screen.findByText('로그인 링크를 보냈어요.')).toBeInTheDocument()
    expect(screen.getByText('tester@nurimedia.co.kr')).toBeInTheDocument()
  })

  it('immediately enters the onboarding flow for a bypass test account', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'bypass.user@example.com')
    await user.click(screen.getByTestId('auth-request-button'))

    expect(await screen.findByText('이름 입력')).toBeInTheDocument()
    expect(screen.queryByTestId('auth-request-button')).not.toBeInTheDocument()
  })

  it('shows the verifying state while processing the login link', () => {
    setTestAuthState({ phase: 'verifying', user: null, message: null, failureReason: null })
    render(<App />)

    expect(screen.getByText('로그인 링크를 확인하는 중입니다.')).toBeInTheDocument()
  })

  it('moves to the auth failure screen and clears the verify query when the refresh-time verify request rejects', async () => {
    vi.stubEnv('MODE', 'development')
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/?auth_mode=verify&email=tester%40nurimedia.co.kr&nonce=nonce-1')

    render(
      <AuthProvider>
        <div data-testid="protected-child" />
      </AuthProvider>,
    )

    expect(screen.getByText('로그인 링크를 확인하는 중입니다.')).toBeInTheDocument()

    expect(await screen.findByText('인증에 실패했어요')).toBeInTheDocument()
    expect(screen.queryByText('로그인 링크를 확인하는 중입니다.')).not.toBeInTheDocument()
    expect(window.location.search).toBe('')
  })

  it('clears the verify query immediately before the refresh-time verify request resolves', async () => {
    vi.stubEnv('MODE', 'development')
    let resolveFetch!: (value: Response) => void
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/?auth_mode=verify&email=tester%40nurimedia.co.kr&nonce=nonce-2')

    render(
      <AuthProvider>
        <div data-testid="protected-child" />
      </AuthProvider>,
    )

    expect(screen.getByText('로그인 링크를 확인하는 중입니다.')).toBeInTheDocument()
    await waitFor(() => {
      expect(window.location.search).toBe('')
    })

    await act(async () => {
      resolveFetch(
        new Response(
          JSON.stringify({
            status: 'error',
            reason: 'invalidated',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
    })

    expect(await screen.findByText('인증에 실패했어요')).toBeInTheDocument()
  })

  it('restores an existing session instead of re-verifying a stale refresh query', async () => {
    vi.stubEnv('MODE', 'development')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/?auth_mode=verify&email=tester%40nurimedia.co.kr&nonce=stale-nonce')

    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'existing-session-token',
        },
      },
    })
    getUserMock.mockResolvedValue({
      data: {
        user: {
          email: 'tester@nurimedia.co.kr',
          user_metadata: {
            name: '테스트 사용자',
          },
        },
      },
      error: null,
    })

    render(
      <AuthProvider>
        <div data-testid="protected-child" />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('protected-child')).toBeInTheDocument()
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(window.location.search).toBe('')
  })

  it('shows the auth failure screen CTA and returns to the login form', async () => {
    setTestAuthState({ phase: 'auth_failure', user: null, message: null, failureReason: 'expired' })
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('인증에 실패했어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '새 로그인 링크 받기' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '이메일 다시 입력' }))

    expect(await screen.findByRole('button', { name: '이메일로 로그인 링크 전송' })).toBeInTheDocument()
  })

  it('shows the name capture screen for users without a name and requires at least one character', async () => {
    setTestAuthState({
      phase: 'name_required',
      user: { email: 'tester@nurimedia.co.kr', name: null },
      message: null,
      failureReason: null,
    })
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '이름 저장' }))
    expect(screen.getByText('이름을 입력해 주세요.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('이름'), '김')
    await user.click(screen.getByRole('button', { name: '이름 저장' }))

    await waitFor(() => {
      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
    })
  })

  it('shows the authenticated app directly when the user already has a name', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
  })

  it('blocks protected screens again after logout', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(await screen.findByRole('button', { name: '이메일로 로그인 링크 전송' })).toBeInTheDocument()
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument()
  })
})
