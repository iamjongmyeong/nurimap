import { useSyncExternalStore } from 'react'

export type TestAuthPhase = 'authenticated' | 'auth_required' | 'auth_link_sent' | 'auth_failure' | 'name_required' | 'verifying'

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

export const requestTestLoginLink = async (email: string) => {
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
    setTestAuthState({ message: '허용된 회사 이메일만 사용할 수 있어요.' })
    return { status: 'error' as const, code: 'invalid_domain' as const }
  }

  if (email.startsWith('cooldown@')) {
    setTestAuthState({ phase: 'auth_required', message: '300초 후에 다시 시도해 주세요.' })
    return { status: 'error' as const, code: 'cooldown' as const }
  }

  if (email.startsWith('limit@')) {
    setTestAuthState({ phase: 'auth_required', message: '오늘은 더 이상 로그인 링크를 요청할 수 없어요.' })
    return { status: 'error' as const, code: 'daily_limit' as const }
  }

  setTestAuthState({
    phase: 'auth_link_sent',
    message: '로그인 링크를 보냈어요.',
  })
  return { status: 'success' as const, mode: 'link' as const }
}

export const verifyTestLoginLink = async (reason: string | null = null) => {
  if (reason) {
    setTestAuthState({ phase: 'auth_failure', failureReason: reason })
    return { status: 'error' as const }
  }

  setTestAuthState({
    phase: 'name_required',
    user: {
      email: 'tester@nurimedia.co.kr',
      name: null,
    },
  })
  return { status: 'success' as const }
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
