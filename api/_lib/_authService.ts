import {
  createEmptyLoginOtpState,
  evaluateRequestPolicy,
  isExplicitlyAllowedEmail,
  isAllowedEmailDomain,
  normalizeEmail,
  parseAllowedEmails,
  recordVerifiedOtpState,
  type LoginOtpState,
} from './_authPolicy.js'
import {
  createAppSession,
  createAppSessionTokens,
  findActiveAppSessionById,
  revokeAppSession,
  touchAppSession,
} from './_appSessionService.js'
import { withDatabaseConnection, withDatabaseTransaction } from './_database.js'
import { logAuthBypassLogin, logAuthRequestAccepted, logAuthRequestFailure } from './_opsLogger.js'
import { createSupabaseAdminClient, createSupabaseAuthClient } from './_supabaseAdmin.js'

type AuthRequestErrorCode = 'invalid_domain' | 'cooldown' | 'delivery_failed' | 'bypass_required'
type AuthVerifyType = 'magiclink' | 'signup' | 'invite'
type RequestLoginOtpOptions = {
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
type SendLoginOtpResult =
  | {
      ok: true
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
      mode: 'otp'
      message: string
    }
  | {
      status: 'success'
      mode: 'bypass'
      message: string
      tokenHash: string
      verificationType: AuthVerifyType
    }

type AuthVerifySuccess = {
  status: 'success'
  csrfToken: string
  sessionId: string
  user: {
    id: string
    email: string
    name: string | null
  }
  nextPhase: 'authenticated' | 'name_required'
}

type AuthVerifyFailure = {
  status: 'error'
  message: string
}

type AuthSessionUser = {
  id: string
  email: string
  name: string | null
}

type AuthSessionResult =
  | {
      status: 'authenticated'
      user: AuthSessionUser
      sessionId: string
    }
  | {
      status: 'missing'
    }

type SupabaseUserRecord = {
  id: string
  email?: string | null
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

type SupabaseAuthApi = {
  admin: {
    generateLink: (...args: any[]) => Promise<any>
    listUsers: (...args: any[]) => Promise<{ data: { users: SupabaseUserRecord[] }; error: any }>
    updateUserById: (...args: any[]) => Promise<{ error: any }>
    signOut: (...args: any[]) => Promise<any>
  }
  getUser: (...args: any[]) => Promise<any>
  signInWithOtp: (...args: any[]) => Promise<any>
  verifyOtp: (...args: any[]) => Promise<any>
}

const getAdminAuthClient = (): SupabaseAuthApi => createSupabaseAdminClient().auth as SupabaseAuthApi
const getPublicAuthClient = (): SupabaseAuthApi => createSupabaseAuthClient().auth as SupabaseAuthApi
const isSendLoginOtpFailure = (
  result: SendLoginOtpResult,
): result is Extract<SendLoginOtpResult, { ok: false }> => !result.ok

const getBypassEmails = () =>
  parseAllowedEmails(process.env.AUTH_BYPASS_EMAILS ?? '')

const getAllowedEmails = () => parseAllowedEmails(process.env.AUTH_ALLOWED_EMAILS ?? '')

const LOCAL_BYPASS_HOSTS = new Set(['127.0.0.1', '::1', 'localhost'])

const isBypassLoginEmail = (email: string) => {
  if (process.env.AUTH_BYPASS_ENABLED !== 'true' || !isLocalBypassRuntime()) {
    return false
  }

  return getBypassEmails().includes(normalizeEmail(email))
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

const isLocalBypassRuntime = () => {
  const publicAppUrl = getPublicAppUrl()
  if (!publicAppUrl) {
    return false
  }

  try {
    const hostname = new URL(publicAppUrl).hostname.toLowerCase()
    return LOCAL_BYPASS_HOSTS.has(hostname) || hostname.endsWith('.localhost')
  } catch {
    return false
  }
}

const formatCooldownTime = (remainingSeconds: number) => {
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  return `${minutes}분 ${String(seconds).padStart(2, '0')}초`
}

const formatCooldownMessage = (remainingSeconds: number) => `${formatCooldownTime(remainingSeconds)} 후에 다시 시도해주세요.`

const getDurationMs = (startedAt: number) => Date.now() - startedAt
const OTP_VERIFY_FAILURE_MESSAGE = '이 코드는 사용할 수 없어요.'

const getRequiredName = (value: unknown) => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const getErrorCode = (error: unknown) => {
  if (!(error instanceof Error) && (typeof error !== 'object' || error === null)) {
    return null
  }

  const candidate = 'code' in error ? error.code : 'name' in error ? error.name : null
  return typeof candidate === 'string' ? candidate : null
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return null
}

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
    message: '인증 코드를 보내지 못했어요. 다시 시도해 주세요.',
  }
}

const generateImmediateBypassPayload = async (
  email: string,
  publicAppUrl: string,
): Promise<AuthRequestSuccess | { status: 'error'; code: AuthRequestErrorCode; message: string }> => {
  const auth = getAdminAuthClient()
  const { data, error } = await auth.admin.generateLink({
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
  const auth = getAdminAuthClient()
  let page = 1

  while (page < 20) {
    const { data, error } = await auth.admin.listUsers({ page, perPage: 200 })
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

const getStringOrNull = (value: unknown) => (typeof value === 'string' ? value : null)
const getNumberOrZero = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

const getLoginState = (user: { app_metadata?: Record<string, unknown> } | null): LoginOtpState => {
  const appMetadata = user?.app_metadata ?? {}
  const rawState = appMetadata.nurimap_auth
  if (!rawState || typeof rawState !== 'object') {
    return createEmptyLoginOtpState()
  }

  const state = rawState as Record<string, unknown>

  return {
    day_key: getStringOrNull(state.day_key) ?? '',
    day_count: getNumberOrZero(state.day_count),
    last_requested_at: getStringOrNull(state.last_requested_at),
    last_verified_at: getStringOrNull(state.last_verified_at),
  }
}

const updateUserAuthState = async (userId: string, nextState: LoginOtpState, userMetadata?: Record<string, unknown>) => {
  const auth = getAdminAuthClient()
  const { error } = await auth.admin.updateUserById(userId, {
    app_metadata: {
      nurimap_auth: nextState,
    },
    user_metadata: userMetadata,
  })
  if (error) {
    throw error
  }
}

const sendLoginOtp = async ({
  email,
}: {
  email: string
}): Promise<SendLoginOtpResult> => {
  try {
    const auth = getPublicAuthClient()
    const { error } = await auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })

    if (error) {
      return {
        ok: false,
        statusCode: typeof error.status === 'number' ? error.status : null,
        providerErrorCode: getErrorCode(error),
        providerErrorMessage: getErrorMessage(error),
      }
    }

    return {
      ok: true,
      statusCode: 200,
    }
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      providerErrorCode: getErrorCode(error),
      providerErrorMessage: getErrorMessage(error) ?? 'unknown_error',
    }
  }
}

export const requestLoginOtp = async (email: string, options: RequestLoginOtpOptions = {}) => {
  const requestStartedAt = Date.now()
  const allowedDomain = process.env.AUTH_ALLOWED_EMAIL_DOMAIN ?? ''
  const allowedEmails = getAllowedEmails()
  const normalizedEmail = normalizeEmail(email)
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

  if (!isAllowedEmailDomain(normalizedEmail, allowedDomain) && !isExplicitlyAllowedEmail(normalizedEmail, allowedEmails)) {
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

  const sendOtpStartedAt = Date.now()
  const deliveryResult = await sendLoginOtp({ email: normalizedEmail })
  const sendOtpMs = getDurationMs(sendOtpStartedAt)

  if (isSendLoginOtpFailure(deliveryResult)) {
    return deliveryFailedResult(normalizedEmail, {
      failure_stage: 'send_otp',
      provider: 'supabase',
      provider_status_code: deliveryResult.statusCode,
      provider_error_code: deliveryResult.providerErrorCode,
      provider_error_message: deliveryResult.providerErrorMessage,
      find_user_ms: findUserMs,
      send_otp_ms: sendOtpMs,
      total_ms: getDurationMs(requestStartedAt),
    })
  }

  const persistedUserLookupStartedAt = Date.now()
  const targetUser = existingUser ?? (await findUserByEmail(normalizedEmail))
  const persistedUserLookupMs = getDurationMs(persistedUserLookupStartedAt)

  if (!targetUser) {
    return deliveryFailedResult(normalizedEmail, {
      failure_stage: 'load_user_after_otp',
      find_user_ms: findUserMs,
      send_otp_ms: sendOtpMs,
      persisted_user_lookup_ms: persistedUserLookupMs,
      total_ms: getDurationMs(requestStartedAt),
    })
  }

  const persistStateStartedAt = Date.now()
  await updateUserAuthState(targetUser.id, requestPolicy.nextState, targetUser.user_metadata ?? undefined)
  const persistStateMs = getDurationMs(persistStateStartedAt)

  logAuthRequestAccepted({
    email: normalizedEmail,
    providerMessageId: null,
    providerStatusCode: deliveryResult.statusCode,
    timings: {
      findUserMs,
      generateLinkMs: persistedUserLookupMs,
      persistStateMs,
      sendEmailMs: sendOtpMs,
      totalMs: getDurationMs(requestStartedAt),
    },
  })

  return {
    status: 'success' as const,
    mode: 'otp' as const,
    message: '인증 코드를 보냈어요.',
  }
}

export const verifyLoginOtp = async ({
  email,
  token,
  tokenHash,
  verificationType,
}: {
  email: string
  token: string
  tokenHash?: string
  verificationType?: AuthVerifyType
}): Promise<AuthVerifySuccess | AuthVerifyFailure> => {
  const auth = getPublicAuthClient()
  const adminAuth = getAdminAuthClient()
  const normalizedEmail = normalizeEmail(email)
  const now = new Date()

  if (tokenHash && !isLocalBypassRuntime()) {
    return {
      status: 'error',
      message: OTP_VERIFY_FAILURE_MESSAGE,
    }
  }

  const verifyParams = tokenHash
    ? {
        token_hash: tokenHash,
        type: verificationType ?? 'magiclink',
      }
    : {
        email: normalizedEmail,
        token,
        type: 'email' as const,
      }
  const { data, error } = await auth.verifyOtp(verifyParams)

  if (error || !data.user) {
    return {
      status: 'error',
      message: OTP_VERIFY_FAILURE_MESSAGE,
    }
  }

  const verifiedUser = data.user
  const persistedEmail = (verifiedUser.email ?? normalizedEmail).trim().toLowerCase()
  const resolvedName = getRequiredName(verifiedUser.user_metadata?.name)
  const tokens = createAppSessionTokens()

  try {
    await withDatabaseTransaction(async (client) => {
      await client.query(
        `
          insert into public.user_profiles (
            id,
            email,
            name,
            last_seen_at
          )
          values ($1, $2, $3, $4)
          on conflict (id) do update
          set
            email = excluded.email,
            name = coalesce(excluded.name, public.user_profiles.name),
            last_seen_at = excluded.last_seen_at
        `,
        [verifiedUser.id, persistedEmail, resolvedName, now.toISOString()],
      )

      await createAppSession({
        client,
        csrfToken: tokens.csrfToken,
        now,
        sessionId: tokens.sessionId,
        userId: verifiedUser.id,
      })
    })
  } catch (databaseError) {
    if (data.session?.access_token) {
      try {
        await adminAuth.admin.signOut(data.session.access_token)
      } catch {
        // best-effort cleanup only
      }
    }

    throw databaseError
  }

  await updateUserAuthState(
    verifiedUser.id,
    recordVerifiedOtpState({
      now,
      state: getLoginState(verifiedUser),
    }),
    verifiedUser.user_metadata ?? undefined,
  )

  return {
    status: 'success',
    csrfToken: tokens.csrfToken,
    sessionId: tokens.sessionId,
    user: {
      id: verifiedUser.id,
      email: persistedEmail,
      name: resolvedName,
    },
    nextPhase: resolvedName ? 'authenticated' : 'name_required',
  }
}

export const getAuthenticatedSession = async (sessionId: string | null): Promise<AuthSessionResult> => {
  if (!sessionId) {
    return { status: 'missing' }
  }

  const session = await findActiveAppSessionById({ sessionId })
  if (!session) {
    return { status: 'missing' }
  }

  await touchAppSession({ sessionId })

  const user = await withDatabaseConnection(async (client) => {
    const { rows } = await client.query<AuthSessionUser>(
      `
        select
          id,
          email,
          name
        from public.user_profiles
        where id = $1
        limit 1
      `,
      [session.user_id],
    )

    return rows[0] ?? null
  })

  if (!user) {
    return { status: 'missing' }
  }

  return {
    status: 'authenticated',
    sessionId,
    user,
  }
}

export const saveAuthenticatedUserName = async ({
  name,
  userId,
}: {
  name: string
  userId: string
}) => {
  const resolvedName = getRequiredName(name)
  if (!resolvedName || resolvedName.length > 10) {
    throw new Error('Name is invalid.')
  }

  await withDatabaseTransaction(async (client) => {
    await client.query(
      `
        update public.user_profiles
        set
          name = $2,
          last_seen_at = timezone('utc'::text, now())
        where id = $1
      `,
      [userId, resolvedName],
    )
  })

  const auth = getAdminAuthClient()
  const { error } = await auth.admin.updateUserById(userId, {
    user_metadata: {
      name: resolvedName,
    },
  })

  if (error) {
    throw error
  }

  return {
    status: 'success' as const,
    name: resolvedName,
  }
}

export const signOutAppSession = async (sessionId: string | null) => {
  if (!sessionId) {
    return { status: 'success' as const }
  }

  await revokeAppSession({ sessionId })
  return { status: 'success' as const }
}

export const verifyAccessToken = async (accessToken: string) => {
  const auth = getAdminAuthClient()
  const { data, error } = await auth.getUser(accessToken)
  if (error || !data.user) {
    return null
  }
  return data.user
}
