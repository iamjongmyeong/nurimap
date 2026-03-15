import crypto from 'node:crypto'
import {
  AUTH_LINK_EXPIRES_MINUTES,
  buildIssuedLoginLinkState,
  consumeVerificationState,
  createEmptyLoginLinkState,
  evaluateRequestPolicy,
  evaluateVerificationState,
  isAllowedEmailDomain,
  type LoginLinkState,
} from './authPolicy.js'
import { logAuthBypassLogin, logAuthConsumeFailure, logAuthRequestAccepted, logAuthRequestFailure } from './opsLogger.js'
import { createSupabaseAdminClient, createSupabaseBrowserlessClient } from './supabaseAdmin.js'

type AuthRequestErrorCode = 'invalid_domain' | 'cooldown' | 'delivery_failed' | 'bypass_required'
type AuthVerifyErrorReason = 'expired' | 'used' | 'invalidated'
type AuthVerifyType = 'magiclink' | 'signup' | 'invite'
type RequestLoginLinkOptions = {
  requireBypass?: boolean
}
type AuthRequestError =
  | {
      status: 'error'
      code: 'cooldown'
      message: string
      retryAfterSeconds: number
    }
  | {
      status: 'error'
      code: Exclude<AuthRequestErrorCode, 'cooldown'>
      message: string
    }
type SendLoginEmailResult =
  | {
      ok: true
      providerMessageId: string | null
      statusCode: number
    }
  | {
      ok: false
      statusCode: number | null
      providerErrorCode: string | null
      providerErrorMessage: string | null
    }
type AuthRequestSuccess =
  | {
      status: 'success'
      mode: 'link'
      message: string
    }
  | {
      status: 'success'
      mode: 'bypass'
      message: string
      tokenHash: string
      verificationType: AuthVerifyType
    }

const getBypassEmails = () =>
  (process.env.AUTH_BYPASS_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

const isBypassLoginEmail = (email: string) => {
  if (process.env.AUTH_BYPASS_ENABLED !== 'true') {
    return false
  }

  return getBypassEmails().includes(email.trim().toLowerCase())
}

const toVerificationType = (verificationType: string | undefined): AuthVerifyType =>
  verificationType === 'magiclink' || verificationType === 'invite' ? verificationType : 'signup'

const getPublicAppUrl = () => {
  const rawValue = process.env.PUBLIC_APP_URL?.trim()
  if (!rawValue) {
    return null
  }

  try {
    const parsedUrl = new URL(rawValue)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return null
    }

    if (parsedUrl.hash) {
      parsedUrl.hash = ''
    }

    const normalizedUrl = parsedUrl.toString()
    if (parsedUrl.pathname === '/' && !parsedUrl.search) {
      return normalizedUrl.replace(/\/$/, '')
    }

    return normalizedUrl
  } catch {
    return null
  }
}

const buildLoginUrl = ({ baseUrl, email, nonce }: { baseUrl: string; email: string; nonce: string }) => {
  const url = new URL(baseUrl)
  const normalizedPath = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')
  url.pathname = `${normalizedPath}/auth/verify`
  url.search = ''
  url.searchParams.set('email', email)
  url.searchParams.set('nonce', nonce)
  return url.toString()
}

const formatCooldownMessage = (remainingSeconds: number) => {
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  if (minutes === 0) {
    return `${remainingSeconds}초 후에 다시 시도해주세요.`
  }

  return `${minutes}분 ${String(seconds).padStart(2, '0')}초 후에 다시 시도해주세요.`
}

const buildLoginEmailHtml = (loginUrl: string) => `
  <div style="margin:0 auto;max-width:480px;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;color:#111827;">
    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.32em;">NURIMAP LOGIN</p>
    <p style="margin:28px 0 0;">
      <a href="${loginUrl}" style="display:inline-block;border-radius:999px;background:#111827;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">누리맵 로그인</a>
    </p>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#4b5563;">링크는 5분 동안만 유효합니다.</p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#4b5563;">버튼이 동작하지 않으면 아래 링크를 직접 열어주세요.</p>
    <p style="margin:16px 0 0;font-size:13px;line-height:1.7;word-break:break-all;">
      <a href="${loginUrl}" style="color:#2563eb;text-decoration:underline;">${loginUrl}</a>
    </p>
  </div>
`

const buildLoginEmailText = (loginUrl: string) =>
  ['[NURIMAP] 로그인 링크', '', loginUrl, '', '5분 동안만 유효합니다.'].join('\n')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const getDurationMs = (startedAt: number) => Date.now() - startedAt

const bypassRequiredResult = (email: string) => {
  logAuthRequestFailure({ code: 'bypass_required', email })
  return {
    status: 'error' as const,
    code: 'bypass_required' as AuthRequestErrorCode,
    message: '로컬 auto-login을 사용하려면 bypass 계정과 서버 bypass 설정이 필요해요.',
  }
}

const deliveryFailedResult = (email: string, details: Record<string, unknown> = {}) => {
  logAuthRequestFailure({ code: 'delivery_failed', email, details })
  return {
    status: 'error' as const,
    code: 'delivery_failed' as AuthRequestErrorCode,
    message: '로그인 링크를 보내지 못했어요. 다시 시도해 주세요.',
  }
}

const generateImmediateBypassPayload = async (
  email: string,
  publicAppUrl: string,
): Promise<AuthRequestSuccess | { status: 'error'; code: AuthRequestErrorCode; message: string }> => {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: publicAppUrl,
    },
  })

  if (error || !data.properties.hashed_token) {
    return deliveryFailedResult(email)
  }

  logAuthBypassLogin({ email })

  return {
    status: 'success',
    mode: 'bypass',
    message: '테스트 계정으로 바로 로그인합니다.',
    tokenHash: data.properties.hashed_token,
    verificationType: toVerificationType(data.properties.verification_type),
  }
}

const findUserByEmail = async (email: string) => {
  const admin = createSupabaseAdminClient()
  let page = 1

  while (page < 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) {
      throw error
    }

    const matchedUser = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (matchedUser) {
      return matchedUser
    }

    if (data.users.length < 200) {
      return null
    }

    page += 1
  }

  return null
}

const getLoginState = (user: { app_metadata?: Record<string, unknown> } | null): LoginLinkState => {
  const appMetadata = user?.app_metadata ?? {}
  const state = appMetadata.nurimap_auth
  if (!state || typeof state !== 'object') {
    return createEmptyLoginLinkState()
  }
  return {
    ...createEmptyLoginLinkState(),
    ...(state as LoginLinkState),
  }
}

const updateUserAuthState = async (userId: string, nextState: LoginLinkState, userMetadata?: Record<string, unknown>) => {
  const admin = createSupabaseAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      nurimap_auth: nextState,
    },
    user_metadata: userMetadata,
  })
  if (error) {
    throw error
  }
}

const sendLoginEmail = async ({
  email,
  loginUrl,
}: {
  email: string
  loginUrl: string
}): Promise<SendLoginEmailResult> => {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [email],
        subject: '[NURIMAP] 로그인 링크',
        html: buildLoginEmailHtml(loginUrl),
        text: buildLoginEmailText(loginUrl),
      }),
    })

    let responseBody: unknown = null

    try {
      const rawBody = await response.text()
      responseBody = rawBody ? JSON.parse(rawBody) : null
    } catch {
      responseBody = null
    }

    if (!response.ok) {
      return {
        ok: false,
        statusCode: response.status,
        providerErrorCode:
          isRecord(responseBody) && typeof responseBody.name === 'string' ? responseBody.name : null,
        providerErrorMessage:
          isRecord(responseBody) && typeof responseBody.message === 'string' ? responseBody.message : null,
      }
    }

    return {
      ok: true,
      statusCode: response.status,
      providerMessageId:
        isRecord(responseBody) && typeof responseBody.id === 'string' ? responseBody.id : null,
    }
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      providerErrorCode: 'network_error',
      providerErrorMessage: error instanceof Error ? error.message : 'unknown_error',
    }
  }
}

export const requestLoginLink = async (email: string, options: RequestLoginLinkOptions = {}) => {
  const requestStartedAt = Date.now()
  const allowedDomain = process.env.AUTH_ALLOWED_EMAIL_DOMAIN ?? ''
  const normalizedEmail = email.trim().toLowerCase()
  const publicAppUrl = getPublicAppUrl()
  const bypassLoginEmail = isBypassLoginEmail(normalizedEmail)

  if (options.requireBypass && !bypassLoginEmail) {
    return bypassRequiredResult(normalizedEmail)
  }

  if (bypassLoginEmail) {
    if (!publicAppUrl) {
      return deliveryFailedResult(normalizedEmail, { failure_stage: 'public_app_url' })
    }

    return await generateImmediateBypassPayload(normalizedEmail, publicAppUrl)
  }

  if (!isAllowedEmailDomain(normalizedEmail, allowedDomain)) {
    logAuthRequestFailure({ code: 'invalid_domain', email: normalizedEmail })
    return {
      status: 'error' as const,
      code: 'invalid_domain' as AuthRequestErrorCode,
      message: '누리미디어 구성원만 사용할 수 있어요.',
    }
  }

  const findUserStartedAt = Date.now()
  const existingUser = await findUserByEmail(normalizedEmail)
  const findUserMs = getDurationMs(findUserStartedAt)
  const currentState = getLoginState(existingUser)
  const now = new Date()
  const requestPolicy = evaluateRequestPolicy({ now, state: currentState })

  if (!requestPolicy.allowed) {
    const remainingSeconds = requestPolicy.remainingSeconds ?? 0
    logAuthRequestFailure({ code: 'cooldown', email: normalizedEmail })
    return {
      status: 'error' as const,
      code: 'cooldown' as AuthRequestErrorCode,
      message: formatCooldownMessage(remainingSeconds),
      retryAfterSeconds: remainingSeconds,
    } satisfies AuthRequestError
  }

  if (!publicAppUrl) {
    return deliveryFailedResult(normalizedEmail, {
      failure_stage: 'public_app_url',
      find_user_ms: findUserMs,
      total_ms: getDurationMs(requestStartedAt),
    })
  }

  const admin = createSupabaseAdminClient()
  const generateLinkStartedAt = Date.now()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
    options: {
      redirectTo: publicAppUrl,
    },
  })
  const generateLinkMs = getDurationMs(generateLinkStartedAt)

  if (error || !data.user || !data.properties.hashed_token) {
    return deliveryFailedResult(normalizedEmail, {
      failure_stage: 'generate_link',
      find_user_ms: findUserMs,
      generate_link_ms: generateLinkMs,
      total_ms: getDurationMs(requestStartedAt),
    })
  }

  const nonce = crypto.randomUUID()
  const expiresAt = new Date(now.getTime() + AUTH_LINK_EXPIRES_MINUTES * 60 * 1000)
  const verificationType = toVerificationType(data.properties.verification_type)
  const nextState = buildIssuedLoginLinkState({
    baseState: requestPolicy.nextState,
    expiresAt,
    nonce,
    now,
    tokenHash: data.properties.hashed_token,
    verificationType,
  })

  const persistStateStartedAt = Date.now()
  await updateUserAuthState(data.user.id, nextState, data.user.user_metadata ?? undefined)
  const persistStateMs = getDurationMs(persistStateStartedAt)

  const loginUrl = buildLoginUrl({ baseUrl: publicAppUrl, email: normalizedEmail, nonce })
  const sendEmailStartedAt = Date.now()
  const deliveryResult = await sendLoginEmail({ email: normalizedEmail, loginUrl })
  const sendEmailMs = getDurationMs(sendEmailStartedAt)

  if (!deliveryResult.ok) {
    return deliveryFailedResult(normalizedEmail, {
      failure_stage: 'send_email',
      provider: 'resend',
      provider_status_code: deliveryResult.statusCode,
      provider_error_code: deliveryResult.providerErrorCode,
      provider_error_message: deliveryResult.providerErrorMessage,
      find_user_ms: findUserMs,
      generate_link_ms: generateLinkMs,
      persist_state_ms: persistStateMs,
      send_email_ms: sendEmailMs,
      total_ms: getDurationMs(requestStartedAt),
    })
  }

  logAuthRequestAccepted({
    email: normalizedEmail,
    providerMessageId: deliveryResult.providerMessageId,
    providerStatusCode: deliveryResult.statusCode,
    timings: {
      findUserMs,
      generateLinkMs,
      persistStateMs,
      sendEmailMs,
      totalMs: getDurationMs(requestStartedAt),
    },
  })

  return {
    status: 'success' as const,
    mode: 'link' as const,
    message: '로그인 링크를 보냈어요.',
  }
}

export const verifyLoginLink = async ({ email, nonce }: { email: string; nonce: string }) => {
  const user = await findUserByEmail(email)
  if (!user) {
    return { status: 'error' as const, reason: 'invalidated' as AuthVerifyErrorReason }
  }

  const currentState = getLoginState(user)
  const now = new Date()
  const evaluation = evaluateVerificationState({ nonce, now, state: currentState })

  if (evaluation.status !== 'valid') {
    return { status: 'error' as const, reason: evaluation.status }
  }

  return {
    status: 'success' as const,
    tokenHash: evaluation.tokenHash,
    verificationType: evaluation.verificationType,
  }
}

export const consumeLoginLink = async ({ email, nonce }: { email: string; nonce: string }) => {
  const user = await findUserByEmail(email)
  if (!user) {
    return { status: 'error' as const, reason: 'invalidated' as AuthVerifyErrorReason }
  }

  const currentState = getLoginState(user)
  const evaluation = consumeVerificationState({ nonce, state: currentState })

  if (evaluation.status !== 'consumed') {
    logAuthConsumeFailure({ email, reason: evaluation.status })
    return { status: 'error' as const, reason: evaluation.status }
  }

  await updateUserAuthState(user.id, evaluation.nextState, user.user_metadata ?? undefined)

  return {
    status: 'success' as const,
  }
}

export const verifyAccessToken = async (accessToken: string) => {
  const client = createSupabaseBrowserlessClient()
  const { data, error } = await client.auth.getUser(accessToken)
  if (error || !data.user) {
    return null
  }
  return data.user
}
