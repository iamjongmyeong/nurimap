import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAccessToken } from './_lib/_authService.js'
import { logPlaceEntryFailure } from './_lib/_opsLogger.js'
import { preparePlaceEntryFromDraft } from './_lib/_placeEntryService.js'

const GENERIC_PLACE_ENTRY_ERROR_MESSAGE = '등록하지 못했어요. 잠시 후 다시 시도해 주세요.'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method_not_allowed', message: 'Method not allowed' } })
    return
  }

  const authorization = req.headers.authorization
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
  const user = accessToken ? await verifyAccessToken(accessToken) : null
  if (!user) {
    res.status(401).json({ error: { code: 'unauthorized', message: 'Unauthorized' } })
    return
  }

  const name = typeof req.body?.name === 'string' ? req.body.name : ''
  const roadAddress = typeof req.body?.roadAddress === 'string' ? req.body.roadAddress : ''
  const landLotAddress = typeof req.body?.landLotAddress === 'string' ? req.body.landLotAddress : null

  try {
    const result = await preparePlaceEntryFromDraft({
      name,
      roadAddress,
      landLotAddress,
    })

    if (result.status === 'error') {
      res.status(422).json(result)
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
