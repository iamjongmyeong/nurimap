export const AUTH_BOOTSTRAP_TIMEOUT_MS = 5000
export const GENERIC_AUTH_FAILURE_MESSAGE = '인증에 실패했어요. 새 코드를 받아주세요.'
export const OLD_LINK_FALLBACK_MESSAGE = '이 로그인 링크는 더 이상 사용할 수 없어요.\n이메일로 인증 코드를 다시 받아주세요.'

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

export const resolveOtpVerifyFailureMessage = ({
  errorMessage,
  hasResent,
}: {
  errorMessage: string | null | undefined
  hasResent: boolean
}) => {
  const normalized = errorMessage?.toLowerCase() ?? ''

  if (normalized.includes('expired') || normalized.includes('otp_expired')) {
    return hasResent
      ? '새 코드가 발급됐어요.\n새 코드를 입력해 주세요.'
      : '인증 코드가 만료됐어요.\n새 코드를 받아주세요.'
  }

  if (normalized.includes('invalid token') || normalized.includes('token has expired or is invalid')) {
    return hasResent
      ? '새 코드가 발급됐어요.\n새 코드를 입력해 주세요.'
      : '인증 코드가 올바르지 않아요. 다시 확인해 주세요.'
  }

  if (normalized.includes('invalid') || normalized.includes('otp')) {
    return '인증 코드가 올바르지 않아요. 다시 확인해 주세요.'
  }

  return GENERIC_AUTH_FAILURE_MESSAGE
}

export { withTimeout }
