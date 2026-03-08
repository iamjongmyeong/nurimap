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

const AuthShell = ({
  email,
  message,
  onEmailChange,
  onSubmit,
  submitting,
}: {
  email: string
  message: string | null
  onEmailChange: (value: string) => void
  onSubmit: () => void
  submitting: boolean
}) => (
  <main className="min-h-screen bg-base-200 px-4 py-10">
    <div className="mx-auto max-w-md rounded-[28px] bg-base-100 p-8 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Nurimap Auth</p>
      <h1 className="mt-3 text-2xl font-bold text-base-content">회사 이메일로 로그인</h1>
      <p className="mt-3 text-sm text-base-content/70">@nurimedia.co.kr 이메일로 로그인 링크를 요청할 수 있습니다.</p>
      <label className="form-control mt-6 w-full gap-2">
        <span className="label-text font-semibold text-base-content">이메일</span>
        <input
          aria-label="이메일"
          className={`input input-bordered w-full ${message ? 'input-error' : ''}`}
          onChange={(event) => onEmailChange(event.target.value)}
          type="email"
          value={email}
        />
      </label>
      {message ? <p className="mt-3 text-sm text-error">{message}</p> : null}
      <button
        className="btn btn-primary mt-6 w-full rounded-2xl"
        data-testid="auth-request-button"
        disabled={submitting}
        onClick={onSubmit}
        type="button"
      >
        {submitting ? '요청 중...' : '로그인 링크 받기'}
      </button>
    </div>
  </main>
)

const AuthFailureScreen = ({
  onReset,
  onRetry,
  reason,
}: {
  onReset: () => void
  onRetry: () => void
  reason: string | null
}) => (
  <main className="min-h-screen bg-base-200 px-4 py-10">
    <div className="mx-auto max-w-md rounded-[28px] bg-base-100 p-8 shadow-xl">
      <h1 className="text-2xl font-bold text-base-content">인증에 실패했어요</h1>
      <p className="mt-3 text-sm text-base-content/70">{reason ?? '로그인 링크를 다시 확인해 주세요.'}</p>
      <div className="mt-6 flex gap-3">
        <button className="btn btn-primary flex-1 rounded-2xl" onClick={onRetry} type="button">
          새 로그인 링크 받기
        </button>
        <button className="btn btn-ghost flex-1 rounded-2xl" onClick={onReset} type="button">
          이메일 다시 입력
        </button>
      </div>
    </div>
  </main>
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
    <main className="min-h-screen bg-base-200 px-4 py-10">
      <div className="mx-auto max-w-md rounded-[28px] bg-base-100 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-base-content">이름 입력</h1>
        <label className="form-control mt-6 gap-2">
          <span className="label-text font-semibold text-base-content">이름</span>
          <input
            aria-label="이름"
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
    </main>
  )
}

const VerifyingScreen = () => (
  <main className="flex min-h-screen items-center justify-center bg-base-200">
    <div className="rounded-[28px] bg-base-100 px-8 py-10 shadow-xl">
      <span className="loading loading-spinner loading-lg text-primary" />
      <p className="mt-4 text-sm font-medium text-base-content">로그인 링크를 확인하는 중입니다.</p>
    </div>
  </main>
)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const testState = useTestAuthState()
  const [phase, setPhase] = useState<AuthPhase>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [failureReason, setFailureReason] = useState<string | null>(null)
  const [email, setEmail] = useState('')
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

      if (authMode === 'verify' && authEmail && nonce) {
        setPhase('verifying')
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
          return
        }
        return
      }

      if (getStoredSessionAgeExceeded()) {
        await supabaseBrowser.auth.signOut()
        clearSessionStarted()
      }

      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession()

      if (!session?.access_token) {
        if (isMounted) {
          setPhase('auth_required')
        }
        return
      }

      const { data, error } = await supabaseBrowser.auth.getUser()
      if (error || !data.user) {
        await supabaseBrowser.auth.signOut()
        clearSessionStarted()
        if (isMounted) {
          setPhase('auth_required')
        }
        return
      }

      markSessionStarted()
      setAccessToken(session.access_token)
      setEmail(data.user.email ?? '')
      if (data.user.user_metadata?.name) {
        setPhase('authenticated')
      } else {
        setPhase('name_required')
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
        setPhase(user?.user_metadata?.name ? 'authenticated' : 'name_required')
      }
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [isTestMode, testState, verifyAndAdoptSession])

  const requestLink = async (nextEmail: string) => {
    setSubmitting(true)
    setMessage(null)

    if (isTestMode) {
      const result = await requestTestLoginLink(nextEmail)
      setEmail(nextEmail)
      setSubmitting(false)
      if (result.status === 'error') {
        setMessage(result.code === 'invalid_domain' ? '허용된 회사 이메일만 사용할 수 있어요.' : null)
      }
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
      setMessage(payload.message)
      setPhase('auth_required')
      return
    }

    if (payload.mode === 'bypass') {
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
          email={email}
          message={resolvedMessage}
          onEmailChange={setEmail}
          onSubmit={() => {
            void requestLink(email)
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
            if (isTestMode) {
              setTestAuthState({ phase: 'auth_required', failureReason: null, message: null })
            } else {
              setPhase('auth_required')
              setFailureReason(null)
            }
          }}
          onRetry={() => {
            if (isTestMode) {
              setTestAuthState({ phase: 'auth_required', failureReason: null, message: null })
            } else {
              setPhase('auth_required')
              setFailureReason(null)
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
