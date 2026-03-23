export const AUTH_BOOTSTRAP_TIMEOUT_MS = 5000
export const AUTH_REQUEST_TIMEOUT_MS = 15000
export const GENERIC_AUTH_FAILURE_MESSAGE = '새로운 코드로 다시 시도해주세요.'
export const OTP_ENTRY_FAILURE_MESSAGE = '이 코드는 사용할 수 없어요.'

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
    return OTP_ENTRY_FAILURE_MESSAGE
  }

  if (normalized.includes('invalid token') || normalized.includes('token has expired or is invalid')) {
    return OTP_ENTRY_FAILURE_MESSAGE
  }

  if (normalized.includes('invalid') || normalized.includes('otp')) {
    return OTP_ENTRY_FAILURE_MESSAGE
  }

  return hasResent ? OTP_ENTRY_FAILURE_MESSAGE : GENERIC_AUTH_FAILURE_MESSAGE
}

export { withTimeout }
