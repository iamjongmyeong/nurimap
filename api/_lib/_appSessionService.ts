import { createHash, randomBytes } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withDatabaseConnection } from './_database.js'

export const APP_SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production'
  ? '__Host-nurimap_session'
  : 'nurimap_session'
export const APP_CSRF_COOKIE_NAME = 'nurimap_csrf'
export const APP_CSRF_HEADER_NAME = 'x-nurimap-csrf-token'
export const APP_SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60
const APP_SESSION_TOKEN_BYTE_LENGTH = 32

export type AppSessionRecord = {
  id: string
  user_id: string
  csrf_token_hash: string
  expires_at: string
  revoked_at: string | null
  created_at: string
  updated_at: string
  last_seen_at: string | null
}

const parseCookieHeader = (cookieHeader: string | null | undefined) =>
  (cookieHeader ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)

export const hashOpaqueToken = (value: string) =>
  createHash('sha256').update(value).digest('hex')

export const createAppSessionTokens = () => ({
  sessionId: randomBytes(APP_SESSION_TOKEN_BYTE_LENGTH).toString('base64url'),
  csrfToken: randomBytes(32).toString('base64url'),
})

export const getAppSessionExpiresAt = (now = new Date()) =>
  new Date(now.getTime() + APP_SESSION_MAX_AGE_SECONDS * 1000)

export const serializeAppSessionCookie = ({
  sessionId,
  secure,
}: {
  sessionId: string
  secure: boolean
}) => [
  `${APP_SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
  'Path=/',
  'HttpOnly',
  'SameSite=Lax',
  `Max-Age=${APP_SESSION_MAX_AGE_SECONDS}`,
  ...(secure ? ['Secure'] : []),
].join('; ')

export const serializeClearedAppSessionCookie = ({ secure }: { secure: boolean }) => [
  `${APP_SESSION_COOKIE_NAME}=`,
  'Path=/',
  'HttpOnly',
  'SameSite=Lax',
  'Max-Age=0',
  ...(secure ? ['Secure'] : []),
].join('; ')

export const serializeCsrfCookie = ({
  csrfToken,
  secure,
}: {
  csrfToken: string
  secure: boolean
}) => [
  `${APP_CSRF_COOKIE_NAME}=${encodeURIComponent(csrfToken)}`,
  'Path=/',
  'SameSite=Lax',
  `Max-Age=${APP_SESSION_MAX_AGE_SECONDS}`,
  ...(secure ? ['Secure'] : []),
].join('; ')

export const serializeClearedCsrfCookie = ({ secure }: { secure: boolean }) => [
  `${APP_CSRF_COOKIE_NAME}=`,
  'Path=/',
  'SameSite=Lax',
  'Max-Age=0',
  ...(secure ? ['Secure'] : []),
].join('; ')

export const readSessionIdFromCookieHeader = (cookieHeader: string | null | undefined) => {
  const sessionCookie = parseCookieHeader(cookieHeader)
    .find((part) => part.startsWith(`${APP_SESSION_COOKIE_NAME}=`))

  if (!sessionCookie) {
    return null
  }

  const [, rawValue] = sessionCookie.split('=', 2)
  const value = rawValue ? decodeURIComponent(rawValue) : ''
  return value || null
}

export const readCsrfTokenFromCookieHeader = (cookieHeader: string | null | undefined) => {
  const csrfCookie = parseCookieHeader(cookieHeader)
    .find((part) => part.startsWith(`${APP_CSRF_COOKIE_NAME}=`))

  if (!csrfCookie) {
    return null
  }

  const [, rawValue] = csrfCookie.split('=', 2)
  const value = rawValue ? decodeURIComponent(rawValue) : ''
  return value || null
}

export const readCsrfTokenFromHeaders = (headers: Record<string, string | string[] | undefined>) => {
  const value = headers[APP_CSRF_HEADER_NAME] ?? headers[APP_CSRF_HEADER_NAME.toUpperCase()]
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  return value ?? null
}

export const isValidCsrfTokenPair = ({
  cookieToken,
  headerToken,
  expectedHash,
}: {
  cookieToken: string | null
  headerToken: string | null
  expectedHash: string
}) => {
  if (!cookieToken || !headerToken) {
    return false
  }

  if (cookieToken !== headerToken) {
    return false
  }

  return hashOpaqueToken(headerToken) === expectedHash
}

const mapAppSessionRow = (row: AppSessionRecord): AppSessionRecord => row
const APP_SESSION_RETURNING_COLUMNS = `
  id,
  user_id,
  csrf_token_hash,
  expires_at,
  revoked_at,
  created_at,
  updated_at,
  last_seen_at
`

const ACTIVE_APP_SESSION_LOOKUP_SQL = `
  select id
  from public.app_sessions
  where (session_token_hash = $1 or id::text = $2)
    and revoked_at is null
    and expires_at > timezone('utc'::text, now())
  order by case when session_token_hash = $1 then 0 else 1 end
  limit 1
`

const REVOCABLE_APP_SESSION_LOOKUP_SQL = `
  select id
  from public.app_sessions
  where (session_token_hash = $1 or id::text = $2)
    and revoked_at is null
  order by case when session_token_hash = $1 then 0 else 1 end
  limit 1
`

const getAppSessionLookupParameters = (sessionId: string) => [
  hashOpaqueToken(sessionId),
  sessionId,
]

export const createAppSession = async ({
  client,
  csrfToken,
  now = new Date(),
  sessionId,
  userId,
}: {
  client?: PoolClient
  csrfToken: string
  now?: Date
  sessionId: string
  userId: string
}) => {
  const expiresAt = getAppSessionExpiresAt(now)
  const parameters = [
    userId,
    hashOpaqueToken(sessionId),
    hashOpaqueToken(csrfToken),
    expiresAt.toISOString(),
    now.toISOString(),
  ]

  const insert = async (targetClient: PoolClient) => {
    const { rows } = await targetClient.query<AppSessionRecord>(
      `
        insert into public.app_sessions (
          user_id,
          session_token_hash,
          csrf_token_hash,
          expires_at,
          last_seen_at
        )
        values ($1, $2, $3, $4, $5)
        returning
          ${APP_SESSION_RETURNING_COLUMNS}
      `,
      parameters,
    )

    return mapAppSessionRow(rows[0])
  }

  if (client) {
    return insert(client)
  }

  return withDatabaseConnection(insert)
}

export const findActiveAppSessionById = async ({
  client,
  sessionId,
}: {
  client?: PoolClient
  sessionId: string
}) => {
  const query = async (targetClient: PoolClient) => {
    const lookupParameters = getAppSessionLookupParameters(sessionId)
    const { rows } = await targetClient.query<AppSessionRecord>(
      `
        with matched_session as (
          ${ACTIVE_APP_SESSION_LOOKUP_SQL}
        )
        select
          ${APP_SESSION_RETURNING_COLUMNS}
        from public.app_sessions
        where id = (select id from matched_session)
      `,
      lookupParameters,
    )

    return rows[0] ? mapAppSessionRow(rows[0]) : null
  }

  if (client) {
    return query(client)
  }

  return withDatabaseConnection(query)
}

export const touchAppSession = async ({
  client,
  now = new Date(),
  sessionId,
}: {
  client?: PoolClient
  now?: Date
  sessionId: string
}) => {
  const update = async (targetClient: PoolClient) => {
    const lookupParameters = getAppSessionLookupParameters(sessionId)
    const { rows } = await targetClient.query<AppSessionRecord>(
      `
        with matched_session as (
          ${ACTIVE_APP_SESSION_LOOKUP_SQL}
        )
        update public.app_sessions
        set last_seen_at = $3
        where id = (select id from matched_session)
        returning
          ${APP_SESSION_RETURNING_COLUMNS}
      `,
      [...lookupParameters, now.toISOString()],
    )

    return rows[0] ? mapAppSessionRow(rows[0]) : null
  }

  if (client) {
    return update(client)
  }

  return withDatabaseConnection(update)
}

export const revokeAppSession = async ({
  client,
  now = new Date(),
  sessionId,
}: {
  client?: PoolClient
  now?: Date
  sessionId: string
}) => {
  const revoke = async (targetClient: PoolClient) => {
    const lookupParameters = getAppSessionLookupParameters(sessionId)
    const { rows } = await targetClient.query<AppSessionRecord>(
      `
        with matched_session as (
          ${REVOCABLE_APP_SESSION_LOOKUP_SQL}
        )
        update public.app_sessions
        set revoked_at = $3
        where id = (select id from matched_session)
        returning
          ${APP_SESSION_RETURNING_COLUMNS}
      `,
      [...lookupParameters, now.toISOString()],
    )

    return rows[0] ? mapAppSessionRow(rows[0]) : null
  }

  if (client) {
    return revoke(client)
  }

  return withDatabaseConnection(revoke)
}
