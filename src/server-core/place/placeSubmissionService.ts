import { createHmac, timingSafeEqual } from 'node:crypto'

import type { PlaceLookupSuccess } from '../../shared/placeLookupTypes.js'
import {
  persistPlaceRegistration,
  type PersistedPlaceRegistrationDraft,
  type PersistedPlaceRegistrationResult,
} from './placeDataService.js'

const PLACE_SUBMISSION_TOKEN_TTL_MS = 15 * 60 * 1000
export const PLACE_SUBMISSION_INVALID_MESSAGE = '확인 요청이 만료되었어요. 다시 시도해 주세요.'

type PlaceSubmissionTokenPayload = {
  draft: PersistedPlaceRegistrationDraft
  issuedAt: string
  lookupData: PlaceLookupSuccess['data']
  userId: string
  version: 1
}

export type PlaceSubmissionDescriptor = {
  expiresAt: string
  id: string
}

export type PlaceSubmissionCreateResult =
  | Exclude<PersistedPlaceRegistrationResult, { status: 'confirm_required' }>
  | (Extract<PersistedPlaceRegistrationResult, { status: 'confirm_required' }> & {
      submission: PlaceSubmissionDescriptor
    })

export type PlaceSubmissionConfirmationResult =
  | Exclude<PersistedPlaceRegistrationResult, { status: 'confirm_required' }>
  | {
      code: 'submission_invalid'
      message: typeof PLACE_SUBMISSION_INVALID_MESSAGE
      status: 'error'
    }

const getString = (value: string | undefined | null) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const getPlaceSubmissionSecret = () => {
  const resolvedSecret = getString(process.env.PLACE_SUBMISSION_TOKEN_SECRET)
    ?? getString(process.env.SUPABASE_SECRET_KEY)
    ?? getString(process.env.SUPABASE_SERVICE_ROLE_KEY)
    ?? getString(process.env.DATABASE_URL)
    ?? getString(process.env.POSTGRES_URL)

  if (resolvedSecret) {
    return resolvedSecret
  }

  if (process.env.NODE_ENV === 'test') {
    return 'nurimap-place-submission-test-secret'
  }

  throw new Error('Place submission secret is missing.')
}

const encodePayload = (payload: PlaceSubmissionTokenPayload) =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')

const signPayload = (encodedPayload: string) =>
  createHmac('sha256', getPlaceSubmissionSecret()).update(encodedPayload).digest('base64url')

const toExpiresAt = (issuedAt: string) =>
  new Date(new Date(issuedAt).getTime() + PLACE_SUBMISSION_TOKEN_TTL_MS).toISOString()

const parsePayload = (encodedPayload: string) => {
  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<PlaceSubmissionTokenPayload>
    if (
      parsed.version !== 1
      || typeof parsed.userId !== 'string'
      || typeof parsed.issuedAt !== 'string'
      || typeof parsed.lookupData !== 'object'
      || parsed.lookupData === null
      || typeof parsed.draft !== 'object'
      || parsed.draft === null
    ) {
      return null
    }

    return parsed as PlaceSubmissionTokenPayload
  } catch {
    return null
  }
}

const isExpiredPayload = ({
  now,
  payload,
}: {
  now: Date
  payload: PlaceSubmissionTokenPayload
}) => {
  const issuedAt = new Date(payload.issuedAt).getTime()
  if (!Number.isFinite(issuedAt)) {
    return true
  }

  return now.getTime() - issuedAt > PLACE_SUBMISSION_TOKEN_TTL_MS
}

export const __createPlaceSubmissionIdForTests = ({
  draft,
  lookupData,
  now = new Date(),
  userId,
}: {
  draft: PersistedPlaceRegistrationDraft
  lookupData: PlaceLookupSuccess['data']
  now?: Date
  userId: string
}) => {
  const payload: PlaceSubmissionTokenPayload = {
    version: 1,
    issuedAt: now.toISOString(),
    userId,
    draft,
    lookupData,
  }

  const encodedPayload = encodePayload(payload)
  const signature = signPayload(encodedPayload)

  return {
    expiresAt: toExpiresAt(payload.issuedAt),
    id: `${encodedPayload}.${signature}`,
  } satisfies PlaceSubmissionDescriptor
}

const readPlaceSubmissionToken = ({
  now = new Date(),
  submissionId,
  userId,
}: {
  now?: Date
  submissionId: string
  userId: string
}) => {
  const [encodedPayload, providedSignature] = submissionId.split('.', 2)
  if (!encodedPayload || !providedSignature) {
    return null
  }

  const expectedSignature = signPayload(encodedPayload)
  const expectedBuffer = Buffer.from(expectedSignature)
  const providedBuffer = Buffer.from(providedSignature)

  if (
    expectedBuffer.length !== providedBuffer.length
    || !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null
  }

  const payload = parsePayload(encodedPayload)
  if (!payload || payload.userId !== userId || isExpiredPayload({ now, payload })) {
    return null
  }

  return payload
}

export const createPlaceSubmission = async ({
  draft,
  lookupData,
  now = new Date(),
  userId,
}: {
  draft: PersistedPlaceRegistrationDraft
  lookupData: PlaceLookupSuccess['data']
  now?: Date
  userId: string
}): Promise<PlaceSubmissionCreateResult> => {
  const result = await persistPlaceRegistration({
    userId,
    confirmDuplicate: false,
    draft,
    lookupData,
  })

  if (result.status !== 'confirm_required') {
    return result
  }

  return {
    ...result,
    submission: __createPlaceSubmissionIdForTests({
      userId,
      draft,
      lookupData,
      now,
    }),
  }
}

export const confirmPlaceSubmission = async ({
  now = new Date(),
  submissionId,
  userId,
}: {
  now?: Date
  submissionId: string
  userId: string
}): Promise<PlaceSubmissionConfirmationResult> => {
  const payload = readPlaceSubmissionToken({
    userId,
    submissionId,
    now,
  })

  if (!payload) {
    return {
      status: 'error',
      code: 'submission_invalid',
      message: PLACE_SUBMISSION_INVALID_MESSAGE,
    }
  }

  const result = await persistPlaceRegistration({
    userId,
    confirmDuplicate: true,
    draft: payload.draft,
    lookupData: payload.lookupData,
  })

  if (result.status === 'confirm_required') {
    return {
      status: 'error',
      code: 'submission_invalid',
      message: PLACE_SUBMISSION_INVALID_MESSAGE,
    }
  }

  return result
}
