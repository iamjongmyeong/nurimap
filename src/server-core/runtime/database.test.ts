import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  __resetDatabasePoolForTests,
  resolveDatabaseConnectionString,
  resolveDatabaseSslConfig,
  resolveDatabaseSslRootCert,
  stripDatabaseSslConnectionOptions,
  shouldUseDatabaseSsl,
} from './database'

describe('database foundation', () => {
  afterEach(async () => {
    await __resetDatabasePoolForTests()
    vi.unstubAllEnvs()
  })

  it('prefers dedicated test database url in test mode', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('DATABASE_URL', 'postgres://runtime-user:runtime-pass@db.example.com:5432/postgres')
    vi.stubEnv('TEST_DATABASE_URL', 'postgres://test-user:test-pass@127.0.0.1:54322/postgres')

    expect(resolveDatabaseConnectionString()).toBe('postgres://test-user:test-pass@127.0.0.1:54322/postgres')
  })

  it('falls back to runtime database url outside test mode', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DATABASE_URL', 'postgres://runtime-user:runtime-pass@db.example.com:5432/postgres')

    expect(resolveDatabaseConnectionString()).toBe('postgres://runtime-user:runtime-pass@db.example.com:5432/postgres')
  })

  it('strips conflicting ssl query params before pg applies ssl config', () => {
    expect(
      stripDatabaseSslConnectionOptions(
        'postgres://runtime-user:runtime-pass@db.example.com:5432/postgres?sslmode=require&sslrootcert=%2Ftmp%2Froot.crt&application_name=nurimap',
      ),
    ).toBe(
      'postgres://runtime-user:runtime-pass@db.example.com:5432/postgres?application_name=nurimap',
    )
  })

  it('disables ssl for localhost-style connections', () => {
    expect(shouldUseDatabaseSsl('postgres://postgres:postgres@127.0.0.1:54322/postgres')).toBe(false)
    expect(shouldUseDatabaseSsl('postgres://postgres:postgres@localhost:54322/postgres')).toBe(false)
  })

  it('enables ssl for non-local hosts', () => {
    expect(shouldUseDatabaseSsl('postgres://postgres:postgres@db.example.com:5432/postgres')).toBe(true)
  })

  it('uses verified ssl for non-local hosts', () => {
    expect(resolveDatabaseSslConfig('postgres://postgres:postgres@db.example.com:5432/postgres')).toEqual({
      rejectUnauthorized: true,
    })
  })

  it('adds a configured root cert to verified ssl for non-local hosts', () => {
    vi.stubEnv(
      'DATABASE_SSL_ROOT_CERT',
      '-----BEGIN CERTIFICATE-----\\nline-two\\n-----END CERTIFICATE-----',
    )

    expect(resolveDatabaseSslRootCert()).toBe(
      '-----BEGIN CERTIFICATE-----\nline-two\n-----END CERTIFICATE-----',
    )
    expect(resolveDatabaseSslConfig('postgres://postgres:postgres@db.example.com:5432/postgres')).toEqual({
      rejectUnauthorized: true,
      ca: '-----BEGIN CERTIFICATE-----\nline-two\n-----END CERTIFICATE-----',
    })
  })

  it('falls back to the supabase root cert env alias', () => {
    vi.stubEnv(
      'SUPABASE_DB_ROOT_CERT',
      '-----BEGIN CERTIFICATE-----\\nlegacy-line\\n-----END CERTIFICATE-----',
    )

    expect(resolveDatabaseSslConfig('postgres://postgres:postgres@db.example.com:5432/postgres')).toEqual({
      rejectUnauthorized: true,
      ca: '-----BEGIN CERTIFICATE-----\nlegacy-line\n-----END CERTIFICATE-----',
    })
  })

  it('keeps localhost-style connections plaintext', () => {
    expect(resolveDatabaseSslConfig('postgres://postgres:postgres@127.0.0.1:54322/postgres')).toBeUndefined()
    expect(resolveDatabaseSslConfig('postgres://postgres:postgres@localhost:54322/postgres')).toBeUndefined()
  })
})
