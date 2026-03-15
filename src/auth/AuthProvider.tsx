import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue, type AuthPhase } from './authContext'
import { supabaseBrowser } from './supabaseBrowser'
import { requestTestLoginLink, setTestAuthState, signOutTestUser, submitTestName, useTestAuthState } from './testAuthState'
import { GENERIC_AUTH_FAILURE_MESSAGE, resolveBypassVerification, withTimeout } from './authVerification'

declare global {
  interface ImportMetaEnv {
    readonly VITE_LOCAL_AUTO_LOGIN?: string
    readonly VITE_LOCAL_AUTO_LOGIN_EMAIL?: string
  }
}

const SESSION_STARTED_AT_KEY = 'nurimap_session_started_at'
const SESSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000
const LOCAL_AUTO_LOGIN_REQUIRES_BYPASS_MESSAGE = '로컬 auto-login을 사용하려면 bypass 계정과 서버 bypass 설정이 필요해요.'
const VERIFY_PATH_SUFFIX = '/auth/verify'
const VERIFY_FAILURE_MESSAGES = {
  expired: '로그인 링크가 만료됐어요. 새 로그인 링크를 받아주세요.',
  invalidated: '최근에 보낸 로그인 링크만 사용할 수 있어요. 최신 이메일의 링크를 열어주세요.',
  used: '이미 사용한 로그인 링크예요. 새 로그인 링크를 받아주세요.',
} as const

const buildBasePathFromVerifyPath = (pathname: string) => {
  if (pathname === VERIFY_PATH_SUFFIX) {
    return '/'
  }

  if (pathname.endsWith(VERIFY_PATH_SUFFIX)) {
    const basePath = pathname.slice(0, -VERIFY_PATH_SUFFIX.length)
    return basePath || '/'
  }

  return pathname || '/'
}

const clearAuthEntryUrl = () => {
  const url = new URL(window.location.href)
  url.pathname = buildBasePathFromVerifyPath(url.pathname)
  url.search = ''
  window.history.replaceState({}, '', url.toString())
}

const resolveVerifyFailureMessage = (reason: string | null | undefined) => {
  if (!reason) {
    return GENERIC_AUTH_FAILURE_MESSAGE
  }

  return VERIFY_FAILURE_MESSAGES[reason as keyof typeof VERIFY_FAILURE_MESSAGES] ?? reason
}

const getVerifyEntryFromLocation = () => {
  const url = new URL(window.location.href)
  const authEmail = url.searchParams.get('email')
  const nonce = url.searchParams.get('nonce')
  const hasCanonicalVerifyPath = url.pathname === VERIFY_PATH_SUFFIX || url.pathname.endsWith(VERIFY_PATH_SUFFIX)

  if (hasCanonicalVerifyPath && authEmail && nonce) {
    return {
      email: authEmail,
      nonce,
    }
  }

  const authMode = url.searchParams.get('auth_mode')
  if (authMode === 'verify' && authEmail && nonce) {
    return {
      email: authEmail,
      nonce,
    }
  }

  return null
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

const AUTH_BRAND_ICON_SRC = '/assets/branding/brand-nurimap-logo.jpeg'
const authBrandTextStyle = {
  fontFamily: '"BM Jua", Pretendard, system-ui, sans-serif',
} as const

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
  <main className="min-h-screen bg-white px-4 py-10">
    <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center">
      <div className="w-full max-w-md px-8 py-8 sm:px-10 sm:py-10">{children}</div>
    </div>
  </main>
)

const AuthBrand = () => (
  <div className="inline-flex items-center gap-3">
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

const LOGIN_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NAME_LENGTH = 10

const AuthShell = ({
  email,
  message,
  onEmailChange,
  onSubmit,
  requestedEmail,
  showLinkSentState,
  submitting,
}: {
  email: string
  message: string | null
  onEmailChange: (value: string) => void
  onSubmit: (email: string) => void
  requestedEmail: string | null
  showLinkSentState: boolean
  submitting: boolean
}) => {
  const hasInlineError = !showLinkSentState && Boolean(message)
  const deliveredEmail = requestedEmail ?? email
  const submitEmail = showLinkSentState ? deliveredEmail : email
  const emailFormatValid = LOGIN_EMAIL_PATTERN.test(submitEmail.trim())
  const buttonDisabled = submitting || !emailFormatValid
  const buttonLabel = showLinkSentState ? '로그인 링크 다시 전송' : '로그인 링크 전송'
  const helperCopy = showLinkSentState
    ? '로그인 링크를 보냈어요. 메일함을 확인해 주세요.'
    : '누리미디어에서 사용 중인 이메일을 입력해주세요.'

  return (
    <AuthSurface>
      <div className="flex flex-col items-center gap-6">
        <AuthBrand />
        <p className="text-center text-base font-medium leading-6 text-zinc-900">
          {helperCopy}
        </p>
      </div>
      <form
        className="mt-6 flex flex-col items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit(submitEmail)
        }}
      >
        {showLinkSentState ? (
          <div
            className="flex h-12 w-full max-w-[320px] items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-base leading-6 text-zinc-900"
            data-testid="auth-requested-email"
          >
            {deliveredEmail}
          </div>
        ) : (
          <label className="form-control w-full max-w-[320px] gap-2">
            <span className="sr-only">이메일</span>
            <input
              className={`input h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-base leading-6 text-zinc-900 placeholder:text-stone-300 focus:border-gray-300 focus:outline-none focus:ring-0 focus:shadow-none ${hasInlineError ? 'border-error focus:border-error' : ''}`}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="example@nurimedia.co.kr"
              type="email"
              value={email}
            />
          </label>
        )}

        {hasInlineError ? (
          <p className="w-full max-w-[320px] text-sm text-error">{message}</p>
        ) : null}

        <button
          aria-label={buttonLabel}
          className={`btn h-10 w-full max-w-[320px] rounded-xl border-none bg-indigo-500 text-base font-semibold leading-6 text-white shadow-none ${
            buttonDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
          data-testid="auth-request-button"
          disabled={buttonDisabled}
          type="submit"
        >
          {submitting ? (
            <span aria-hidden="true" className="loading loading-spinner loading-sm" data-testid="auth-request-spinner" />
          ) : (
            buttonLabel
          )}
        </button>
      </form>
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
    <p className="text-center text-xs font-semibold uppercase tracking-[0.4em] text-primary/80">NURIMAP LOGIN</p>
    <h1 className="mt-8 text-center text-2xl font-bold text-base-content">인증에 실패했어요. 새 로그인 링크를 받아주세요.</h1>
    <p className="mt-3 text-center text-sm text-base-content/70">{reason ?? GENERIC_AUTH_FAILURE_MESSAGE}</p>
    <div className="mt-6 flex gap-3">
      <button className="btn btn-primary flex-1 rounded-2xl" onClick={onRetry} type="button">
        새 로그인 링크 받기
      </button>
      <button className="btn btn-ghost flex-1 rounded-2xl" onClick={onReset} type="button">
        이메일 다시 입력
      </button>
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
        <label className="form-control w-full max-w-[276px] gap-2">
          <span className="sr-only">이름</span>
          <input
            aria-label="이름"
            className={`input h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-base leading-6 text-zinc-900 placeholder:text-stone-300 focus:border-gray-300 focus:outline-none focus:ring-0 focus:shadow-none ${errorMessage ? 'border-error focus:border-error' : ''}`}
            onChange={(event) => setName(clampedName(event.target.value))}
            placeholder="김누리"
            value={name}
          />
        </label>
        {errorMessage ? <p className="w-full max-w-[276px] text-sm text-error">{errorMessage}</p> : null}
        <button
          aria-label="저장"
          className="btn h-10 w-full max-w-[276px] rounded-xl border-none bg-indigo-500 text-base font-semibold leading-6 text-white shadow-none"
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
          {submitting ? <span aria-hidden="true" className="loading loading-spinner loading-sm" data-testid="name-submit-spinner" /> : '저장'}
        </button>
      </div>
    </AuthSurface>
  )
}

const VerifyingScreen = () => (
  <AuthSurface>
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <span className="loading loading-spinner loading-lg text-primary" />
      <div data-testid="auth-verifying-spinner">
        <span className="sr-only">로그인 링크 검증 중</span>
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
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const hasAttemptedLocalAutoLoginRef = useRef(false)
  const phaseRef = useRef<AuthPhase>('loading')
  const suppressSignedOutRef = useRef(false)

  const devOverrideState = useMemo(() => getDevAuthOverride(), [])
  const localAutoLoginEmail = useMemo(() => getLocalAutoLoginEmail(), [])
  const isTestMode = import.meta.env.MODE === 'test' || devOverrideState !== null

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
    suppressSignedOutRef.current = false
    markSessionStarted()
    setAccessToken(accessToken)
    setEmail(user?.email ?? '')
    setRequestedEmail(null)
    setMessage(null)
    setFailureReason(null)
    setPhase(user?.user_metadata?.name ? 'authenticated' : 'name_required')
  }, [])

  const verifyAndAdoptSession = useCallback(async ({
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

    const bootstrap = async () => {
      const verifyEntry = getVerifyEntryFromLocation()
      const authEmail = verifyEntry?.email ?? null
      const nonce = verifyEntry?.nonce ?? null
      const hasVerifyQuery = authEmail !== null && nonce !== null
      suppressSignedOutRef.current = hasVerifyQuery

      if (hasVerifyQuery) {
        clearAuthEntryUrl()
      }

      const restoreSession = async (accessToken: string) => {
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
            accessToken,
            user: data.user,
          })
        }
      }

      try {
        if (getStoredSessionAgeExceeded()) {
          await supabaseBrowser.auth.signOut()
          clearSessionStarted()
        }

        const {
          data: { session },
        } = await withTimeout(supabaseBrowser.auth.getSession())

        if (hasVerifyQuery) {
          if (session?.access_token) {
            await restoreSession(session.access_token)
            return
          }

          setPhase('verifying')
          setEmail(authEmail)
          try {
            const timedResponse = await withTimeout(fetch('/api/auth/verify-link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: authEmail, nonce }),
            }))
            const payload = (await withTimeout(timedResponse.json())) as
              | { status: 'error'; reason: string }
              | { status: 'success'; tokenHash: string; verificationType: 'magiclink' | 'signup' | 'invite' }

            if (!timedResponse.ok || payload.status === 'error') {
              if (isMounted) {
                setPhase('auth_failure')
                setFailureReason(payload.status === 'error' ? resolveVerifyFailureMessage(payload.reason) : GENERIC_AUTH_FAILURE_MESSAGE)
              }
              return
            }

            const verification = await withTimeout(verifyAndAdoptSession({
              tokenHash: payload.tokenHash,
              verificationType: payload.verificationType,
            }))

            if (verification.status === 'error') {
              if (isMounted) {
                setPhase('auth_failure')
                setFailureReason(verification.message)
              }
              return
            }

            void withTimeout(fetch('/api/auth/consume-link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: authEmail, nonce }),
              keepalive: true,
            }))
              .then(async (consumeResponse) => {
                const payload = (await withTimeout(consumeResponse.json())) as
                  | { status: 'error'; reason: string }
                  | { status: 'success' }

                if (!consumeResponse.ok || payload.status === 'error') {
                  throw new Error('consume_link_failed')
                }
              })
              .catch(() => {
                console.warn('[auth] consume-link failed after verifyOtp success')
              })
          } catch {
            if (isMounted) {
              setPhase('auth_failure')
              setFailureReason(GENERIC_AUTH_FAILURE_MESSAGE)
            }
          }
          return
        }

        if (!session?.access_token) {
          suppressSignedOutRef.current = false
          if (isMounted) {
            setPhase('auth_required')
          }
          return
        }

        await restoreSession(session.access_token)
      } catch {
        if (isMounted) {
          if (hasVerifyQuery) {
            setPhase('auth_failure')
            setFailureReason(GENERIC_AUTH_FAILURE_MESSAGE)
          } else {
            suppressSignedOutRef.current = false
            setPhase('auth_required')
          }
        }
      }
    }

    void bootstrap()

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearSessionStarted()
        setAccessToken(null)

        if (suppressSignedOutRef.current || phaseRef.current === 'verifying' || phaseRef.current === 'auth_failure') {
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
  }, [applyAuthenticatedState, isTestMode, testState, verifyAndAdoptSession])

  const requestLink = useCallback(async (
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

    setSubmitting(true)
    setMessage(null)
    setEmail(nextEmail)

    if (isTestMode) {
      const result = await requestTestLoginLink(nextEmail)
      setSubmitting(false)
      if (result.status === 'error') {
        setRequestedEmail(null)
        setMessage(result.code === 'invalid_domain' ? '누리미디어 구성원만 사용할 수 있어요.' : null)
        return
      }
      setRequestedEmail(result.mode === 'link' ? nextEmail : null)
      return
    }

    try {
      const response = await withTimeout(fetch('/api/auth/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: nextEmail,
          requireBypass: options?.requireBypass === true,
        }),
      }))
      const payload = (await response.json()) as
        | { status: 'success'; mode: 'link'; message: string }
        | {
            status: 'success'
            mode: 'bypass'
            message: string
            tokenHash: string
            verificationType: 'magiclink' | 'signup' | 'invite'
          }
        | { status: 'error'; message: string }

      if (!response.ok || payload.status === 'error') {
        setRequestedEmail(null)
        setMessage(payload.message)
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
          verifyAndAdoptSession,
        })

        if (verification.status === 'error') {
          setPhase('auth_failure')
          setFailureReason(verification.message)
          return
        }

        return
      }

      setMessage(payload.message)
      setRequestedEmail(nextEmail)
      setPhase('auth_link_sent')
    } catch {
      setRequestedEmail(null)
      setMessage('로그인 링크를 보내지 못했어요. 다시 시도해 주세요.')
      setPhase('auth_required')
    } finally {
      setSubmitting(false)
    }
  }, [isTestMode, verifyAndAdoptSession])

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
      void requestLink(localAutoLoginEmail, { requireBypass: true })
    }, 0)

    return () => {
      window.clearTimeout(autoLoginTimer)
    }
  }, [isTestMode, localAutoLoginEmail, phase, requestLink, requestedEmail, submitting])

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

    suppressSignedOutRef.current = false
    await supabaseBrowser.auth.signOut()
    clearSessionStarted()
    setAccessToken(null)
    setRequestedEmail(null)
    setMessage(null)
    setFailureReason(null)
    setPhase('auth_required')
  }

  const effectiveTestState = testState
  const resolvedPhase = isTestMode ? effectiveTestState.phase : phase
  const resolvedMessage = isTestMode ? effectiveTestState.message : message
  const rawFailureReason = isTestMode ? effectiveTestState.failureReason : failureReason
  const resolvedFailureReason = rawFailureReason ? resolveVerifyFailureMessage(rawFailureReason) : null
  const resolvedEmail = email || (isTestMode ? effectiveTestState.user?.email ?? '' : email)
  const resolvedAccessToken = isTestMode && effectiveTestState.phase === 'authenticated' ? 'test-access-token' : accessToken

  const value: AuthContextValue = {
    accessToken: resolvedAccessToken,
    email: resolvedEmail,
    failureReason: resolvedFailureReason,
    message: resolvedMessage,
    phase: resolvedPhase,
    requestLink,
    saveName,
    signOut,
  }

  if (resolvedPhase === 'loading' || resolvedPhase === 'verifying') {
    return <VerifyingScreen />
  }

  if (resolvedPhase === 'auth_required' || resolvedPhase === 'auth_link_sent') {
    return (
      <AuthContext.Provider value={value}>
        <AuthShell
          email={resolvedEmail}
          message={resolvedMessage}
          onEmailChange={setEmail}
          onSubmit={() => {
            void requestLink(resolvedEmail)
          }}
          requestedEmail={requestedEmail}
          showLinkSentState={resolvedPhase === 'auth_link_sent'}
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
            if (isTestMode) {
              setTestAuthState({ phase: 'auth_required', failureReason: null, message: null })
            } else {
              suppressSignedOutRef.current = false
              suppressSignedOutRef.current = false
              setPhase('auth_required')
              setFailureReason(null)
              setMessage(null)
            }
            setRequestedEmail(null)
          }}
          onRetry={() => {
            if (isTestMode) {
              setTestAuthState({ phase: 'auth_required', failureReason: null, message: null })
            } else {
              suppressSignedOutRef.current = false
              setPhase('auth_required')
              setFailureReason(null)
              setMessage(null)
            }
            setRequestedEmail(null)
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
