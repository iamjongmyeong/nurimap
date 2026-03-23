import { Pool, type PoolClient, type PoolConfig } from 'pg'

const LOCAL_DB_HOSTS = new Set(['127.0.0.1', 'localhost'])
const SSL_CONNECTION_STRING_KEYS = ['sslcert', 'sslkey', 'sslrootcert', 'sslmode']

let databasePool: Pool | null = null

const getString = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const normalizeDatabaseRootCert = (value: string) =>
  value
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')

export const resolveDatabaseConnectionString = (env: NodeJS.ProcessEnv = process.env) => {
  const runtimeUrl = getString(env.DATABASE_URL)
    ?? getString(env.POSTGRES_URL)
    ?? getString(env.SUPABASE_DB_URL)

  const testUrl = getString(env.TEST_DATABASE_URL)
    ?? getString(env.DATABASE_URL_TEST)
    ?? getString(env.POSTGRES_TEST_URL)
    ?? getString(env.SUPABASE_TEST_DB_URL)

  if (env.NODE_ENV === 'test') {
    const resolved = testUrl ?? runtimeUrl
    if (resolved) {
      return resolved
    }
  }

  if (runtimeUrl) {
    return runtimeUrl
  }

  throw new Error('Database connection string is missing.')
}

export const shouldUseDatabaseSsl = (connectionString: string) => {
  try {
    const hostname = new URL(connectionString).hostname
    return !LOCAL_DB_HOSTS.has(hostname)
  } catch {
    return true
  }
}

export const resolveDatabaseSslRootCert = (env: NodeJS.ProcessEnv = process.env) => {
  const rootCert = getString(env.DATABASE_SSL_ROOT_CERT)
    ?? getString(env.SUPABASE_DB_ROOT_CERT)

  return rootCert ? normalizeDatabaseRootCert(rootCert) : null
}

export const stripDatabaseSslConnectionOptions = (connectionString: string) => {
  try {
    const parsed = new URL(connectionString)

    for (const key of SSL_CONNECTION_STRING_KEYS) {
      parsed.searchParams.delete(key)
    }

    return parsed.toString()
  } catch {
    return connectionString
  }
}

export const resolveDatabaseSslConfig = (
  connectionString: string,
  env: NodeJS.ProcessEnv = process.env,
): PoolConfig['ssl'] => {
  if (!shouldUseDatabaseSsl(connectionString)) {
    return undefined
  }

  const rootCert = resolveDatabaseSslRootCert(env)
  return rootCert
    ? { rejectUnauthorized: true, ca: rootCert }
    : { rejectUnauthorized: true }
}

const buildPoolConfig = (env: NodeJS.ProcessEnv = process.env): PoolConfig => {
  const connectionString = stripDatabaseSslConnectionOptions(resolveDatabaseConnectionString(env))

  return {
    connectionString,
    max: Number(env.DB_POOL_MAX ?? 1),
    ssl: resolveDatabaseSslConfig(connectionString, env),
  }
}

export const getDatabasePool = () => {
  if (!databasePool) {
    databasePool = new Pool(buildPoolConfig())
  }

  return databasePool
}

export const withDatabaseConnection = async <T>(
  work: (client: PoolClient) => Promise<T>,
) => {
  const client = await getDatabasePool().connect()

  try {
    return await work(client)
  } finally {
    client.release()
  }
}

export const withDatabaseTransaction = async <T>(
  work: (client: PoolClient) => Promise<T>,
) =>
  withDatabaseConnection(async (client) => {
    await client.query('begin')

    try {
      const result = await work(client)
      await client.query('commit')
      return result
    } catch (error) {
      await client.query('rollback')
      throw error
    }
  })

export const __resetDatabasePoolForTests = async () => {
  if (!databasePool) {
    return
  }

  await databasePool.end()
  databasePool = null
}
