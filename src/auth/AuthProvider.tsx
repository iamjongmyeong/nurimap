import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue, type AuthPhase } from './authContext'
import { supabaseBrowser } from './supabaseBrowser'
import { requestTestLoginLink, setTestAuthState, signOutTestUser, submitTestName, useTestAuthState } from './testAuthState'

const SESSION_STARTED_AT_KEY = 'nurimap_session_started_at'
const SESSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000


const clearAuthQuery = () => {
  const url = new URL(window.location.href)
  url.search = ''
  window.history.replaceState({}, '', url.toString())
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

const authLoginWordmarkStyle = {
  fontFamily: 'Rota, Pretendard, system-ui, sans-serif',
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

const AuthSurface = ({ children }: { children: ReactNode }) => (
  <main className="min-h-screen bg-base-200 px-4 py-10">
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
      <div className="w-full max-w-md px-8 py-8 sm:px-10 sm:py-10">{children}</div>
    </div>
  </main>
)

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
  onSubmit: () => void
  requestedEmail: string | null
  showLinkSentState: boolean
  submitting: boolean
}) => {
  const hasInlineError = !showLinkSentState && Boolean(message)
  const deliveredEmail = requestedEmail ?? email

  return (
    <AuthSurface>
      <p
        className="text-center text-[20px] font-bold uppercase leading-none tracking-[0.16em] text-base-content"
        style={authLoginWordmarkStyle}
      >
        NURIMAP LOGIN
      </p>
      <form
        className="mt-8"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit()
        }}
      >
        <label className="form-control w-full gap-2">
          <span className="sr-only">이메일</span>
          <input
            className={`input input-bordered h-13 w-full rounded-2xl focus:border-primary focus:outline-none focus:ring-0 focus:shadow-none ${hasInlineError ? 'input-error' : ''}`}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="example@nurimedia.co.kr"
            type="email"
            value={email}
          />
        </label>

        {showLinkSentState ? (
          <div className="mt-4 rounded-[24px] border border-primary/15 bg-primary/5 px-4 py-4 text-center">
            <p className="text-sm font-semibold text-base-content">{message ?? '로그인 링크를 보냈어요.'}</p>
            <p className="mt-2 break-all text-sm text-base-content">{deliveredEmail}</p>
            <p className="mt-2 text-sm text-base-content/70">메일함에서 로그인 링크를 확인해 주세요.</p>
          </div>
        ) : null}

        {hasInlineError ? <p className="mt-4 text-sm text-error">{message}</p> : null}

        <button
          className="btn btn-primary mt-6 h-13 w-full rounded-2xl"
          data-testid="auth-request-button"
          disabled={submitting}
          type="submit"
        >
          {submitting ? '요청 중...' : '이메일로 로그인 링크 전송'}
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
    <h1 className="mt-8 text-center text-2xl font-bold text-base-content">인증에 실패했어요</h1>
    <p className="mt-3 text-center text-sm text-base-content/70">{reason ?? '로그인 링크를 다시 확인해 주세요.'}</p>
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

  return (
    <AuthSurface>
      <p className="text-center text-xs font-semibold uppercase tracking-[0.4em] text-primary/80">NURIMAP LOGIN</p>
      <div className="mt-8">
        <h1 className="text-2xl font-bold text-base-content">이름 입력</h1>
        <label className="form-control mt-6 gap-2">
          <span className="label-text font-semibold text-base-content">이름</span>
          <input
            className={`input input-bordered ${errorMessage ? 'input-error' : ''}`}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>
        {errorMessage ? <p className="mt-3 text-sm text-error">{errorMessage}</p> : null}
        <button
          className="btn btn-primary mt-6 w-full rounded-2xl"
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
          {submitting ? '저장 중...' : '이름 저장'}
        </button>
      </div>
    </AuthSurface>
  )
}

const VerifyingScreen = () => (
  <AuthSurface>
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <span className="loading loading-spinner loading-lg text-primary" />
      <p className="mt-4 text-sm font-medium text-base-content">로그인 링크를 확인하는 중입니다.</p>
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

  const devOverrideState = useMemo(() => getDevAuthOverride(), [])
  const isTestMode = import.meta.env.MODE === 'test' || devOverrideState !== null

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
        message: error?.message ?? '인증에 실패했어요.',
      }
    }

    markSessionStarted()
    setAccessToken(data.session.access_token)
    setEmail(data.user.email ?? '')
    setRequestedEmail(null)
    setMessage(null)
    setFailureReason(null)
    if (data.user.user_metadata?.name) {
      setPhase('authenticated')
    } else {
      setPhase('name_required')
    }

    return {
      status: 'success' as const,
    }
  }, [])

  useEffect(() => {
    if (devOverrideState) {
      setTestAuthState(devOverrideState)
    }
  }, [devOverrideState])

  useEffect(() => {
    if (isTestMode) {
      return
    }

    let isMounted = true

    const bootstrap = async () => {
      const params = new URLSearchParams(window.location.search)
      const authMode = params.get('auth_mode')
      const authEmail = params.get('email')
      const nonce = params.get('nonce')
      const hasVerifyQuery = authMode === 'verify' && authEmail && nonce

      const restoreSession = async (accessToken: string) => {
        const { data, error } = await supabaseBrowser.auth.getUser()
        if (error || !data.user) {
          await supabaseBrowser.auth.signOut()
          clearSessionStarted()
          if (isMounted) {
            setAccessToken(null)
            setPhase('auth_required')
          }
          return
        }

        markSessionStarted()
        if (isMounted) {
          setAccessToken(accessToken)
          setEmail(data.user.email ?? '')
          setRequestedEmail(null)
          setMessage(null)
          setFailureReason(null)
          if (data.user.user_metadata?.name) {
            setPhase('authenticated')
          } else {
            setPhase('name_required')
          }
        }
      }

      try {
        if (getStoredSessionAgeExceeded()) {
          await supabaseBrowser.auth.signOut()
          clearSessionStarted()
        }

        const {
          data: { session },
        } = await supabaseBrowser.auth.getSession()

        if (hasVerifyQuery) {
          if (session?.access_token) {
            clearAuthQuery()
            await restoreSession(session.access_token)
            return
          }

          setPhase('verifying')
          setEmail(authEmail)
          try {
            const response = await fetch('/api/auth/verify-link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: authEmail, nonce }),
            })
            const payload = (await response.json()) as
              | { status: 'error'; reason: string }
              | { status: 'success'; tokenHash: string; verificationType: 'magiclink' | 'signup' | 'invite' }

            if (!response.ok || payload.status === 'error') {
              if (isMounted) {
                setPhase('auth_failure')
                setFailureReason(payload.status === 'error' ? payload.reason : '인증에 실패했어요.')
                clearAuthQuery()
              }
              return
            }

            clearAuthQuery()
            const verification = await verifyAndAdoptSession({
              tokenHash: payload.tokenHash,
              verificationType: payload.verificationType,
            })

            if (verification.status === 'error') {
              if (isMounted) {
                setPhase('auth_failure')
                setFailureReason(verification.message)
              }
            }
          } catch {
            if (isMounted) {
              setPhase('auth_failure')
              setFailureReason('인증에 실패했어요.')
              clearAuthQuery()
            }
          }
          return
        }

        if (!session?.access_token) {
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
            setFailureReason('인증에 실패했어요.')
            clearAuthQuery()
          } else {
            setPhase('auth_required')
          }
        }
      }
    }

    void bootstrap()

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        clearSessionStarted()
        setAccessToken(null)
        setPhase('auth_required')
      }

      if (event === 'SIGNED_IN' && session?.access_token) {
        markSessionStarted()
        setAccessToken(session.access_token)
        const { data } = await supabaseBrowser.auth.getUser()
        const user = data.user
        setEmail(user?.email ?? '')
        setRequestedEmail(null)
        setPhase(user?.user_metadata?.name ? 'authenticated' : 'name_required')
      }
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [isTestMode, testState, verifyAndAdoptSession])

  const requestLink = async (nextEmail: string) => {
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

    if (isTestMode) {
      const result = await requestTestLoginLink(nextEmail)
      setEmail(nextEmail)
      setSubmitting(false)
      if (result.status === 'error') {
        setRequestedEmail(null)
        setMessage(result.code === 'invalid_domain' ? '누리미디어 구성원만 사용할 수 있어요.' : null)
        return
      }
      setRequestedEmail(result.mode === 'link' ? nextEmail : null)
      return
    }

    const response = await fetch('/api/auth/request-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: nextEmail }),
    })
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
    setSubmitting(false)
    setEmail(nextEmail)

    if (!response.ok || payload.status === 'error') {
      setRequestedEmail(null)
      setMessage(payload.message)
      setPhase('auth_required')
      return
    }

    if (payload.mode === 'bypass') {
      setRequestedEmail(null)
      setPhase('verifying')
      setMessage(payload.message)

      const verification = await verifyAndAdoptSession({
        tokenHash: payload.tokenHash,
        verificationType: payload.verificationType,
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
  }

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
    if (isTestMode) {
      await signOutTestUser()
      return
    }

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
  const resolvedFailureReason = isTestMode ? effectiveTestState.failureReason : failureReason
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
