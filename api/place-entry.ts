import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  findActiveAppSessionById,
  isValidCsrfTokenPair,
  readCsrfTokenFromCookieHeader,
  readCsrfTokenFromHeaders,
  readSessionIdFromCookieHeader,
} from './_lib/_appSessionService.js'
import { getAuthenticatedSession } from './_lib/_authService.js'
import { persistPlaceRegistration } from './_lib/_placeDataService.js'
import { logPlaceEntryFailure } from './_lib/_opsLogger.js'
import { preparePlaceEntryFromDraft } from './_lib/_placeEntryService.js'

const GENERIC_PLACE_ENTRY_ERROR_MESSAGE = '등록하지 못했어요. 잠시 후 다시 시도해 주세요.'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method_not_allowed', message: 'Method not allowed' } })
    return
  }

  const sessionId = readSessionIdFromCookieHeader(req.headers.cookie)
  const session = sessionId ? await findActiveAppSessionById({ sessionId }) : null
  const cookieCsrfToken = readCsrfTokenFromCookieHeader(req.headers.cookie)
  const headerCsrfToken = readCsrfTokenFromHeaders(req.headers)

  if (!sessionId || !session) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Unauthorized' } })
    return
  }

  if (!isValidCsrfTokenPair({
    cookieToken: cookieCsrfToken,
    headerToken: headerCsrfToken,
    expectedHash: session.csrf_token_hash,
  })) {
    res.status(403).json({ error: { code: 'csrf_invalid', message: 'Invalid CSRF token.' } })
    return
  }

  const authSession = await getAuthenticatedSession(sessionId)
  if (authSession.status === 'missing') {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Unauthorized' } })
    return
  }

  const name = typeof req.body?.name === 'string' ? req.body.name : ''
  const roadAddress = typeof req.body?.roadAddress === 'string' ? req.body.roadAddress : ''
  const landLotAddress = typeof req.body?.landLotAddress === 'string' ? req.body.landLotAddress : null
  const placeType = req.body?.placeType === 'restaurant' || req.body?.placeType === 'cafe'
    ? req.body.placeType
    : 'restaurant'
  const zeropayStatus =
    req.body?.zeropayStatus === 'available'
    || req.body?.zeropayStatus === 'unavailable'
    || req.body?.zeropayStatus === 'needs_verification'
      ? req.body.zeropayStatus
      : 'available'
  const ratingScore = typeof req.body?.ratingScore === 'number' ? req.body.ratingScore : 0
  const reviewContent = typeof req.body?.reviewContent === 'string' ? req.body.reviewContent : ''
  const confirmDuplicate = req.body?.confirmDuplicate === true

  try {
    const prepared = await preparePlaceEntryFromDraft({
      name,
      roadAddress,
      landLotAddress,
    })

    if (prepared.status === 'error') {
      res.status(422).json(prepared)
      return
    }

    const result = await persistPlaceRegistration({
      userId: authSession.user.id,
      confirmDuplicate,
      draft: {
        place_type: placeType,
        zeropay_status: zeropayStatus,
        rating_score: ratingScore,
        review_content: reviewContent,
      },
      lookupData: prepared.data,
    })

    if (result.status === 'error') {
      res.status(422).json({
        error: {
          code: 'place_save_failed',
          message: result.message,
        },
      })
      return
    }

    if (result.status === 'confirm_required') {
      res.status(409).json(result)
      return
    }

    res.status(200).json(result)
  } catch (error) {
    logPlaceEntryFailure({
      code: 'internal_error',
      details: {
        error_message: error instanceof Error ? error.message : 'unknown_error',
      },
    })
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: GENERIC_PLACE_ENTRY_ERROR_MESSAGE,
      },
    })
  }
}
