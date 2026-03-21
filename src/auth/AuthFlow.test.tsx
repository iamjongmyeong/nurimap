import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { AuthProvider } from './AuthProvider'
import { AUTH_BOOTSTRAP_TIMEOUT_MS, OTP_ENTRY_FAILURE_MESSAGE } from './authVerification'
import { resetTestAuthState, setTestAuthState } from './testAuthState'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getSessionMock,
  getUserMock,
  signInWithOtpMock,
  verifyOtpMock,
  signOutMock,
  updateUserMock,
  onAuthStateChangeMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  getUserMock: vi.fn(),
  signInWithOtpMock: vi.fn(),
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
      signInWithOtp: signInWithOtpMock,
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

describe('Sprint 18 OTP auth flow', () => {
  beforeEach(() => {
    resetTestAuthState()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    window.localStorage.clear()
    window.history.replaceState({}, '', '/')
    getSessionMock.mockResolvedValue({ data: { session: null } })
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })
    signInWithOtpMock.mockResolvedValue({ data: {}, error: null })
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
    expect(screen.getByRole('button', { name: '인증 코드 전송' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('example@nurimedia.co.kr')).toBeInTheDocument()
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument()
  })

  it('keeps the email label accessible while visually hiding it', () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    render(<App />)

    expect(screen.getByLabelText('이메일')).toHaveAttribute('placeholder', 'example@nurimedia.co.kr')
    expect(screen.getByText('이메일')).toHaveClass('sr-only')
  })

  it('keeps the request button disabled until the email format is valid', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    const user = userEvent.setup()
    render(<App />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const input = screen.getByLabelText('이메일')
    const button = screen.getByRole('button', { name: '인증 코드 전송' })

    expect(button).toBeDisabled()

    await user.type(input, 'invalid-email')
    expect(button).toBeDisabled()

    await user.clear(input)
    await user.type(input, 'tester@nurimedia.co.kr')
    expect(button).toBeEnabled()
  })

  it('shows an inline error and keeps the email input for an invalid domain', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    const user = userEvent.setup()
    render(<App />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const input = screen.getByLabelText('이메일')
    await user.type(input, 'user@example.com')
    await user.click(screen.getByRole('button', { name: '인증 코드 전송' }))

    expect(await screen.findByText('누리미디어 구성원만 사용할 수 있어요.')).toBeInTheDocument()
    expect(input).toHaveValue('user@example.com')
  })

  it('shows the cooldown request-screen variant and keeps the email input', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'error',
          code: 'cooldown',
          message: '1분 07초 후에 다시 시도해주세요.',
          retryAfterSeconds: 67,
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const input = screen.getByLabelText('이메일')
    await user.type(input, 'cooldown@nurimedia.co.kr')
    await user.click(screen.getByRole('button', { name: '인증 코드 전송' }))

    expect(await screen.findByText('1분 07초 뒤에 다시 보낼 수 있어요.')).toBeInTheDocument()
    expect(screen.getByText('너무 많은 요청이 와서 잠시 쉴 시간이 필요해요.')).toBeInTheDocument()
    expect(input).toHaveValue('cooldown@nurimedia.co.kr')
    expect(screen.getByRole('button', { name: '인증 코드 전송' })).toBeDisabled()
  })

  it('shows the otp-required state in the same auth shell with the requested email', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'tester@nurimedia.co.kr')
    await user.click(screen.getByRole('button', { name: '인증 코드 전송' }))

    expect(await screen.findByText('로그인 코드를 보냈어요.')).toBeInTheDocument()
    expect(screen.getByTestId('auth-requested-email')).toHaveTextContent('tester@nurimedia.co.kr로')
    expect(screen.getByText('5분 안에 입력해 주세요.')).toBeInTheDocument()
    expect(screen.getByLabelText('인증 코드')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '인증' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '다시 전송하기' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이메일 다시 입력' })).toBeInTheDocument()
  })

  it('shows the email copy when directly entering the otp-required state', () => {
    setTestAuthState({
      phase: 'otp_required',
      user: { email: 'tester@nurimedia.co.kr', name: null },
      message: '인증 코드를 보냈어요.',
      failureReason: null,
    })
    render(<App />)

    expect(screen.getByTestId('auth-requested-email')).toHaveTextContent('tester@nurimedia.co.kr로')
    expect(screen.getByText('로그인 코드를 보냈어요.')).toBeInTheDocument()
    expect(screen.getByText('5분 안에 입력해 주세요.')).toBeInTheDocument()
  })

  it('immediately enters the onboarding flow for a bypass test account', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'bypass.user@example.com')
    await user.click(screen.getByTestId('auth-request-button'))

    expect(await screen.findByText('누리맵에서 사용할 이름을 입력해주세요.')).toBeInTheDocument()
  })

  it('verifies OTP and moves to onboarding in test mode', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'tester@nurimedia.co.kr')
    await user.click(screen.getByRole('button', { name: '인증 코드 전송' }))
    await screen.findByLabelText('인증 코드')
    await user.type(screen.getByLabelText('인증 코드'), '111111')
    await user.click(screen.getByRole('button', { name: '인증' }))

    expect(await screen.findByText('누리맵에서 사용할 이름을 입력해주세요.')).toBeInTheDocument()
  })

  it('shows unified failure copy and error styling inside the otp input state', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'tester@nurimedia.co.kr')
    await user.click(screen.getByRole('button', { name: '인증 코드 전송' }))
    await screen.findByLabelText('인증 코드')
    await user.type(screen.getByLabelText('인증 코드'), '999999')
    await user.click(screen.getByRole('button', { name: '인증' }))

    const errorText = await screen.findByText(OTP_ENTRY_FAILURE_MESSAGE)
    expect(errorText).toHaveClass('text-[12px]', 'leading-[150%]', 'text-[#E52E30]')
    expect(screen.getByLabelText('인증 코드')).toHaveClass('border-[#E52E30]', 'focus:border-[#E52E30]')
  })

  it('shows the same unified failure copy for expired code', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'tester@nurimedia.co.kr')
    await user.click(screen.getByRole('button', { name: '인증 코드 전송' }))
    await screen.findByLabelText('인증 코드')
    await user.type(screen.getByLabelText('인증 코드'), '222222')
    await user.click(screen.getByRole('button', { name: '인증' }))

    expect(await screen.findByText(OTP_ENTRY_FAILURE_MESSAGE)).toBeInTheDocument()
  })

  it('uses the request-otp endpoint for local auto-login bypass in development', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'true')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN_EMAIL', 'bypass.named@example.com')

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

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/request-otp',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: 'bypass.named@example.com',
      requireBypass: true,
    })
  })

  it('restores an existing session on refresh', async () => {
    vi.stubEnv('MODE', 'development')
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
  })

  it('falls back to the login form when session bootstrap never resolves', async () => {
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
      await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_TIMEOUT_MS)
    })

    expect(screen.getByRole('button', { name: '인증 코드 전송' })).toBeInTheDocument()
  })

  it('recovers to the auth form when the request-otp call never resolves', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    vi.useFakeTimers()
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const input = screen.getByLabelText('이메일')
    fireEvent.change(input, { target: { value: 'tester@nurimedia.co.kr' } })
    fireEvent.click(screen.getByRole('button', { name: '인증 코드 전송' }))

    expect(screen.getByTestId('auth-request-button')).toBeDisabled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_TIMEOUT_MS)
    })

    expect(screen.getByText('인증 코드를 보내지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '인증 코드 전송' })).toBeEnabled()
    expect(screen.getByLabelText('이메일')).toHaveValue('tester@nurimedia.co.kr')
  })

  it('shows the auth failure CTA and returns to the email form with prefilled email on retry', async () => {
    setTestAuthState({
      phase: 'auth_failure',
      user: null,
      message: null,
      failureReason: '인증에 실패했어요. 새 코드를 받아주세요.',
    })
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByTestId('auth-failure-screen')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '새 코드 받기' }))

    expect(await screen.findByRole('button', { name: '인증 코드 전송' })).toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByText('이름을 입력해 주세요.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('이름'), '김')
    await user.click(screen.getByRole('button', { name: '저장' }))

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

    expect(await screen.findByRole('button', { name: '인증 코드 전송' })).toBeInTheDocument()
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument()
  })
})
