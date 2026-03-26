// Canonical FE auth stays on the OTP request/verify routes. The bypass-shaped
// fields below remain only for local compatibility flows.
export type RequestOtpResponse =
  | { status: 'success'; mode: 'otp'; message: string; requestResolution?: 'accepted' }
  | {
      status: 'success'
      mode: 'bypass'
      message: string
      tokenHash: string
      verificationType: 'magiclink' | 'signup' | 'invite'
      requestResolution?: 'accepted'
    }
  | {
      status: 'error'
      code: 'cooldown'
      message: string
      retryAfterSeconds: number
      requestResolution?: 'rejected' | 'unknown'
    }
  | {
      status: 'error'
      code?: string
      message: string
      requestResolution?: 'rejected' | 'unknown'
    }

export type VerifyOtpResponse =
  | {
      status: 'success'
      nextPhase: 'authenticated' | 'name_required'
      user: {
        id: string
        email: string
        name: string | null
      }
      csrfHeaderName: string
    }
  | {
      status: 'error'
      message: string
    }

export type SessionResponse =
  | {
      status: 'authenticated'
      user: {
        id: string
        email: string
        name: string | null
      }
      csrfHeaderName: string
    }
  | {
      status: 'missing'
    }

export type SaveNameResponse =
  | {
      status: 'success'
      name: string
    }
  | {
      error: {
        code: string
        message: string
      }
    }

const parseJson = async <T>(response: Response) => {
  return response.json() as Promise<T>
}

export const requestOtpViaApi = async ({
  email,
  intent,
  requireBypass = false,
  requestAttemptId,
}: {
  email: string
  intent?: 'send' | 'status'
  requireBypass?: boolean
  requestAttemptId?: string
}) => {
  const response = await fetch('/api/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      intent,
      requireBypass,
      requestAttemptId,
    }),
  })

  return {
    response,
    payload: await parseJson<RequestOtpResponse>(response),
  }
}

export const verifyOtpViaApi = async ({
  email,
  tokenHash,
  token,
  verificationType,
}: {
  email: string
  tokenHash?: string
  token: string
  verificationType?: 'magiclink' | 'signup' | 'invite'
}) => {
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      token,
      tokenHash,
      verificationType,
    }),
  })

  return {
    response,
    payload: await parseJson<VerifyOtpResponse>(response),
  }
}

export const getSessionViaApi = async ({
  signal,
}: {
  signal?: AbortSignal
} = {}) => {
  const response = await fetch('/api/auth/session', {
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
  })
  return {
    response,
    payload: await parseJson<SessionResponse>(response),
  }
}

export const saveNameViaApi = async ({
  csrfHeaderName,
  csrfToken,
  name,
}: {
  csrfHeaderName: string
  csrfToken: string
  name: string
}) => {
  const response = await fetch('/api/auth/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [csrfHeaderName]: csrfToken,
    },
    body: JSON.stringify({
      name,
    }),
  })

  return {
    response,
    payload: await parseJson<SaveNameResponse>(response),
  }
}

export const signOutViaApi = async ({
  csrfHeaderName,
  csrfToken,
}: {
  csrfHeaderName: string
  csrfToken: string
}) => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
      [csrfHeaderName]: csrfToken,
    },
  })

  return response
}
