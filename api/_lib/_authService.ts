import crypto from 'node:crypto'
import {
  AUTH_LINK_EXPIRES_MINUTES,
  buildIssuedLoginLinkState,
  createEmptyLoginLinkState,
  evaluateRequestPolicy,
  evaluateVerificationState,
  isAllowedEmailDomain,
  type LoginLinkState,
} from './_authPolicy.js'
import { logAuthBypassLogin, logAuthRequestFailure } from './_opsLogger.js'
import { createSupabaseAdminClient, createSupabaseBrowserlessClient } from './_supabaseAdmin.js'

type AuthRequestErrorCode = 'invalid_domain' | 'cooldown' | 'daily_limit' | 'delivery_failed'
type AuthVerifyErrorReason = 'expired' | 'used' | 'invalidated'
type AuthVerifyType = 'magiclink' | 'signup' | 'invite'
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

const generateImmediateBypassPayload = async (email: string): Promise<AuthRequestSuccess | { status: 'error'; code: AuthRequestErrorCode; message: string }> => {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: process.env.PUBLIC_APP_URL,
    },
  })

  if (error || !data.properties.hashed_token) {
    logAuthRequestFailure({ code: 'delivery_failed', email })
    return {
      status: 'error',
      code: 'delivery_failed',
      message: '로그인 링크를 보내지 못했어요. 다시 시도해 주세요.',
    }
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

const sendLoginEmail = async ({ email, loginUrl }: { email: string; loginUrl: string }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [email],
      subject: 'Nurimap 로그인 링크',
      html: `<p>아래 링크로 로그인하세요.</p><p><a href="${loginUrl}">${loginUrl}</a></p>`,
      text: `아래 링크로 로그인하세요.\n${loginUrl}`,
    }),
  })

  if (!response.ok) {
    throw new Error('delivery_failed')
  }
}

export const requestLoginLink = async (email: string) => {
  const allowedDomain = process.env.AUTH_ALLOWED_EMAIL_DOMAIN ?? ''
  const normalizedEmail = email.trim().toLowerCase()

  if (isBypassLoginEmail(normalizedEmail)) {
    return await generateImmediateBypassPayload(normalizedEmail)
  }

  if (!isAllowedEmailDomain(normalizedEmail, allowedDomain)) {
    logAuthRequestFailure({ code: 'invalid_domain', email: normalizedEmail })
    return {
      status: 'error' as const,
      code: 'invalid_domain' as AuthRequestErrorCode,
      message: '허용된 회사 이메일만 사용할 수 있어요.',
    }
  }

  const existingUser = await findUserByEmail(normalizedEmail)
  const currentState = getLoginState(existingUser)
  const now = new Date()
  const requestPolicy = evaluateRequestPolicy({ now, state: currentState })

  if (!requestPolicy.allowed) {
    if (requestPolicy.reason === 'cooldown') {
      logAuthRequestFailure({ code: 'cooldown', email: normalizedEmail })
      return {
        status: 'error' as const,
        code: 'cooldown' as AuthRequestErrorCode,
        message: `${requestPolicy.remainingSeconds}초 후에 다시 시도해 주세요.`,
      }
    }

    logAuthRequestFailure({ code: 'daily_limit', email: normalizedEmail })
    return {
      status: 'error' as const,
      code: 'daily_limit' as AuthRequestErrorCode,
      message: '오늘은 더 이상 로그인 링크를 요청할 수 없어요.',
    }
  }

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
    options: {
      redirectTo: process.env.PUBLIC_APP_URL,
    },
  })

  if (error || !data.user || !data.properties.hashed_token) {
    logAuthRequestFailure({ code: 'delivery_failed', email: normalizedEmail })
    return {
      status: 'error' as const,
      code: 'delivery_failed' as AuthRequestErrorCode,
      message: '로그인 링크를 보내지 못했어요. 다시 시도해 주세요.',
    }
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

  await updateUserAuthState(data.user.id, nextState, data.user.user_metadata ?? undefined)

  const loginUrl = `${process.env.PUBLIC_APP_URL}?auth_mode=verify&email=${encodeURIComponent(normalizedEmail)}&nonce=${encodeURIComponent(nonce)}`

  try {
    await sendLoginEmail({ email: normalizedEmail, loginUrl })
  } catch {
    logAuthRequestFailure({ code: 'delivery_failed', email: normalizedEmail })
    return {
      status: 'error' as const,
      code: 'delivery_failed' as AuthRequestErrorCode,
      message: '로그인 링크를 보내지 못했어요. 다시 시도해 주세요.',
    }
  }

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

  await updateUserAuthState(user.id, evaluation.nextState, user.user_metadata ?? undefined)

  return {
    status: 'success' as const,
    tokenHash: evaluation.tokenHash,
    verificationType: evaluation.verificationType,
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
