import { useState } from 'react'
import { NAVER_URL_ERROR_MESSAGE, normalizeNaverMapUrl } from './naverUrl'

type PlaceAddPanelProps = {
  onClose: () => void
}

type NormalizedResult = {
  canonicalUrl: string
  naverPlaceId: string
} | null

const PlaceAddForm = ({ onClose }: PlaceAddPanelProps) => {
  const [rawUrl, setRawUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [normalizedResult, setNormalizedResult] = useState<NormalizedResult>(null)

  const handleSubmit = () => {
    try {
      const normalized = normalizeNaverMapUrl(rawUrl)
      setErrorMessage(null)
      setNormalizedResult(normalized)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : NAVER_URL_ERROR_MESSAGE)
      setNormalizedResult(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Place Add</p>
          <h2 className="mt-2 text-xl font-bold text-base-content">네이버 지도 URL 확인</h2>
        </div>
        <button className="btn btn-ghost btn-circle btn-sm" onClick={onClose} type="button">
          ✕
        </button>
      </div>

      <label className="form-control w-full gap-2">
        <span className="label-text font-semibold text-base-content">네이버 지도 URL</span>
        <input
          aria-label="네이버 지도 URL"
          className={`input input-bordered w-full ${errorMessage ? 'input-error' : ''}`}
          onChange={(event) => setRawUrl(event.target.value)}
          placeholder="https://map.naver.com/p/entry/place/123456789"
          type="url"
          value={rawUrl}
        />
      </label>

      {errorMessage ? <p className="text-sm text-error">{errorMessage}</p> : null}

      <button className="btn btn-primary rounded-2xl" onClick={handleSubmit} type="button">
        URL 확인
      </button>

      {normalizedResult ? (
        <div className="rounded-2xl bg-base-200 p-4 text-sm text-base-content/80" data-testid="normalized-naver-url-result">
          <p className="font-semibold text-base-content">정규화 결과</p>
          <p className="mt-2">placeId: {normalizedResult.naverPlaceId}</p>
          <p className="mt-1 break-all">canonical URL: {normalizedResult.canonicalUrl}</p>
        </div>
      ) : null}
    </div>
  )
}

export const DesktopPlaceAddPanel = ({ onClose }: PlaceAddPanelProps) => (
  <section
    className="absolute right-6 top-6 bottom-6 z-20 w-[390px] rounded-[28px] border border-base-300 bg-base-100/95 p-6 shadow-2xl backdrop-blur"
    data-testid="desktop-place-add-panel"
  >
    <PlaceAddForm onClose={onClose} />
  </section>
)

export const MobilePlaceAddPage = ({ onClose }: PlaceAddPanelProps) => (
  <section className="absolute inset-0 z-30 flex min-h-screen flex-col bg-base-100" data-testid="mobile-place-add-page">
    <div className="border-b border-base-300 px-4 py-4">
      <PlaceAddForm onClose={onClose} />
    </div>
  </section>
)
