import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue, type AuthPhase } from './authContext'
import { supabaseBrowser } from './supabaseBrowser'
import { requestTestOtp, setTestAuthState, signOutTestUser, submitTestName, useTestAuthState, verifyTestOtp } from './testAuthState'
import { GENERIC_AUTH_FAILURE_MESSAGE, resolveBypassVerification, resolveOtpVerifyFailureMessage, withTimeout } from './authVerification'

declare global {
  interface ImportMetaEnv {
    readonly VITE_LOCAL_AUTO_LOGIN?: string
    readonly VITE_LOCAL_AUTO_LOGIN_EMAIL?: string
  }
}

const SESSION_STARTED_AT_KEY = 'nurimap_session_started_at'
const SESSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000
const LOCAL_AUTO_LOGIN_REQUIRES_BYPASS_MESSAGE = '로컬 auto-login을 사용하려면 bypass 계정과 서버 bypass 설정이 필요해요.'
const AUTH_BRAND_ICON_SRC = '/assets/branding/brand-nurimap-logo.jpeg'
const authBrandTextStyle = {
  fontFamily: '"BM Jua", Pretendard, system-ui, sans-serif',
} as const

const LEGACY_FAILURE_MESSAGES = {
  expired: '로그인 링크가 만료됐어요.\n새 로그인 링크를 받아주세요.',
  invalidated: '로그인 링크가 만료됐어요.\n새 로그인 링크를 받아주세요.',
  used: '이미 사용한 링크예요.\n새 로그인 링크를 받아주세요.',
} as const

const resolveFailureReasonMessage = (reason: string | null | undefined) => {
  if (!reason) {
    return GENERIC_AUTH_FAILURE_MESSAGE
  }

  return LEGACY_FAILURE_MESSAGES[reason as keyof typeof LEGACY_FAILURE_MESSAGES] ?? reason
}

const getStoredSessionAgeExceeded = () => {
  const storedValue = window.localStorage.getItem(SESSION_STARTED_AT_KEY)
  if (!storedValue) {
    return false
  }

  return Date.now() - Number(storedValue) > SESSION_MAX_AGE_MS
}

const markSessionStarted = () => {
  if (!window.localStorage.getItem(SESSION_STARTED_AT_KEY)) {
    window.localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()))
  }
}

const clearSessionStarted = () => {
  window.localStorage.removeItem(SESSION_STARTED_AT_KEY)
}

const getDevAuthOverride = () => {
  if (!import.meta.env.DEV) {
    return null
  }

  const params = new URLSearchParams(window.location.search)
  const authTestState = params.get('auth_test_state')
  if (!authTestState) {
    return null
  }

  if (authTestState === 'auth_required') {
    return { phase: 'auth_required' as const, user: null, message: null, failureReason: null }
  }

  if (authTestState === 'auth_failure') {
    return {
      phase: 'auth_failure' as const,
      user: null,
      message: null,
      failureReason: params.get('auth_test_reason') ?? 'expired',
    }
  }

  if (authTestState === 'otp_required') {
    return {
      phase: 'otp_required' as const,
      user: { email: 'tester@nurimedia.co.kr', name: null },
      message: '인증 코드를 보냈어요.',
      failureReason: null,
    }
  }

  if (authTestState === 'name_required') {
    return {
      phase: 'name_required' as const,
      user: { email: 'tester@nurimedia.co.kr', name: null },
      message: null,
      failureReason: null,
    }
  }

  if (authTestState === 'verifying') {
    return {
      phase: 'verifying' as const,
      user: null,
      message: null,
      failureReason: null,
    }
  }

  return {
    phase: 'authenticated' as const,
    user: { email: 'tester@nurimedia.co.kr', name: '테스트 사용자' },
    message: null,
    failureReason: null,
  }
}

const getLocalAutoLoginEmail = () => {
  if (!import.meta.env.DEV) {
    return null
  }

  if (import.meta.env.VITE_LOCAL_AUTO_LOGIN !== 'true') {
    return null
  }

  const email = import.meta.env.VITE_LOCAL_AUTO_LOGIN_EMAIL?.trim()
  return email ? email : null
}

const AuthSurface = ({ children }: { children: ReactNode }) => (
  <main className="flex min-h-dvh items-center bg-white px-4 py-10">
    <div className="mx-auto flex w-full max-w-5xl justify-center">
      <div className="w-full max-w-md">{children}</div>
    </div>
  </main>
)

const AuthBrand = () => (
  <div className="mx-auto inline-flex items-center justify-center gap-3">
    <img
      alt="누리맵 로고"
      className="h-9 w-9 object-contain"
      src={AUTH_BRAND_ICON_SRC}
    />
    <p
      className="text-2xl font-normal leading-9 text-zinc-900"
      style={authBrandTextStyle}
    >
      누리맵
    </p>
  </div>
)

const AUTH_INPUT_CLASSES = 'h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-base leading-6 text-zinc-900 placeholder:text-stone-300 focus:border-gray-300 focus:outline-none focus:ring-0 focus:shadow-none'
const AUTH_PRIMARY_BUTTON_CLASSES = 'inline-flex h-10 w-full items-center justify-center rounded-xl bg-indigo-500 text-base font-semibold leading-6 text-white shadow-none transition-opacity'
const AUTH_ERROR_TEXT_CLASSES = 'text-[#e53935]'
const OTP_INPUT_ERROR_BORDER_CLASSES = 'border-[#E52E30] focus:border-[#E52E30]'
const OTP_ERROR_TEXT_CLASSES = 'text-[12px] leading-[150%] text-[#E52E30]'
const LOGIN_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OTP_CODE_PATTERN = /^\d{6}$/
const MAX_NAME_LENGTH = 10
const formatCooldownTime = (remainingSeconds: number) => {
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  return `${minutes}분 ${String(seconds).padStart(2, '0')}초`
}

const EmailRequestShell = ({
  cooldownRemainingSeconds,
  email,
  message,
  onEmailChange,
  onSubmit,
  submitting,
}: {
  cooldownRemainingSeconds: number | null
  email: string
  message: string | null
  onEmailChange: (value: string) => void
  onSubmit: (email: string) => void
  submitting: boolean
}) => {
  const cooldownActive = cooldownRemainingSeconds !== null
  const hasInlineError = Boolean(message) && !cooldownActive
  const emailFormatValid = LOGIN_EMAIL_PATTERN.test(email.trim())
  const buttonDisabled = submitting || cooldownActive || !emailFormatValid

  return (
    <AuthSurface>
      <div className="flex flex-col items-center gap-6">
        <AuthBrand />
        {cooldownActive ? (
          <div className="flex max-w-[320px] flex-col items-center gap-2 text-center">
            <p className="text-base font-semibold leading-7 text-zinc-900">
              {formatCooldownTime(cooldownRemainingSeconds ?? 0)} 뒤에 다시 보낼 수 있어요.
            </p>
            <p className="text-[14px] font-normal leading-5 text-neutral-500">
              너무 많은 요청이 와서 잠시 쉴 시간이 필요해요.
            </p>
          </div>
        ) : (
          <p className="text-center text-base font-medium leading-6 text-zinc-900">
            누리미디어에서 사용 중인 이메일을 입력해주세요.
          </p>
        )}
      </div>
      <form
        className="mt-6 flex flex-col items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit(email)
        }}
      >
        <label className="flex w-full max-w-[320px] flex-col gap-2">
          <span className="sr-only">이메일</span>
          <input
            className={`${AUTH_INPUT_CLASSES} ${cooldownActive ? '!text-neutral-400 placeholder:!text-neutral-400' : ''} ${
              hasInlineError ? 'border-[#e53935] focus:border-[#e53935]' : ''
            }`}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="example@nurimedia.co.kr"
            readOnly={cooldownActive}
            type="email"
            value={email}
          />
        </label>

        {hasInlineError ? (
          <p className={`w-full max-w-[320px] text-sm ${AUTH_ERROR_TEXT_CLASSES}`}>{message}</p>
        ) : null}

        <button
          aria-label="인증 코드 전송"
          className={`${AUTH_PRIMARY_BUTTON_CLASSES} max-w-[320px] ${
            buttonDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
          data-testid="auth-request-button"
          disabled={buttonDisabled}
          type="submit"
        >
          {submitting ? (
            <span aria-hidden="true" className="ui-spinner ui-spinner-sm" data-testid="auth-request-spinner" />
          ) : (
            '인증 코드 전송'
          )}
        </button>
      </form>
    </AuthSurface>
  )
}

const OtpShell = ({
  email,
  code,
  message,
  onCodeChange,
  onReset,
  onSubmit,
  submitting,
}: {
  email: string
  code: string
  message: string | null
  onCodeChange: (value: string) => void
  onReset: () => void
  onSubmit: () => void
  submitting: boolean
}) => {
  const buttonDisabled = submitting || !OTP_CODE_PATTERN.test(code)
  const hasErrorMessage = Boolean(message) && message !== '인증 코드를 보냈어요.'

  return (
    <AuthSurface>
      <div className="flex flex-col items-center gap-8">
        <AuthBrand />
        <div className="flex max-w-[320px] flex-col items-center gap-3 text-center">
          <p className="w-full text-base font-medium leading-7 text-zinc-900">
            <span className="block break-all" data-testid="auth-requested-email">
              {email}로
            </span>
            <span className="block">로그인 코드를 보냈어요.</span>
          </p>
          <p className="text-base font-medium leading-6 text-zinc-900">5분 안에 입력해 주세요.</p>
        </div>
      </div>
      <div className="mt-8 flex flex-col items-center gap-3">
        <label className="flex w-full max-w-[320px] flex-col gap-2">
          <span className="sr-only">인증 코드</span>
          <input
            aria-label="인증 코드"
            className={`${AUTH_INPUT_CLASSES} text-center tracking-[0.3em] ${hasErrorMessage ? OTP_INPUT_ERROR_BORDER_CLASSES : ''}`}
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="0 0 0 0 0 0"
            value={code}
          />
        </label>

        {hasErrorMessage ? (
          <p className={`w-full max-w-[320px] text-center ${OTP_ERROR_TEXT_CLASSES}`}>{message}</p>
        ) : null}

        <button
          aria-label="인증"
          className={`${AUTH_PRIMARY_BUTTON_CLASSES} max-w-[320px] ${
            buttonDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
          data-testid="auth-verify-button"
          disabled={buttonDisabled}
          onClick={onSubmit}
          type="button"
        >
          {submitting ? <span aria-hidden="true" className="ui-spinner ui-spinner-sm" data-testid="auth-verify-spinner" /> : '인증'}
        </button>
        <button
          className="cursor-pointer text-center text-[14px] font-normal leading-5 text-neutral-500"
          onClick={onReset}
          type="button"
        >
          이메일 다시 입력
        </button>
      </div>
    </AuthSurface>
  )
}

const AuthFailureScreen = ({
  onReset,
  onRetry,
  reason,
}: {
  onReset: () => void
  onRetry: () => void
  reason: string | null
}) => (
  <AuthSurface>
    <div className="mx-auto flex w-full max-w-[248px] flex-col items-center gap-6" data-testid="auth-failure-screen">
      <AuthBrand />
      <div className="flex w-full flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <h1
            className="text-center text-xl font-semibold leading-8 text-zinc-900"
            data-testid="auth-failure-title"
          >
            인증에 실패했어요 🥲
          </h1>
          <p
            className="w-full text-center text-[14px] leading-5 whitespace-pre-line text-zinc-900"
            data-testid="auth-failure-body"
          >
            {reason ?? GENERIC_AUTH_FAILURE_MESSAGE}
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-4">
          <button
            className="inline-flex h-10 w-40 cursor-pointer items-center justify-center rounded-xl bg-indigo-500 text-base font-semibold leading-6 text-white"
            onClick={onRetry}
            type="button"
          >
            새 코드 받기
          </button>
          <button
            className="cursor-pointer text-center text-[14px] font-normal leading-5 text-neutral-500"
            onClick={onReset}
            style={{ fontSize: '14px' }}
            type="button"
          >
            이메일 다시 입력
          </button>
        </div>
      </div>
    </div>
  </AuthSurface>
)

const NameCaptureScreen = ({
  onSubmit,
  submitting,
}: {
  onSubmit: (name: string) => Promise<void>
  submitting: boolean
}) => {
  const [name, setName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const clampedName = (value: string) => Array.from(value).slice(0, MAX_NAME_LENGTH).join('')

  return (
    <AuthSurface>
      <div className="flex flex-col items-center gap-6">
        <AuthBrand />
        <p className="text-center text-base font-medium leading-6 text-zinc-900">
          누리맵에서 사용할 이름을 입력해주세요.
        </p>
      </div>
      <div className="mt-6 flex flex-col items-center gap-3">
        <label className="flex w-full max-w-[276px] flex-col gap-2">
          <span className="sr-only">이름</span>
          <input
            aria-label="이름"
            className={`${AUTH_INPUT_CLASSES} ${errorMessage ? 'border-[#e53935] focus:border-[#e53935]' : ''}`}
            onChange={(event) => setName(clampedName(event.target.value))}
            placeholder="김누리"
            value={name}
          />
        </label>
        {errorMessage ? <p className={`w-full max-w-[276px] text-sm ${AUTH_ERROR_TEXT_CLASSES}`}>{errorMessage}</p> : null}
        <button
          aria-label="저장"
          className={`${AUTH_PRIMARY_BUTTON_CLASSES} max-w-[276px] ${submitting ? 'cursor-wait' : 'cursor-pointer'}`}
          disabled={submitting}
          onClick={() => {
            if (!name.trim()) {
              setErrorMessage('이름을 입력해 주세요.')
              return
            }
            setErrorMessage(null)
            void onSubmit(name.trim())
          }}
          type="button"
        >
          {submitting ? <span aria-hidden="true" className="ui-spinner ui-spinner-sm" data-testid="name-submit-spinner" /> : '저장'}
        </button>
      </div>
    </AuthSurface>
  )
}

const VerifyingScreen = () => (
  <AuthSurface>
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <span aria-hidden="true" className="ui-spinner ui-spinner-lg text-[#5862fb]" />
      <div data-testid="auth-verifying-spinner">
        <span className="sr-only">인증 코드 확인 중</span>
      </div>
    </div>
  </AuthSurface>
)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const testState = useTestAuthState()
  const [phase, setPhase] = useState<AuthPhase>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [failureReason, setFailureReason] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [hasResentOtp, setHasResentOtp] = useState(false)
  const [cooldownState, setCooldownState] = useState<{ email: string; remainingSeconds: number } | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const hasAttemptedLocalAutoLoginRef = useRef(false)
  const phaseRef = useRef<AuthPhase>('loading')

  const devOverrideState = useMemo(() => getDevAuthOverride(), [])
  const localAutoLoginEmail = useMemo(() => getLocalAutoLoginEmail(), [])
  const isTestMode = import.meta.env.MODE === 'test' || devOverrideState !== null
  const normalizedEmail = email.trim().toLowerCase()
  const resolvedCooldownRemainingSeconds = cooldownState && cooldownState.email === normalizedEmail
    ? cooldownState.remainingSeconds
    : null

  useEffect(() => {
    if (!cooldownState || cooldownState.remainingSeconds <= 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCooldownState((current) => {
        if (!current) {
          return null
        }

        if (current.remainingSeconds <= 1) {
          return null
        }

        return {
          ...current,
          remainingSeconds: current.remainingSeconds - 1,
        }
      })
    }, 1000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [cooldownState])

  const applyAuthenticatedState = useCallback(({
    accessToken,
    user,
  }: {
    accessToken: string
    user:
      | {
          email?: string | null
          user_metadata?: {
            name?: unknown
          }
        }
      | null
      | undefined
  }) => {
    markSessionStarted()
    setAccessToken(accessToken)
    setEmail(user?.email ?? '')
    setRequestedEmail(null)
    setOtpCode('')
    setHasResentOtp(false)
    setCooldownState(null)
    setMessage(null)
    setFailureReason(null)
    setPhase(user?.user_metadata?.name ? 'authenticated' : 'name_required')
  }, [])

  const verifyAndAdoptBypassSession = useCallback(async ({
    tokenHash,
    verificationType,
  }: {
    tokenHash: string
    verificationType: 'magiclink' | 'signup' | 'invite'
  }) => {
    const { data, error } = await supabaseBrowser.auth.verifyOtp({
      token_hash: tokenHash,
      type: verificationType,
    })

    if (error || !data.session || !data.user) {
      return {
        status: 'error' as const,
        message: error?.message ?? GENERIC_AUTH_FAILURE_MESSAGE,
      }
    }

    applyAuthenticatedState({
      accessToken: data.session.access_token,
      user: data.user,
    })

    return {
      status: 'success' as const,
    }
  }, [applyAuthenticatedState])

  useEffect(() => {
    if (devOverrideState) {
      setTestAuthState(devOverrideState)
    }
  }, [devOverrideState])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (isTestMode) {
      return
    }

    let isMounted = true

    const restoreSession = async (token: string) => {
      const { data, error } = await withTimeout(supabaseBrowser.auth.getUser())
      if (error || !data.user) {
        await supabaseBrowser.auth.signOut()
        clearSessionStarted()
        if (isMounted) {
          setAccessToken(null)
          setPhase('auth_required')
        }
        return
      }

      if (isMounted) {
        applyAuthenticatedState({
          accessToken: token,
          user: data.user,
        })
      }
    }

    const bootstrap = async () => {
      try {
        if (getStoredSessionAgeExceeded()) {
          await supabaseBrowser.auth.signOut()
          clearSessionStarted()
        }

        const {
          data: { session },
        } = await withTimeout(supabaseBrowser.auth.getSession())

        if (session?.access_token) {
          await restoreSession(session.access_token)
          return
        }

        if (isMounted) {
          setPhase('auth_required')
        }
      } catch {
        if (!isMounted) {
          return
        }

        setPhase('auth_required')
      }
    }

    void bootstrap()

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearSessionStarted()
        setAccessToken(null)

        if (phaseRef.current === 'verifying' || phaseRef.current === 'auth_failure') {
          return
        }

        setPhase('auth_required')
        return
      }

      if (event === 'SIGNED_IN' && session?.access_token) {
        applyAuthenticatedState({
          accessToken: session.access_token,
          user: session.user,
        })

        queueMicrotask(() => {
          void withTimeout(supabaseBrowser.auth.getUser()).then(({ data, error }) => {
            if (!isMounted || error || !data.user) {
              return
            }

            applyAuthenticatedState({
              accessToken: session.access_token,
              user: data.user,
            })
          }).catch(() => {})
        })
      }
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [applyAuthenticatedState, isTestMode])

  const requestOtp = useCallback(async (
    nextEmail: string,
    options?: {
      requireBypass?: boolean
    },
  ) => {
    if (!nextEmail.trim()) {
      setRequestedEmail(null)
      if (isTestMode) {
        setTestAuthState({
          phase: 'auth_required',
          message: '이메일을 입력해 주세요.',
          failureReason: null,
        })
      } else {
        setMessage('이메일을 입력해 주세요.')
        setPhase('auth_required')
      }
      return
    }

    const trimmedEmail = nextEmail.trim().toLowerCase()
    const isResend = phaseRef.current === 'otp_required' && requestedEmail === trimmedEmail

    setSubmitting(true)
    setCooldownState(null)
    setFailureReason(null)
    setEmail(trimmedEmail)

    if (isTestMode) {
      const result = await requestTestOtp(trimmedEmail)
      setSubmitting(false)
      if (result.status === 'error') {
        if (result.code === 'cooldown' && 'retryAfterSeconds' in result) {
          setCooldownState({
            email: trimmedEmail,
            remainingSeconds: result.retryAfterSeconds,
          })
          setRequestedEmail(null)
          setOtpCode('')
          setHasResentOtp(false)
          setMessage(null)
          setPhase('auth_required')
          return
        }

        setRequestedEmail(isResend ? trimmedEmail : null)
        setMessage(result.code === 'invalid_domain' ? '누리미디어 구성원만 사용할 수 있어요.' : null)
        setPhase(isResend ? 'otp_required' : 'auth_required')
        return
      }
      setRequestedEmail(result.mode === 'otp' ? trimmedEmail : null)
      setOtpCode('')
      setHasResentOtp(isResend)
      return
    }

    try {
      const response = await withTimeout(fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          requireBypass: options?.requireBypass === true,
        }),
      }))
      const payload = (await response.json()) as
        | { status: 'success'; mode: 'otp'; message: string }
        | {
            status: 'success'
            mode: 'bypass'
            message: string
            tokenHash: string
            verificationType: 'magiclink' | 'signup' | 'invite'
          }
        | { status: 'error'; code: 'cooldown'; message: string; retryAfterSeconds: number }
        | { status: 'error'; code?: string; message: string }

      if (!response.ok || payload.status === 'error') {
        if (payload.status === 'error' && payload.code === 'cooldown' && 'retryAfterSeconds' in payload) {
          setCooldownState({
            email: trimmedEmail,
            remainingSeconds: payload.retryAfterSeconds,
          })
          setMessage(null)
        } else {
          setMessage(payload.message)
          setRequestedEmail(isResend ? trimmedEmail : null)
          setPhase(isResend ? 'otp_required' : 'auth_required')
          return
        }

        setRequestedEmail(null)
        setOtpCode('')
        setHasResentOtp(false)
        setPhase('auth_required')
        return
      }

      if (payload.mode !== 'bypass' && options?.requireBypass) {
        setRequestedEmail(null)
        setMessage(LOCAL_AUTO_LOGIN_REQUIRES_BYPASS_MESSAGE)
        setPhase('auth_required')
        return
      }

      if (payload.mode === 'bypass') {
        setRequestedEmail(null)
        setPhase('verifying')
        setMessage(payload.message)

        const verification = await resolveBypassVerification({
          tokenHash: payload.tokenHash,
          verificationType: payload.verificationType,
          verifyAndAdoptSession: verifyAndAdoptBypassSession,
        })

        if (verification.status === 'error') {
          setPhase('auth_failure')
          setFailureReason(verification.message)
          return
        }

        return
      }

      setRequestedEmail(trimmedEmail)
      setOtpCode('')
      setHasResentOtp(isResend)
      setMessage(payload.message)
      setPhase('otp_required')
    } catch {
      setRequestedEmail(isResend ? trimmedEmail : null)
      setMessage('인증 코드를 보내지 못했어요. 다시 시도해 주세요.')
      setPhase(isResend ? 'otp_required' : 'auth_required')
    } finally {
      setSubmitting(false)
    }
  }, [isTestMode, requestedEmail, verifyAndAdoptBypassSession])

  const submitOtp = useCallback(async () => {
    const verifyEmail = (requestedEmail ?? email).trim().toLowerCase()
    if (!verifyEmail || !OTP_CODE_PATTERN.test(otpCode)) {
      return
    }

    setSubmitting(true)
    setMessage(null)
    setFailureReason(null)

    if (isTestMode) {
      const result = await verifyTestOtp({
        code: otpCode,
        email: verifyEmail,
      })
      setSubmitting(false)
      if (result.status === 'error') {
        setMessage(result.message)
        setPhase('otp_required')
      }
      return
    }

    try {
      setPhase('verifying')
      const { data, error } = await withTimeout(supabaseBrowser.auth.verifyOtp({
        email: verifyEmail,
        token: otpCode,
        type: 'email',
      }))

      if (error || !data.session || !data.user) {
        const failureMessage = resolveOtpVerifyFailureMessage({
          errorMessage: error?.message,
          hasResent: hasResentOtp,
        })

        if (failureMessage === GENERIC_AUTH_FAILURE_MESSAGE) {
          setFailureReason(failureMessage)
          setPhase('auth_failure')
        } else {
          setMessage(failureMessage)
          setPhase('otp_required')
        }
        return
      }

      applyAuthenticatedState({
        accessToken: data.session.access_token,
        user: data.user,
      })
    } catch {
      setFailureReason(GENERIC_AUTH_FAILURE_MESSAGE)
      setPhase('auth_failure')
    } finally {
      setSubmitting(false)
    }
  }, [applyAuthenticatedState, email, hasResentOtp, isTestMode, otpCode, requestedEmail])

  useEffect(() => {
    if (!localAutoLoginEmail || isTestMode) {
      return
    }

    if (phase !== 'auth_required' || submitting || requestedEmail) {
      return
    }

    if (hasAttemptedLocalAutoLoginRef.current) {
      return
    }

    hasAttemptedLocalAutoLoginRef.current = true
    const autoLoginTimer = window.setTimeout(() => {
      void requestOtp(localAutoLoginEmail, { requireBypass: true })
    }, 0)

    return () => {
      window.clearTimeout(autoLoginTimer)
    }
  }, [isTestMode, localAutoLoginEmail, phase, requestOtp, requestedEmail, submitting])

  const saveName = async (name: string) => {
    setSubmitting(true)

    if (isTestMode) {
      await submitTestName(name)
      setSubmitting(false)
      return
    }

    const { error } = await supabaseBrowser.auth.updateUser({
      data: { name },
    })

    setSubmitting(false)
    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(null)
    setPhase('authenticated')
  }

  const signOut = async () => {
    hasAttemptedLocalAutoLoginRef.current = true

    if (isTestMode) {
      await signOutTestUser()
      return
    }

    await supabaseBrowser.auth.signOut()
    clearSessionStarted()
    setAccessToken(null)
    setCooldownState(null)
    setRequestedEmail(null)
    setOtpCode('')
    setMessage(null)
    setFailureReason(null)
    setPhase('auth_required')
  }

  const effectiveTestState = testState
  const resolvedPhase = isTestMode ? effectiveTestState.phase : phase
  const rawMessage = message ?? (isTestMode ? effectiveTestState.message : null)
  const rawFailureReason = failureReason ?? (isTestMode ? effectiveTestState.failureReason : null)
  const resolvedFailureReason = resolveFailureReasonMessage(rawFailureReason)
  const resolvedEmail = requestedEmail ?? (email || (isTestMode ? effectiveTestState.user?.email ?? '' : ''))
  const resolvedAccessToken = isTestMode && effectiveTestState.phase === 'authenticated' ? 'test-access-token' : accessToken

  const value: AuthContextValue = {
    accessToken: resolvedAccessToken,
    email: resolvedEmail,
    failureReason: rawFailureReason,
    message: rawMessage,
    phase: resolvedPhase,
    requestOtp,
    saveName,
    signOut,
  }

  if (resolvedPhase === 'loading' || resolvedPhase === 'verifying') {
    return <VerifyingScreen />
  }

  if (resolvedPhase === 'auth_required') {
    return (
      <AuthContext.Provider value={value}>
        <EmailRequestShell
          cooldownRemainingSeconds={resolvedCooldownRemainingSeconds}
          email={resolvedEmail}
          message={rawMessage}
          onEmailChange={(nextEmail) => {
            setEmail(nextEmail)
            if (cooldownState && nextEmail.trim().toLowerCase() !== cooldownState.email) {
              setCooldownState(null)
            }
          }}
          onSubmit={(nextEmail) => {
            void requestOtp(nextEmail)
          }}
          submitting={submitting}
        />
      </AuthContext.Provider>
    )
  }

  if (resolvedPhase === 'otp_required') {
    return (
      <AuthContext.Provider value={value}>
        <OtpShell
          code={otpCode}
          email={requestedEmail ?? resolvedEmail}
          message={rawMessage}
          onCodeChange={setOtpCode}
          onReset={() => {
            setRequestedEmail(null)
            setOtpCode('')
            setHasResentOtp(false)
            setCooldownState(null)
            setMessage(null)
            setFailureReason(null)
            setEmail('')
            if (isTestMode) {
              setTestAuthState({ phase: 'auth_required', failureReason: null, message: null, user: null })
            } else {
              setPhase('auth_required')
            }
          }}
          onSubmit={() => {
            void submitOtp()
          }}
          submitting={submitting}
        />
      </AuthContext.Provider>
    )
  }

  if (resolvedPhase === 'auth_failure') {
    return (
      <AuthContext.Provider value={value}>
        <AuthFailureScreen
          onReset={() => {
            setRequestedEmail(null)
            setOtpCode('')
            setHasResentOtp(false)
            setCooldownState(null)
            setFailureReason(null)
            setMessage(null)
            setEmail('')
            if (isTestMode) {
              setTestAuthState({ phase: 'auth_required', failureReason: null, message: null, user: null })
            } else {
              setPhase('auth_required')
            }
          }}
          onRetry={() => {
            setRequestedEmail(null)
            setOtpCode('')
            setHasResentOtp(false)
            setCooldownState(null)
            setFailureReason(null)
            setMessage(null)
            if (isTestMode) {
              setTestAuthState({ phase: 'auth_required', failureReason: null, message: null })
            } else {
              setPhase('auth_required')
            }
          }}
          reason={resolvedFailureReason}
        />
      </AuthContext.Provider>
    )
  }

  if (resolvedPhase === 'name_required') {
    return (
      <AuthContext.Provider value={value}>
        <NameCaptureScreen onSubmit={saveName} submitting={submitting} />
      </AuthContext.Provider>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
