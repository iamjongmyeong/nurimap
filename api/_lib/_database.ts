import { Pool, type PoolClient, type PoolConfig } from 'pg'

const LOCAL_DB_HOSTS = new Set(['127.0.0.1', 'localhost'])

let databasePool: Pool | null = null

const getString = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

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

export const resolveDatabaseSslConfig = (connectionString: string): PoolConfig['ssl'] =>
  shouldUseDatabaseSsl(connectionString)
    ? { rejectUnauthorized: true }
    : undefined

const buildPoolConfig = (): PoolConfig => {
  const connectionString = resolveDatabaseConnectionString()

  return {
    connectionString,
    max: Number(process.env.DB_POOL_MAX ?? 1),
    ssl: resolveDatabaseSslConfig(connectionString),
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
