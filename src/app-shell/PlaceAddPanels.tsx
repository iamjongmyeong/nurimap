import { useState } from 'react'
import { NAVER_URL_ERROR_MESSAGE, normalizeNaverMapUrl } from './naverUrl'
import type { PlaceLookupResult, PlaceLookupSuccess } from '../server/placeLookupTypes'

type PlaceAddPanelProps = {
  onClose: () => void
}

type PlaceLookupState = 'idle' | 'validating_url' | 'loading' | 'error'

const FailureModal = ({
  message,
  onClose,
  onRetry,
}: {
  message: string
  onClose: () => void
  onRetry: () => void
}) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4" data-testid="place-lookup-error-modal">
    <div className="w-full max-w-sm rounded-[28px] bg-base-100 p-6 shadow-2xl">
      <h3 className="text-lg font-bold text-base-content">조회에 실패했어요</h3>
      <p className="mt-3 text-sm text-base-content/70">{message}</p>
      <div className="mt-6 flex gap-3">
        <button className="btn btn-primary flex-1 rounded-2xl" onClick={onRetry} type="button">
          다시 시도
        </button>
        <button className="btn btn-ghost flex-1 rounded-2xl" onClick={onClose} type="button">
          닫기
        </button>
      </div>
    </div>
  </div>
)

const PlaceLookupSummary = ({ result }: { result: PlaceLookupSuccess['data'] }) => (
  <div className="rounded-2xl bg-base-200 p-4 text-sm text-base-content/80" data-testid="place-lookup-summary">
    <div className="flex items-center justify-between gap-3">
      <p className="font-semibold text-base-content">조회된 장소 정보</p>
      <span className="badge badge-outline badge-sm">읽기 전용</span>
    </div>
    <div className="mt-3 space-y-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">장소명</p>
        <p className="mt-1 text-base font-semibold text-base-content">{result.name}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">대표 주소</p>
        <p className="mt-1">{result.representative_address}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">canonical URL</p>
        <p className="mt-1 break-all">{result.canonical_url}</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <p>lat: {result.latitude}</p>
        <p>lng: {result.longitude}</p>
      </div>
    </div>
  </div>
)

const PlaceAddForm = ({ onClose }: PlaceAddPanelProps) => {
  const [rawUrl, setRawUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lookupState, setLookupState] = useState<PlaceLookupState>('idle')
  const [lookupResult, setLookupResult] = useState<PlaceLookupSuccess['data'] | null>(null)
  const [failureMessage, setFailureMessage] = useState<string | null>(null)

  const executeLookup = async (targetRawUrl: string) => {
    if (lookupState === 'loading') {
      return
    }

    try {
      setLookupState('validating_url')
      normalizeNaverMapUrl(targetRawUrl)
      setErrorMessage(null)
      setLookupState('loading')

      const response = await fetch('/api/place-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rawUrl: targetRawUrl }),
      })

      const result = (await response.json()) as PlaceLookupResult

      if (!response.ok || result.status === 'error') {
        setLookupResult(null)
        setFailureMessage(result.status === 'error' ? result.error.message : '장소 정보를 가져오지 못했어요. 다시 시도해 주세요.')
        setLookupState('error')
        return
      }

      setLookupResult(result.data)
      setFailureMessage(null)
      setLookupState('idle')
    } catch (error) {
      const message = error instanceof Error ? error.message : NAVER_URL_ERROR_MESSAGE
      setLookupResult(null)
      if (message === NAVER_URL_ERROR_MESSAGE) {
        setErrorMessage(message)
      } else {
        setFailureMessage(message)
      }
      setLookupState('error')
    }
  }

  const handleSubmit = async () => {
    await executeLookup(rawUrl)
  }

  const handleRetry = async () => {
    setFailureMessage(null)
    await executeLookup(rawUrl)
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

      {lookupResult ? <PlaceLookupSummary result={lookupResult} /> : null}

      <button
        className="btn btn-primary rounded-2xl"
        disabled={lookupState === 'loading'}
        onClick={() => {
          void handleSubmit()
        }}
        type="button"
      >
        {lookupState === 'loading' ? '조회 중...' : 'URL 확인'}
      </button>

      {lookupState === 'loading' ? (
        <div className="rounded-2xl bg-base-200 p-4 text-sm text-base-content/80" data-testid="place-lookup-loading">
          장소 정보를 조회하는 중입니다.
        </div>
      ) : null}

      {failureMessage ? (
        <FailureModal
          message={failureMessage}
          onClose={() => {
            setFailureMessage(null)
            setLookupState('idle')
          }}
          onRetry={() => {
            void handleRetry()
          }}
        />
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
