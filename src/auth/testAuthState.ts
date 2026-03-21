import { useSyncExternalStore } from 'react'
import { OTP_ENTRY_FAILURE_MESSAGE } from './authVerification'

export type TestAuthPhase = 'authenticated' | 'auth_required' | 'otp_required' | 'auth_failure' | 'name_required' | 'verifying'

export type TestAuthUser = {
  email: string
  name: string | null
}

type TestAuthState = {
  phase: TestAuthPhase
  user: TestAuthUser | null
  message: string | null
  failureReason: string | null
}

export const defaultTestAuthState: TestAuthState = {
  phase: 'authenticated',
  user: {
    email: 'tester@nurimedia.co.kr',
    name: '테스트 사용자',
  },
  message: null,
  failureReason: null,
}

let state: TestAuthState = defaultTestAuthState
const listeners = new Set<() => void>()

const emit = () => {
  listeners.forEach((listener) => listener())
}

export const resetTestAuthState = () => {
  state = defaultTestAuthState
  emit()
}

export const setTestAuthState = (nextState: Partial<TestAuthState>) => {
  state = {
    ...state,
    ...nextState,
  }
  emit()
}

export const useTestAuthState = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
  )

export const requestTestOtp = async (email: string) => {
  await new Promise((resolve) => setTimeout(resolve, 10))

  if (email === 'bypass.user@example.com') {
    setTestAuthState({
      phase: 'name_required',
      user: {
        email,
        name: null,
      },
      message: null,
      failureReason: null,
    })
    return { status: 'success' as const, mode: 'bypass' as const }
  }

  if (email === 'bypass.named@example.com') {
    setTestAuthState({
      phase: 'authenticated',
      user: {
        email,
        name: 'Bypass Tester',
      },
      message: null,
      failureReason: null,
    })
    return { status: 'success' as const, mode: 'bypass' as const }
  }

  if (!email.endsWith('@nurimedia.co.kr')) {
    setTestAuthState({ message: '누리미디어 구성원만 사용할 수 있어요.' })
    return { status: 'error' as const, code: 'invalid_domain' as const }
  }

  if (email.startsWith('cooldown@')) {
    setTestAuthState({ phase: 'auth_required', message: null, failureReason: null })
    return { status: 'error' as const, code: 'cooldown' as const, retryAfterSeconds: 300 }
  }

  setTestAuthState({
    phase: 'otp_required',
    message: '인증 코드를 보냈어요.',
    user: {
      email,
      name: null,
    },
    failureReason: null,
  })
  return { status: 'success' as const, mode: 'otp' as const }
}

export const verifyTestOtp = async ({
  code,
  email,
}: {
  code: string
  email: string
}) => {
  await new Promise((resolve) => setTimeout(resolve, 10))

  if (code === '111111') {
    setTestAuthState({
      phase: 'name_required',
      user: {
        email,
        name: null,
      },
      message: null,
      failureReason: null,
    })
    return { status: 'success' as const }
  }

  if (code === '222222') {
    return { status: 'error' as const, message: OTP_ENTRY_FAILURE_MESSAGE }
  }

  if (code === '333333') {
    return { status: 'error' as const, message: OTP_ENTRY_FAILURE_MESSAGE }
  }

  return { status: 'error' as const, message: OTP_ENTRY_FAILURE_MESSAGE }
}

export const submitTestName = async (name: string) => {
  await new Promise((resolve) => setTimeout(resolve, 10))
  setTestAuthState({
    phase: 'authenticated',
    user: {
      email: state.user?.email ?? 'tester@nurimedia.co.kr',
      name,
    },
  })
}

export const signOutTestUser = async () => {
  setTestAuthState({
    phase: 'auth_required',
    user: null,
    message: null,
    failureReason: null,
  })
}
