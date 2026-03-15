import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { AuthProvider } from './AuthProvider'
import { AUTH_BOOTSTRAP_TIMEOUT_MS, GENERIC_AUTH_FAILURE_MESSAGE } from './authVerification'
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
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    window.history.replaceState({}, '', '/')
  })

  it('blocks protected screens when unauthenticated', () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    render(<App />)

    expect(screen.getByText('누리맵')).toBeInTheDocument()
    expect(screen.getByText('누리미디어에서 사용 중인 이메일을 입력해주세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인 링크 전송' })).toBeInTheDocument()
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

  it('keeps the submit button disabled until the email format is valid', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('이메일')
    const button = screen.getByRole('button', { name: '로그인 링크 전송' })

    expect(button).toBeDisabled()

    await user.type(input, 'invalid-email')
    expect(button).toBeDisabled()

    await user.clear(input)
    await user.type(input, 'tester@nurimedia.co.kr')
    expect(button).toBeEnabled()
  })

  it('keeps the auth form controls at 40px height and shows a disabled cursor before activation', () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    render(<App />)

    expect(screen.getByLabelText('이메일')).toHaveClass('h-10')
    expect(screen.getByTestId('auth-request-button')).toBeDisabled()
    expect(screen.getByTestId('auth-request-button')).toHaveClass(
      'h-10',
      'disabled:pointer-events-auto',
      'disabled:cursor-not-allowed',
    )
  })

  it('shows an inline error and keeps the email input for an invalid domain', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('이메일')
    await user.type(input, 'user@example.com')
    await user.click(screen.getByRole('button', { name: '로그인 링크 전송' }))

    expect(await screen.findByText('누리미디어 구성원만 사용할 수 있어요.')).toBeInTheDocument()
    expect(input).toHaveValue('user@example.com')
  })

  it('shows the cooldown inline error and keeps the email input', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    setViewport(1280)
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'error',
          message: '1분 07초 후에 다시 시도해주세요.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    const input = await screen.findByLabelText('이메일')
    await user.type(input, 'cooldown@nurimedia.co.kr')
    await user.click(screen.getByRole('button', { name: '로그인 링크 전송' }))

    expect(await screen.findByText('1분 07초 후에 다시 시도해주세요.')).toBeInTheDocument()
    expect(input).toHaveValue('cooldown@nurimedia.co.kr')
  })

  it('shows the cooldown inline error without minutes when less than a minute remains', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    setViewport(1280)
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'error',
          message: '42초 후에 다시 시도해주세요.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    const input = await screen.findByLabelText('이메일')
    await user.type(input, 'cooldown@nurimedia.co.kr')
    await user.click(screen.getByRole('button', { name: '로그인 링크 전송' }))

    expect(await screen.findByText('42초 후에 다시 시도해주세요.')).toBeInTheDocument()
    expect(input).toHaveValue('cooldown@nurimedia.co.kr')
  })

  it('disables the request button while requesting the login link', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'tester@nurimedia.co.kr')
    const button = screen.getByRole('button', { name: '로그인 링크 전송' })
    const clickPromise = user.click(button)

    await waitFor(() => {
      expect(button).toBeDisabled()
    })

    await clickPromise
    expect(await screen.findByText('로그인 링크를 보냈어요. 메일함을 확인해 주세요.')).toBeInTheDocument()
  })

  it('shows the link-sent state inside the same auth shell with the requested email', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'tester@nurimedia.co.kr')
    await user.click(screen.getByRole('button', { name: '로그인 링크 전송' }))

    expect(await screen.findByText('로그인 링크를 보냈어요. 메일함을 확인해 주세요.')).toBeInTheDocument()
    expect(screen.getByTestId('auth-requested-email')).toHaveTextContent('tester@nurimedia.co.kr')
    expect(screen.getByText('누리맵')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인 링크 다시 전송' })).toBeInTheDocument()
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument()
  })

  it('submits when enter is pressed in a non-empty email input', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'tester@nurimedia.co.kr{enter}')

    expect(await screen.findByText('로그인 링크를 보냈어요. 메일함을 확인해 주세요.')).toBeInTheDocument()
    expect(screen.getByTestId('auth-requested-email')).toHaveTextContent('tester@nurimedia.co.kr')
  })

  it('immediately enters the onboarding flow for a bypass test account', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'bypass.user@example.com')
    await user.click(screen.getByTestId('auth-request-button'))

    expect(await screen.findByText('누리맵에서 사용할 이름을 입력해주세요.')).toBeInTheDocument()
    expect(screen.queryByTestId('auth-request-button')).not.toBeInTheDocument()
  })

  it('converges to auth failure instead of leaving bypass re-login stuck in verifying after logout', async () => {
    vi.stubEnv('MODE', 'development')
    setViewport(1280)

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
          email: 'bypass.named@example.com',
          user_metadata: {
            name: '테스트 사용자',
          },
        },
      },
      error: null,
    })
    verifyOtpMock.mockRejectedValue(new Error('verifyOtp stalled after logout'))

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'success',
          mode: 'bypass',
          message: '테스트 계정으로 바로 로그인합니다.',
          tokenHash: 'bypass-token-hash',
          verificationType: 'magiclink',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(await screen.findByRole('button', { name: '로그인 링크 전송' })).toBeInTheDocument()

    await user.clear(screen.getByLabelText('이메일'))
    await user.type(screen.getByLabelText('이메일'), 'bypass.named@example.com')
    await user.click(screen.getByTestId('auth-request-button'))

    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenCalledWith({
        token_hash: 'bypass-token-hash',
        type: 'magiclink',
      })
    })
    expect(await screen.findByText(GENERIC_AUTH_FAILURE_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByTestId('auth-verifying-spinner')).not.toBeInTheDocument()
  })

  it('automatically signs in with the local bypass account in development', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'true')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN_EMAIL', 'bypass.named@example.com')
    setViewport(1280)

    verifyOtpMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'bypass-session-token',
        },
        user: {
          email: 'bypass.named@example.com',
          user_metadata: {
            name: '테스트 사용자',
          },
        },
      },
      error: null,
    })

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'success',
          mode: 'bypass',
          message: '테스트 계정으로 바로 로그인합니다.',
          tokenHash: 'auto-login-token-hash',
          verificationType: 'magiclink',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/request-link',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: 'bypass.named@example.com',
      requireBypass: true,
    })
    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: 'auto-login-token-hash',
      type: 'magiclink',
    })
    expect(screen.queryByRole('button', { name: '로그인 링크 전송' })).not.toBeInTheDocument()
  })

  it('recovers to the auth form when local auto-login request fails', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'true')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN_EMAIL', 'bypass.named@example.com')
    setViewport(1280)

    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByText('로그인 링크를 보내지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인 링크 전송' })).toBeEnabled()
    expect(screen.getByLabelText('이메일')).toHaveValue('bypass.named@example.com')
  })

  it('fails closed when local auto-login requires bypass-only server support', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'true')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN_EMAIL', 'bypass.named@example.com')
    setViewport(1280)

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'error',
          message: '로컬 auto-login을 사용하려면 bypass 계정과 서버 bypass 설정이 필요해요.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    verifyOtpMock.mockClear()

    render(<App />)

    expect(await screen.findByText('로컬 auto-login을 사용하려면 bypass 계정과 서버 bypass 설정이 필요해요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인 링크 전송' })).toBeEnabled()
    expect(screen.queryByText('로그인 링크를 보냈어요. 메일함을 확인해 주세요.')).not.toBeInTheDocument()
    expect(verifyOtpMock).not.toHaveBeenCalled()
  })

  it('does not auto-login again after logout during the same local dev session', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'true')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN_EMAIL', 'bypass.named@example.com')
    setViewport(1280)

    verifyOtpMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'bypass-session-token',
        },
        user: {
          email: 'bypass.named@example.com',
          user_metadata: {
            name: '테스트 사용자',
          },
        },
      },
      error: null,
    })

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'success',
          mode: 'bypass',
          message: '테스트 계정으로 바로 로그인합니다.',
          tokenHash: 'auto-login-token-hash',
          verificationType: 'magiclink',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(await screen.findByRole('button', { name: '로그인 링크 전송' })).toBeInTheDocument()

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  it('keeps auth_test_state dev overrides ahead of local auto-login', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'true')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN_EMAIL', 'bypass.named@example.com')
    window.history.replaceState({}, '', '/?auth_test_state=auth_required')

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByRole('button', { name: '로그인 링크 전송' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the verifying state while processing the login link', () => {
    setTestAuthState({ phase: 'verifying', user: null, message: null, failureReason: null })
    render(<App />)

    expect(screen.getByTestId('auth-verifying-spinner')).toBeInTheDocument()
  })

  it('keeps the auth failure screen when the auth client emits SIGNED_OUT during verify failure handling', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
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
    ))
    window.history.replaceState({}, '', '/auth/verify?email=tester%40nurimedia.co.kr&nonce=nonce-signed-out')

    onAuthStateChangeMock.mockImplementation((callback) => {
      queueMicrotask(() => {
        void callback('SIGNED_OUT', null as never)
      })

      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }
    })

    render(
      <AuthProvider>
        <div data-testid="protected-child" />
      </AuthProvider>,
    )

    expect(await screen.findByText('로그인 링크가 만료됐어요. 새 로그인 링크를 받아주세요.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '로그인 링크 전송' })).not.toBeInTheDocument()
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

    expect(screen.getByTestId('auth-verifying-spinner')).toBeInTheDocument()

    expect(await screen.findByText(GENERIC_AUTH_FAILURE_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByTestId('auth-verifying-spinner')).not.toBeInTheDocument()
    expect(window.location.search).toBe('')
  })

  it('supports the canonical /auth/verify path and recovers when the verify request never resolves', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    vi.useFakeTimers()
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/auth/verify?email=tester%40nurimedia.co.kr&nonce=nonce-canonical')

    render(
      <AuthProvider>
        <div data-testid="protected-child" />
      </AuthProvider>,
    )

    expect(screen.getByTestId('auth-verifying-spinner')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
    expect(window.location.search).toBe('')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_TIMEOUT_MS)
    })

    expect(screen.getByText(GENERIC_AUTH_FAILURE_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByTestId('auth-verifying-spinner')).not.toBeInTheDocument()
  }, 10000)

  it('finalizes nonce consumption after a refresh-time verify succeeds', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    verifyOtpMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'verified-session-token',
        },
        user: {
          email: 'tester@nurimedia.co.kr',
          user_metadata: {
            name: '테스트 사용자',
          },
        },
      },
      error: null,
    })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'success',
            tokenHash: 'token-hash-1',
            verificationType: 'magiclink',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'success',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/auth/verify?email=tester%40nurimedia.co.kr&nonce=nonce-success')

    render(
      <AuthProvider>
        <div data-testid="protected-child" />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('protected-child')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/auth/verify-link',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: 'tester@nurimedia.co.kr',
      nonce: 'nonce-success',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/auth/consume-link',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }),
    )
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      email: 'tester@nurimedia.co.kr',
      nonce: 'nonce-success',
    })
    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: 'token-hash-1',
      type: 'magiclink',
    })
  })

  it('does not finalize nonce consumption when verifyOtp fails after verify-link succeeds', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    verifyOtpMock.mockRejectedValue(new Error('used token'))

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'success',
          tokenHash: 'token-hash-1',
          verificationType: 'magiclink',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/auth/verify?email=tester%40nurimedia.co.kr&nonce=nonce-failed')

    render(
      <AuthProvider>
        <div data-testid="protected-child" />
      </AuthProvider>,
    )

    expect(await screen.findByText(GENERIC_AUTH_FAILURE_MESSAGE)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/verify-link',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  it('shows the localized invalidated message when the refresh-time verify request is rejected as stale', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    const fetchMock = vi.fn().mockResolvedValue(
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
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/?auth_mode=verify&email=tester%40nurimedia.co.kr&nonce=nonce-2')

    render(
      <AuthProvider>
        <div data-testid="protected-child" />
      </AuthProvider>,
    )

    expect(screen.getByTestId('auth-verifying-spinner')).toBeInTheDocument()
    await waitFor(() => {
      expect(window.location.search).toBe('')
    })

    expect(await screen.findByText('로그인 링크가 만료됐어요. 새 로그인 링크를 받아주세요.')).toBeInTheDocument()
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

  it('restores an existing session on refresh even when the auth client emits a signed-in event before bootstrap finishes', async () => {
    vi.stubEnv('MODE', 'development')

    const persistedSession = {
      access_token: 'existing-session-token',
      user: {
        email: 'bypass.named@example.com',
        user_metadata: {
          name: '테스트 사용자',
        },
      },
    }

    let resolveSessionBootstrap!: () => void
    let sessionBootstrapResolved = false

    getSessionMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSessionBootstrap = () => {
            sessionBootstrapResolved = true
            resolve({
              data: {
                session: {
                  access_token: persistedSession.access_token,
                },
              },
            })
          }
        }),
    )
    getUserMock.mockImplementation(() => {
      if (!sessionBootstrapResolved) {
        return new Promise(() => {})
      }

      return Promise.resolve({
        data: {
          user: persistedSession.user,
        },
        error: null,
      })
    })
    onAuthStateChangeMock.mockImplementation((callback) => {
      queueMicrotask(async () => {
        await callback('SIGNED_IN', persistedSession as never)
        resolveSessionBootstrap()
      })

      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }
    })

    render(
      <AuthProvider>
        <div data-testid="protected-child" />
      </AuthProvider>,
    )

    expect(screen.getByTestId('auth-verifying-spinner')).toBeInTheDocument()

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByTestId('protected-child')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '로그인 링크 전송' })).not.toBeInTheDocument()
  })

  it('falls back to the login screen when session bootstrap never resolves', async () => {
    vi.stubEnv('MODE', 'development')
    vi.useFakeTimers()
    getSessionMock.mockImplementation(() => new Promise(() => {}))

    render(
      <AuthProvider>
        <div data-testid="protected-child" />
      </AuthProvider>,
    )

    expect(screen.getByTestId('auth-verifying-spinner')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(screen.getByRole('button', { name: '로그인 링크 전송' })).toBeInTheDocument()
    expect(screen.queryByTestId('auth-verifying-spinner')).not.toBeInTheDocument()
  })

  it('recovers to the login form when the request-link call never resolves', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    vi.useFakeTimers()
    setViewport(1280)
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const input = screen.getByLabelText('이메일')
    fireEvent.change(input, { target: { value: 'tester@nurimedia.co.kr' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인 링크 전송' }))

    expect(screen.getByTestId('auth-request-button')).toBeDisabled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_TIMEOUT_MS)
    })

    expect(screen.getByText('로그인 링크를 보내지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인 링크 전송' })).toBeEnabled()
    expect(screen.getByLabelText('이메일')).toHaveValue('tester@nurimedia.co.kr')
  }, 10000)

  it('shows the auth failure screen CTA and returns to the login form', async () => {
    setTestAuthState({ phase: 'auth_failure', user: null, message: null, failureReason: 'expired' })
    const user = userEvent.setup()
    render(<App />)

    const title = screen.getByRole('heading', { name: '인증에 실패했어요 🥲' })
    const body = screen.getByTestId('auth-failure-body')
    const retryButton = screen.getByRole('button', { name: '새 링크 받기' })
    const resetButton = screen.getByRole('button', { name: '이메일 다시 입력' })

    expect(title).toHaveClass('text-[20px]')
    expect(body).toHaveClass('text-sm')
    expect(body).toHaveTextContent('로그인 링크가 만료됐어요. 새 로그인 링크를 받아주세요.')
    expect(retryButton).toHaveClass('cursor-pointer')
    expect(retryButton).not.toHaveClass('transition-colors', 'hover:bg-indigo-600')
    expect(resetButton).toHaveClass('cursor-pointer', 'text-sm')
    expect(resetButton).not.toHaveClass('transition-colors', 'hover:text-neutral-600')
    await user.click(resetButton)

    expect(await screen.findByRole('button', { name: '로그인 링크 전송' })).toBeInTheDocument()
  })

  it('shows the name capture screen with 40px controls and blocks save until at least one character is entered', async () => {
    setTestAuthState({
      phase: 'name_required',
      user: { email: 'tester@nurimedia.co.kr', name: null },
      message: null,
      failureReason: null,
    })
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('이름')
    const button = screen.getByRole('button', { name: '저장' })

    expect(input).toHaveClass('h-10')
    expect(button).toBeDisabled()
    expect(button).toHaveClass(
      'h-10',
      'disabled:pointer-events-auto',
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
    )

    await user.type(input, '김')
    expect(button).toBeEnabled()
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
    })
  })

  it('clamps the name input to 10 characters including pasted content', async () => {
    setTestAuthState({
      phase: 'name_required',
      user: { email: 'tester@nurimedia.co.kr', name: null },
      message: null,
      failureReason: null,
    })
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('이름')
    await user.type(input, 'abcdefghijk')
    expect(input).toHaveValue('abcdefghij')

    fireEvent.change(input, { target: { value: '가나다라마바사아자차카타' } })
    expect(input).toHaveValue('가나다라마바사아자차')
  })

  it('clamps the name input to 10 characters including pasted values', async () => {
    setTestAuthState({
      phase: 'name_required',
      user: { email: 'tester@nurimedia.co.kr', name: null },
      message: null,
      failureReason: null,
    })
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('이름')
    await user.type(input, 'abcdefghijk')
    expect(input).toHaveValue('abcdefghij')

    fireEvent.change(input, { target: { value: '가나다라마바사아자차카타' } })
    expect(input).toHaveValue('가나다라마바사아자차')
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

    expect(await screen.findByRole('button', { name: '로그인 링크 전송' })).toBeInTheDocument()
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument()
  })

  it('keeps the authenticated shell open when logout is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)
    const signOutCallCountBeforeClick = signOutMock.mock.calls.length

    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(window.confirm).toHaveBeenCalledWith('로그아웃하시겠어요?')
    expect(signOutMock).toHaveBeenCalledTimes(signOutCallCountBeforeClick)
    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
  })

})
