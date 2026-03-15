export const AUTH_BOOTSTRAP_TIMEOUT_MS = 5000
export const GENERIC_AUTH_FAILURE_MESSAGE = '인증에 실패했어요. 새 로그인 링크를 다시 받아주세요.'

export type AuthVerificationType = 'magiclink' | 'signup' | 'invite'

export type AuthVerificationResult =
  | { status: 'success' }
  | { status: 'error'; message: string }

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = AUTH_BOOTSTRAP_TIMEOUT_MS) => {
  let timeoutId: number | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error('auth_bootstrap_timeout'))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
    }
  }
}

export const resolveBypassVerification = async ({
  tokenHash,
  verificationType,
  verifyAndAdoptSession,
}: {
  tokenHash: string
  verificationType: AuthVerificationType
  verifyAndAdoptSession: (args: {
    tokenHash: string
    verificationType: AuthVerificationType
  }) => Promise<AuthVerificationResult>
}) => {
  try {
    return await withTimeout(verifyAndAdoptSession({ tokenHash, verificationType }))
  } catch {
    return {
      status: 'error' as const,
      message: GENERIC_AUTH_FAILURE_MESSAGE,
    }
  }
}

export { withTimeout }
