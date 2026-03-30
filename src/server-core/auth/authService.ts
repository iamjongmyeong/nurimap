import {
  createEmptyLoginOtpState,
  evaluateRequestPolicy,
  findRequestAttemptReceipt,
  isExplicitlyAllowedEmail,
  isAllowedEmailDomain,
  normalizeEmail,
  parseAllowedEmails,
  recordRequestAttemptReceipt,
  recordVerifiedOtpState,
  type LoginOtpState,
  type LoginOtpRequestReceipt,
} from './authPolicy.js'
import {
  createAppSession,
  createAppSessionTokens,
  revokeAppSession,
  touchAppSession,
} from './appSessionService.js'
import { withDatabaseConnection, withDatabaseTransaction } from '../runtime/database.js'
import { isLoopbackOrPrivateLanRuntimeUrl, normalizeHttpUrl } from '../http/requestOrigin.js'
import { logAuthBypassLogin, logAuthRequestAccepted, logAuthRequestFailure } from '../runtime/opsLogger.js'
import { createSupabaseAdminClient, createSupabaseAuthClient } from '../runtime/supabaseAdmin.js'

type AuthRequestErrorCode = 'invalid_domain' | 'cooldown' | 'delivery_failed' | 'bypass_required'
// Compatibility-only verify types for the retained local bypass adoption seam.
type AuthVerifyType = 'magiclink' | 'signup' | 'invite'
type AuthRequestResolution = 'accepted' | 'rejected' | 'unknown'
type RequestLoginOtpIntent = 'send' | 'status'
type RequestLoginOtpOptions = {
  requireBypass?: boolean
  intent?: RequestLoginOtpIntent
  requestAttemptId?: string
  runtimeOrigin?: string
}
type AuthRequestError =
  | {
      status: 'error'
      code: 'cooldown'
      message: string
      retryAfterSeconds: number
      requestResolution?: Exclude<AuthRequestResolution, 'accepted'>
    }
  | {
      status: 'error'
      code: Exclude<AuthRequestErrorCode, 'cooldown'>
      message: string
      requestResolution?: Exclude<AuthRequestResolution, 'accepted'>
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
      requestResolution?: Extract<AuthRequestResolution, 'accepted'>
    }
  | {
      status: 'success'
      mode: 'bypass'
      message: string
      tokenHash: string
      verificationType: AuthVerifyType
      requestResolution?: Extract<AuthRequestResolution, 'accepted'>
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

type SupabaseSessionLike = {
  access_token?: string | null
} | null

type SupabaseAdminAuthApi = {
  admin: {
    generateLink: (params: {
      type: 'magiclink'
      email: string
      options: {
        redirectTo: string
      }
    }) => Promise<{
      data: {
        properties: {
          hashed_token?: string | null
          verification_type?: string | null
        } | null
      }
      error: unknown | null
    }>
    listUsers: (params: {
      page: number
      perPage: number
    }) => Promise<{
      data: {
        users: SupabaseUserRecord[]
      }
      error: unknown | null
    }>
    updateUserById: (userId: string, attributes: {
      app_metadata?: Record<string, unknown>
      user_metadata?: Record<string, unknown>
    }) => Promise<{
      error: unknown | null
    }>
    createUser: (attributes: {
      email: string
      email_confirm: boolean
    }) => Promise<{
      data: {
        user: SupabaseUserRecord | null
      }
      error: unknown | null
    }>
    signOut: (jwt: string) => Promise<{
      error: unknown | null
    }>
  }
  getUser: (accessToken: string) => Promise<{
    data: {
      user: SupabaseUserRecord | null
    }
    error: unknown | null
  }>
}

type SupabasePublicAuthApi = {
  signInWithOtp: (params: {
    email: string
    options: {
      shouldCreateUser: boolean
    }
  }) => Promise<{
    error: unknown | null
  }>
  verifyOtp: (params:
    | {
        token_hash: string
        type: AuthVerifyType
      }
    | {
        email: string
        token: string
        type: 'email'
      }
  ) => Promise<{
    data: {
      user: SupabaseUserRecord | null
      session?: SupabaseSessionLike
    }
    error: unknown | null
  }>
}

const getAdminAuthClient = (): SupabaseAdminAuthApi =>
  createSupabaseAdminClient().auth as unknown as SupabaseAdminAuthApi
const getPublicAuthClient = (): SupabasePublicAuthApi =>
  createSupabaseAuthClient().auth as unknown as SupabasePublicAuthApi
const isSendLoginOtpFailure = (
  result: SendLoginOtpResult,
): result is Extract<SendLoginOtpResult, { ok: false }> => !result.ok

const getBypassEmails = () =>
  parseAllowedEmails(process.env.AUTH_BYPASS_EMAILS ?? '')

const getAllowedEmails = () => parseAllowedEmails(process.env.AUTH_ALLOWED_EMAILS ?? '')

const isEmailAllowedForAuth = (email: string, runtimeOrigin?: string) => {
  const normalizedEmail = normalizeEmail(email)
  return (
    isAllowedEmailDomain(normalizedEmail, process.env.AUTH_ALLOWED_EMAIL_DOMAIN ?? '') ||
    isExplicitlyAllowedEmail(normalizedEmail, getAllowedEmails()) ||
    isBypassLoginEmail(normalizedEmail, runtimeOrigin)
  )
}

const toVerificationType = (verificationType: string | undefined): AuthVerifyType =>
  verificationType === 'magiclink' || verificationType === 'invite' ? verificationType : 'signup'

const isLocalBypassRuntime = (runtimeOrigin?: string) =>
  isLoopbackOrPrivateLanRuntimeUrl(normalizeHttpUrl(runtimeOrigin))

const isBypassLoginEmail = (email: string, runtimeOrigin?: string) => {
  if (process.env.AUTH_BYPASS_ENABLED !== 'true' || !isLocalBypassRuntime(runtimeOrigin)) {
    return false
  }

  return getBypassEmails().includes(normalizeEmail(email))
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
  // Canonical auth is OTP-first; this legacy-shaped payload only exists for local bypass compatibility.
  const { data, error } = await auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: publicAppUrl,
    },
  })

  const properties = data.properties

  if (error || !properties?.hashed_token) {
    return deliveryFailedResult(email)
  }

  logAuthBypassLogin({ email })

  return {
    status: 'success',
    mode: 'bypass',
    message: '테스트 계정으로 바로 로그인합니다.',
    tokenHash: properties.hashed_token,
    verificationType: toVerificationType(properties.verification_type ?? undefined),
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
const getAcceptedRequestResolution = () => ({ requestResolution: 'accepted' as const })
const getErrorRequestResolution = (value: Exclude<AuthRequestResolution, 'accepted'>) => ({ requestResolution: value })
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const getRecentRequestReceipts = (value: unknown): LoginOtpRequestReceipt[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((candidate) => {
    if (!isRecord(candidate)) {
      return []
    }

    const attemptId = getStringOrNull(candidate.attempt_id)
    const status = candidate.status === 'accepted' || candidate.status === 'rejected'
      ? candidate.status
      : null
    const recordedAt = getStringOrNull(candidate.recorded_at)
    const errorCode = candidate.error_code === 'cooldown'
      || candidate.error_code === 'invalid_domain'
      || candidate.error_code === 'delivery_failed'
      || candidate.error_code === 'bypass_required'
      ? candidate.error_code
      : null

    if (!attemptId || !status || !recordedAt) {
      return []
    }

    return [{
      attempt_id: attemptId,
      status,
      recorded_at: recordedAt,
      error_code: errorCode,
    }]
  })
}

const createRequestAttemptReceipt = ({
  attemptId,
  errorCode = null,
  now,
  status,
}: {
  attemptId: string
  errorCode?: AuthRequestErrorCode | null
  now: Date
  status: LoginOtpRequestReceipt['status']
}): LoginOtpRequestReceipt => ({
  attempt_id: attemptId,
  status,
  recorded_at: now.toISOString(),
  error_code: errorCode,
})

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
    recent_request_receipts: getRecentRequestReceipts(state.recent_request_receipts),
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

const createOtpSuccessResult = (requestResolution?: Extract<AuthRequestResolution, 'accepted'>) => ({
  status: 'success' as const,
  mode: 'otp' as const,
  message: '인증 코드를 보냈어요.',
  ...(requestResolution ? getAcceptedRequestResolution() : {}),
})

const createRequestErrorResult = ({
  code,
  message,
  requestResolution,
  retryAfterSeconds,
}: {
  code: AuthRequestErrorCode
  message: string
  requestResolution?: Exclude<AuthRequestResolution, 'accepted'>
  retryAfterSeconds?: number
}) => {
  if (code === 'cooldown') {
    return {
      status: 'error' as const,
      code,
      message,
      retryAfterSeconds: retryAfterSeconds ?? 0,
      ...(requestResolution ? getErrorRequestResolution(requestResolution) : {}),
    }
  }

  return {
    status: 'error' as const,
    code,
    message,
    ...(requestResolution ? getErrorRequestResolution(requestResolution) : {}),
  }
}

const persistRequestAttemptReceipt = async ({
  attemptId,
  errorCode = null,
  now,
  state,
  status,
  userId,
  userMetadata,
}: {
  attemptId: string | null
  errorCode?: AuthRequestErrorCode | null
  now: Date
  state: LoginOtpState
  status: LoginOtpRequestReceipt['status']
  userId: string | null
  userMetadata?: Record<string, unknown>
}) => {
  if (!attemptId || !userId) {
    return
  }

  await updateUserAuthState(
    userId,
    recordRequestAttemptReceipt({
      state,
      receipt: createRequestAttemptReceipt({
        attemptId,
        errorCode,
        now,
        status,
      }),
    }),
    userMetadata,
  )
}

const resolveRequestAttemptStatus = ({
  attemptId,
  now,
  state,
}: {
  attemptId: string | null
  now: Date
  state: LoginOtpState
}) => {
  if (!attemptId) {
    return createRequestErrorResult({
      code: 'delivery_failed',
      message: '인증 코드를 보내지 못했어요. 다시 시도해 주세요.',
      requestResolution: 'unknown',
    })
  }

  const receipt = findRequestAttemptReceipt({
    state,
    attemptId,
    now,
  })

  if (!receipt) {
    return createRequestErrorResult({
      code: 'delivery_failed',
      message: '인증 코드를 보내지 못했어요. 다시 시도해 주세요.',
      requestResolution: 'unknown',
    })
  }

  if (receipt.status === 'accepted') {
    return createOtpSuccessResult('accepted')
  }

  if (receipt.error_code === 'cooldown') {
    const requestPolicy = evaluateRequestPolicy({ now, state })
    const remainingSeconds = requestPolicy.remainingSeconds ?? 0

    return createRequestErrorResult({
      code: 'cooldown',
      message: formatCooldownMessage(remainingSeconds),
      requestResolution: 'rejected',
      retryAfterSeconds: remainingSeconds,
    })
  }

  if (receipt.error_code === 'invalid_domain') {
    return createRequestErrorResult({
      code: 'invalid_domain',
      message: '누리미디어 구성원만 사용할 수 있어요.',
      requestResolution: 'rejected',
    })
  }

  if (receipt.error_code === 'bypass_required') {
    return createRequestErrorResult({
      code: 'bypass_required',
      message: '로컬 auto-login을 사용하려면 bypass 계정과 서버 bypass 설정이 필요해요.',
      requestResolution: 'rejected',
    })
  }

  return createRequestErrorResult({
    code: 'delivery_failed',
    message: '인증 코드를 보내지 못했어요. 다시 시도해 주세요.',
    requestResolution: 'rejected',
  })
}

const isDuplicateUserError = (error: unknown) => {
  const errorCode = getErrorCode(error)
  if (errorCode === 'user_already_exists') {
    return true
  }

  const errorMessage = getErrorMessage(error)?.toLowerCase() ?? ''
  return errorMessage.includes('already exists') || errorMessage.includes('already registered')
}

const ensureOtpReadyUser = async (email: string, existingUser: SupabaseUserRecord | null) => {
  if (existingUser) {
    return existingUser
  }

  const auth = getAdminAuthClient()
  const { data, error } = await auth.admin.createUser({
    email,
    email_confirm: true,
  })

  if (error) {
    if (!isDuplicateUserError(error)) {
      throw error
    }

    const duplicatedUser = await findUserByEmail(email)
    if (duplicatedUser) {
      return duplicatedUser
    }

    throw error
  }

  return data.user ?? (await findUserByEmail(email))
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
        shouldCreateUser: false,
      },
    })

    if (error) {
      return {
        ok: false,
        statusCode:
          typeof (error as { status?: unknown })?.status === 'number'
            ? (error as { status: number }).status
            : null,
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
  const requestIntent = options.intent === 'status' ? 'status' : 'send'
  const requestAttemptId = typeof options.requestAttemptId === 'string' && options.requestAttemptId.trim()
    ? options.requestAttemptId.trim()
    : null
  const normalizedEmail = normalizeEmail(email)
  const localRuntimeOrigin = options.runtimeOrigin ? normalizeHttpUrl(options.runtimeOrigin) : null
  const bypassLoginEmail = isBypassLoginEmail(normalizedEmail, options.runtimeOrigin)

  if (options.requireBypass && !bypassLoginEmail) {
    return bypassRequiredResult(normalizedEmail)
  }

  if (bypassLoginEmail) {
    const bypassRedirectUrl = localRuntimeOrigin
    if (!bypassRedirectUrl) {
      return deliveryFailedResult(normalizedEmail, { failure_stage: 'runtime_origin' })
    }

    return await generateImmediateBypassPayload(normalizedEmail, bypassRedirectUrl)
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

  if (requestIntent === 'status') {
    return resolveRequestAttemptStatus({
      attemptId: requestAttemptId,
      now,
      state: currentState,
    })
  }

  const requestPolicy = evaluateRequestPolicy({ now, state: currentState })

  if (!requestPolicy.allowed) {
    const remainingSeconds = requestPolicy.remainingSeconds ?? 0
    logAuthRequestFailure({ code: 'cooldown', email: normalizedEmail })
    await persistRequestAttemptReceipt({
      attemptId: requestAttemptId,
      errorCode: 'cooldown',
      now,
      state: currentState,
      status: 'rejected',
      userId: existingUser?.id ?? null,
      userMetadata: existingUser?.user_metadata ?? undefined,
    })
    return {
      ...createRequestErrorResult({
        code: 'cooldown',
        message: formatCooldownMessage(remainingSeconds),
        retryAfterSeconds: remainingSeconds,
      }),
    } satisfies AuthRequestError
  }

  const provisionUserStartedAt = Date.now()
  let targetUser: SupabaseUserRecord | null
  try {
    targetUser = await ensureOtpReadyUser(normalizedEmail, existingUser)
  } catch (error) {
    const provisionUserMs = getDurationMs(provisionUserStartedAt)
    return deliveryFailedResult(normalizedEmail, {
      failure_stage: 'provision_user',
      provider: 'supabase',
      provider_status_code:
        typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : null,
      provider_error_code: getErrorCode(error),
      provider_error_message: getErrorMessage(error),
      find_user_ms: findUserMs,
      provision_user_ms: provisionUserMs,
      total_ms: getDurationMs(requestStartedAt),
    })
  }
  const provisionUserMs = getDurationMs(provisionUserStartedAt)

  if (!targetUser) {
    return deliveryFailedResult(normalizedEmail, {
      failure_stage: 'provision_user',
      find_user_ms: findUserMs,
      provision_user_ms: provisionUserMs,
      total_ms: getDurationMs(requestStartedAt),
    })
  }

  const sendOtpStartedAt = Date.now()
  const deliveryResult = await sendLoginOtp({ email: normalizedEmail })
  const sendOtpMs = getDurationMs(sendOtpStartedAt)

  if (isSendLoginOtpFailure(deliveryResult)) {
    await persistRequestAttemptReceipt({
      attemptId: requestAttemptId,
      errorCode: 'delivery_failed',
      now,
      state: currentState,
      status: 'rejected',
      userId: targetUser.id,
      userMetadata: targetUser.user_metadata ?? undefined,
    })
    return deliveryFailedResult(normalizedEmail, {
      failure_stage: 'send_otp',
      provider: 'supabase',
      provider_status_code: deliveryResult.statusCode,
      provider_error_code: deliveryResult.providerErrorCode,
      provider_error_message: deliveryResult.providerErrorMessage,
      find_user_ms: findUserMs,
      provision_user_ms: provisionUserMs,
      send_otp_ms: sendOtpMs,
      total_ms: getDurationMs(requestStartedAt),
    })
  }

  const persistStateStartedAt = Date.now()
  const nextState = requestAttemptId
    ? recordRequestAttemptReceipt({
      state: requestPolicy.nextState,
      receipt: createRequestAttemptReceipt({
        attemptId: requestAttemptId,
        now,
        status: 'accepted',
      }),
    })
    : requestPolicy.nextState
  await updateUserAuthState(targetUser.id, nextState, targetUser.user_metadata ?? undefined)
  const persistStateMs = getDurationMs(persistStateStartedAt)

  logAuthRequestAccepted({
    email: normalizedEmail,
    providerMessageId: null,
    providerStatusCode: deliveryResult.statusCode,
    timings: {
      findUserMs,
      generateLinkMs: provisionUserMs,
      persistStateMs,
      sendEmailMs: sendOtpMs,
      totalMs: getDurationMs(requestStartedAt),
    },
  })

  return createOtpSuccessResult()
}

export const verifyLoginOtp = async ({
  email,
  runtimeOrigin,
  token,
  tokenHash,
  verificationType,
}: {
  email: string
  runtimeOrigin?: string
  token: string
  tokenHash?: string
  verificationType?: AuthVerifyType
}): Promise<AuthVerifySuccess | AuthVerifyFailure> => {
  const auth = getPublicAuthClient()
  const adminAuth = getAdminAuthClient()
  const normalizedEmail = normalizeEmail(email)
  const now = new Date()

  // Canonical verify uses `{ email, token }`. Token-hash verify remains for local bypass compatibility only.
  if (tokenHash && !isLocalBypassRuntime(runtimeOrigin)) {
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
  if (tokenHash && !isBypassLoginEmail(persistedEmail, runtimeOrigin)) {
    if (data.session?.access_token) {
      try {
        await adminAuth.admin.signOut(data.session.access_token)
      } catch {
        // best-effort cleanup only
      }
    }

    return {
      status: 'error',
      message: OTP_VERIFY_FAILURE_MESSAGE,
    }
  }

  if (!isEmailAllowedForAuth(persistedEmail, runtimeOrigin)) {
    if (data.session?.access_token) {
      try {
        await adminAuth.admin.signOut(data.session.access_token)
      } catch {
        // best-effort cleanup only
      }
    }

    return {
      status: 'error',
      message: OTP_VERIFY_FAILURE_MESSAGE,
    }
  }

  const resolvedName = getRequiredName(verifiedUser.user_metadata?.name)
  const tokens = createAppSessionTokens()

  try {
    await withDatabaseTransaction(async (client) => {
      await client.query(
        `
          insert into app_private.user_profiles (
            id,
            email,
            name,
            last_seen_at
          )
          values ($1, $2, $3, $4)
          on conflict (id) do update
          set
            email = excluded.email,
            name = coalesce(excluded.name, app_private.user_profiles.name),
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

  const resolvedSession = await withDatabaseConnection(async (client) => {
    const session = await touchAppSession({ client, sessionId })
    if (!session) {
      return null
    }

    const { rows } = await client.query<AuthSessionUser>(
      `
        select
          id,
          email,
          name
        from app_private.user_profiles
        where id = $1
        limit 1
      `,
      [session.user_id],
    )

    const user = rows[0] ?? null
    if (!user) {
      return null
    }

    return {
      session,
      user,
    }
  })

  if (!resolvedSession) {
    return { status: 'missing' }
  }

  return {
    status: 'authenticated',
    sessionId,
    user: resolvedSession.user,
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
        update app_private.user_profiles
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
