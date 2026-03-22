import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MAP_INITIAL_CENTER } from './mockPlaces'
import type { PlaceSummary, PlaceType } from './types'

type MapPaneProps = {
  places: PlaceSummary[]
  selectedPlaceId: string | null
  mapLevel: number
  onMapLevelChange: (level: number) => void
  onMarkerSelect: (placeId: string) => void
}

type KakaoMapInstance = {
  addControl: (control: unknown, position: unknown) => void
  getLevel: () => number
  panTo: (latLng: unknown) => void
  setLevel: (level: number) => void
}

type KakaoMarkerInstance = {
  setMap: (map: KakaoMapInstance | null) => void
}

type KakaoOverlayInstance = {
  setMap: (map: KakaoMapInstance | null) => void
}

type KakaoNamespace = {
  maps: {
    load: (callback: () => void) => void
    Map: new (container: HTMLElement, options: { center: unknown; level: number }) => KakaoMapInstance
    LatLng: new (latitude: number, longitude: number) => unknown
    Marker: new (options: { image: unknown; map: KakaoMapInstance; position: unknown }) => KakaoMarkerInstance
    MarkerImage: new (source: string, size: unknown) => unknown
    Size: new (width: number, height: number) => unknown
    ZoomControl: new () => unknown
    ControlPosition: {
      RIGHT: unknown
    }
    CustomOverlay: new (options: { content: HTMLElement; map: KakaoMapInstance; position: unknown; yAnchor: number }) => KakaoOverlayInstance
    event: {
      addListener: (target: unknown, eventName: string, handler: () => void) => void
    }
  }
}

declare global {
  interface Window {
    kakao?: KakaoNamespace
  }

  interface ImportMetaEnv {
    readonly PUBLIC_KAKAO_MAP_APP_KEY?: string
  }
}

type KakaoScriptStatus = 'fallback' | 'loading' | 'ready' | 'unavailable' | 'error'

const LEVEL_LABEL_THRESHOLD = 5
const MAP_MIN_LEVEL = 1
const MAP_MAX_LEVEL = 14
const KAKAO_SCRIPT_SELECTOR = 'script[data-kakao-map-sdk="true"]'
const MAP_LOADING_COPY = '지도를 불러오는 중이에요.'
const MAP_FAILURE_TITLE = '지도를 불러오지 못했어요.'
const MAP_FAILURE_BODY = '네트워크 상태를 확인한 뒤 다시 시도해주세요.'
const MAP_RETRY_LABEL = '다시 시도'

type PlaceWithCoordinates = PlaceSummary & {
  latitude: number
  longitude: number
}

const hasCoordinates = (place: PlaceSummary): place is PlaceWithCoordinates =>
  place.latitude !== undefined && place.longitude !== undefined

const markerPalette: Record<PlaceType, { fill: string; stroke: string; label: string }> = {
  restaurant: {
    fill: '#f97316',
    stroke: '#9a3412',
    label: '식당',
  },
  cafe: {
    fill: '#3b82f6',
    stroke: '#1d4ed8',
    label: '카페',
  },
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const hasUsableKakaoRuntime = () =>
  typeof window.kakao?.maps?.load === 'function'
  && typeof window.kakao?.maps?.Map === 'function'
  && typeof window.kakao?.maps?.LatLng === 'function'
  && typeof window.kakao?.maps?.Marker === 'function'
  && typeof window.kakao?.maps?.MarkerImage === 'function'
  && typeof window.kakao?.maps?.Size === 'function'
  && typeof window.kakao?.maps?.ZoomControl === 'function'
  && typeof window.kakao?.maps?.CustomOverlay === 'function'
  && typeof window.kakao?.maps?.event?.addListener === 'function'

const hasKakaoLoader = () =>
  typeof window.kakao?.maps?.load === 'function'

const toMarkerImageSource = (placeType: PlaceType) => {
  const palette = markerPalette[placeType]

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44" fill="none">
      <path d="M17 1C8.16344 1 1 8.16344 1 17C1 30.5 17 43 17 43C17 43 33 30.5 33 17C33 8.16344 25.8366 1 17 1Z" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="2"/>
      <circle cx="17" cy="17" r="6" fill="white"/>
    </svg>
  `)}`
}

const useKakaoScript = () => {
  const appKey = import.meta.env.PUBLIC_KAKAO_MAP_APP_KEY
  const isTestMode = import.meta.env.MODE === 'test'
  const [retryKey, setRetryKey] = useState(0)
  const hasExistingRuntime = hasUsableKakaoRuntime()
  const hasLoader = hasKakaoLoader()
  const canUseRuntime = hasLoader || (Boolean(appKey) && !isTestMode)
  const [runtimeStatus, setRuntimeStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const kakao = window.kakao

    if (typeof kakao?.maps?.load === 'function') {
      kakao.maps.load(() => {
        setRuntimeStatus(hasUsableKakaoRuntime() ? 'ready' : 'error')
      })
      return
    }

    if (isTestMode || !canUseRuntime) {
      return
    }

    const existingScript = document.querySelector<HTMLScriptElement>(KAKAO_SCRIPT_SELECTOR)

    const handleReady = () => {
      const runtime = window.kakao

      if (typeof runtime?.maps?.load !== 'function') {
        setRuntimeStatus('error')
        return
      }

      runtime.maps.load(() => {
        setRuntimeStatus(hasUsableKakaoRuntime() ? 'ready' : 'error')
      })
    }

    const handleError = () => {
      setRuntimeStatus('error')
    }

    const script = existingScript ?? document.createElement('script')
    script.async = true
    script.dataset.kakaoMapSdk = 'true'
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`
    script.addEventListener('load', handleReady, { once: true })
    script.addEventListener('error', handleError, { once: true })

    if (!existingScript) {
      document.head.appendChild(script)
    }

    return () => {
      script.removeEventListener('load', handleReady)
      script.removeEventListener('error', handleError)
    }
  }, [appKey, canUseRuntime, isTestMode, retryKey])

  const retry = useCallback(() => {
    if (!appKey || isTestMode) {
      return
    }

    document.querySelector<HTMLScriptElement>(KAKAO_SCRIPT_SELECTOR)?.remove()
    setRuntimeStatus('loading')
    setRetryKey((current) => current + 1)
  }, [appKey, isTestMode])

  const status: KakaoScriptStatus = hasExistingRuntime
    ? 'ready'
    : isTestMode
      ? 'fallback'
      : !canUseRuntime
        ? 'unavailable'
        : runtimeStatus

  return {
    retry,
    status,
  }
}

const MapLevelHud = ({ mapLevel }: { mapLevel: number }) => (
  <div className="pointer-events-none absolute left-4 top-4 z-10 text-[11px] font-medium text-slate-100">
    <span
      className="rounded-full border border-white/15 bg-slate-950/65 px-3 py-1.5 shadow-lg backdrop-blur"
      data-testid="map-level"
    >
      level {mapLevel}
    </span>
  </div>
)

const MapZoomControls = ({
  mapLevel,
  onZoomIn,
  onZoomOut,
}: {
  mapLevel: number
  onZoomIn: () => void
  onZoomOut: () => void
}) => (
  <div
    className="absolute right-4 top-4 z-10 flex flex-col gap-2 rounded-[24px] border border-white/15 bg-slate-950/65 p-2 shadow-xl backdrop-blur"
    data-testid="map-zoom-controls"
  >
    <button
      aria-label="지도 확대"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#1f1f1f] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      disabled={mapLevel <= MAP_MIN_LEVEL}
      onClick={onZoomIn}
      type="button"
    >
      ＋
    </button>
    <button
      aria-label="지도 축소"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#1f1f1f] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      disabled={mapLevel >= MAP_MAX_LEVEL}
      onClick={onZoomOut}
      type="button"
    >
      －
    </button>
  </div>
)

const FallbackMapPane = ({
  places,
  selectedPlaceId,
  mapLevel,
  onMapLevelChange,
  onMarkerSelect,
}: MapPaneProps) => {
  const visiblePlaces = useMemo(
    () => places.filter(hasCoordinates),
    [places],
  )
  const focusedPlace = visiblePlaces.find((place) => place.id === selectedPlaceId) ?? null
  const focusCenter = focusedPlace
    ? { latitude: focusedPlace.latitude, longitude: focusedPlace.longitude }
    : MAP_INITIAL_CENTER
  const handleZoomIn = () => onMapLevelChange(clamp(mapLevel - 1, MAP_MIN_LEVEL, MAP_MAX_LEVEL))
  const handleZoomOut = () => onMapLevelChange(clamp(mapLevel + 1, MAP_MIN_LEVEL, MAP_MAX_LEVEL))

  return (
    <div
      aria-label="지도 캔버스"
      className="relative z-0 h-full min-h-screen overflow-hidden bg-slate-900"
      data-testid="map-canvas"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,0.25),_transparent_25%),linear-gradient(135deg,_rgba(15,23,42,1)_0%,_rgba(30,41,59,1)_45%,_rgba(59,130,246,0.35)_100%)]" />
      <MapLevelHud mapLevel={mapLevel} />
      <MapZoomControls mapLevel={mapLevel} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      {visiblePlaces.map((place) => {
        const palette = markerPalette[place.place_type]
        const top = clamp(
          50 - (place.latitude - focusCenter.latitude) * 3500,
          18,
          86,
        )
        const left = clamp(
          50 + (place.longitude - focusCenter.longitude) * 8000,
          12,
          88,
        )

        return (
          <div
            className="absolute z-[5] -translate-x-1/2 -translate-y-1/2"
            key={place.id}
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <button
              aria-label={`${place.name} 마커`}
              className="flex h-12 w-12 items-center justify-center rounded-full border-4 text-sm font-bold text-white shadow-lg"
              data-marker-type={place.place_type}
              data-testid={`map-marker-${place.id}`}
              onClick={() => onMarkerSelect(place.id)}
              style={{
                backgroundColor: palette.fill,
                borderColor: selectedPlaceId === place.id ? '#f8fafc' : palette.stroke,
                boxShadow: selectedPlaceId === place.id ? '0 0 0 4px rgba(255,255,255,0.2)' : undefined,
              }}
              type="button"
            >
              {palette.label}
            </button>
            {mapLevel <= LEVEL_LABEL_THRESHOLD ? (
              <span
                className="mt-2 inline-flex min-w-max rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-800 shadow"
                data-testid={`map-label-${place.id}`}
              >
                {place.name}
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

const MapLoadingPane = () => (
  <div
    aria-label="지도 캔버스"
    className="relative z-0 flex min-h-screen items-center justify-center overflow-hidden bg-[#edf2f7]"
    data-testid="map-canvas"
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(148,163,184,0.18),_transparent_28%),linear-gradient(180deg,_rgba(248,250,252,1)_0%,_rgba(237,242,247,1)_100%)]" />
    <div className="relative z-10 flex flex-col items-center gap-3 rounded-[28px] bg-white/85 px-6 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm" data-testid="map-loading-state">
      <span className="ui-spinner ui-spinner-lg text-[#5862fb]" />
      <p className="text-sm font-semibold text-slate-700">{MAP_LOADING_COPY}</p>
    </div>
  </div>
)

const MapErrorPane = ({ onRetry }: { onRetry: () => void }) => (
  <div
    aria-label="지도 캔버스"
    className="relative z-0 flex min-h-screen items-center justify-center overflow-hidden bg-[#edf2f7]"
    data-testid="map-canvas"
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(148,163,184,0.18),_transparent_28%),linear-gradient(180deg,_rgba(248,250,252,1)_0%,_rgba(237,242,247,1)_100%)]" />
    <div className="relative z-10 w-full max-w-sm rounded-[32px] bg-white px-6 py-7 text-center shadow-[0_24px_72px_rgba(15,23,42,0.12)]" data-testid="map-error-state">
      <p className="text-base font-semibold text-slate-800">{MAP_FAILURE_TITLE}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{MAP_FAILURE_BODY}</p>
      <button className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#5862fb] px-6 text-sm font-semibold text-white transition hover:bg-[#4953f1]" onClick={onRetry} type="button">
        {MAP_RETRY_LABEL}
      </button>
    </div>
  </div>
)

export const MapPane = ({
  places,
  selectedPlaceId,
  mapLevel,
  onMapLevelChange,
  onMarkerSelect,
}: MapPaneProps) => {
  const { retry, status } = useKakaoScript()
  const mapRef = useRef<HTMLDivElement | null>(null)
  const kakaoMapRef = useRef<KakaoMapInstance | null>(null)
  const markerRefs = useRef<KakaoMarkerInstance[]>([])
  const overlayRefs = useRef<KakaoOverlayInstance[]>([])
  const zoomControlRef = useRef<unknown | null>(null)
  const visiblePlaces = useMemo(
    () => places.filter(hasCoordinates),
    [places],
  )

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.kakao?.maps) {
      return
    }

    if (!kakaoMapRef.current) {
      kakaoMapRef.current = new window.kakao.maps.Map(mapRef.current, {
        center: new window.kakao.maps.LatLng(MAP_INITIAL_CENTER.latitude, MAP_INITIAL_CENTER.longitude),
        level: mapLevel,
      })

      if (!zoomControlRef.current) {
        zoomControlRef.current = new window.kakao.maps.ZoomControl()
        kakaoMapRef.current.addControl(zoomControlRef.current, window.kakao.maps.ControlPosition.RIGHT)
      }

      window.kakao.maps.event.addListener(kakaoMapRef.current, 'zoom_changed', () => {
        onMapLevelChange(kakaoMapRef.current?.getLevel() ?? mapLevel)
      })
    }
  }, [mapLevel, onMapLevelChange, status])

  useEffect(() => {
    const map = kakaoMapRef.current
    const kakao = window.kakao

    if (!map || !kakao?.maps) {
      return
    }

    markerRefs.current.forEach((marker) => marker.setMap(null))
    overlayRefs.current.forEach((overlay) => overlay.setMap(null))
    markerRefs.current = []
    overlayRefs.current = []

    visiblePlaces.forEach((place) => {
      const position = new kakao.maps.LatLng(place.latitude, place.longitude)
      const markerImage = new kakao.maps.MarkerImage(
        toMarkerImageSource(place.place_type),
        new kakao.maps.Size(34, 44),
      )
      const marker = new kakao.maps.Marker({
        position,
        image: markerImage,
        map,
      })

      kakao.maps.event.addListener(marker, 'click', () => onMarkerSelect(place.id))
      markerRefs.current.push(marker)

      if (mapLevel <= LEVEL_LABEL_THRESHOLD) {
        const label = document.createElement('div')
        label.className =
          'rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-800 shadow'
        label.textContent = place.name

        const overlay = new kakao.maps.CustomOverlay({
          content: label,
          map,
          position,
          yAnchor: 2,
        })

        overlayRefs.current.push(overlay)
      }
    })
  }, [mapLevel, onMarkerSelect, visiblePlaces])

  useEffect(() => {
    const map = kakaoMapRef.current
    const selectedPlace = visiblePlaces.find((place) => place.id === selectedPlaceId)

    if (!map || !selectedPlace || !window.kakao?.maps) {
      return
    }

    map.panTo(new window.kakao.maps.LatLng(selectedPlace.latitude, selectedPlace.longitude))
  }, [selectedPlaceId, visiblePlaces])

  useEffect(() => {
    const map = kakaoMapRef.current
    if (!map) {
      return
    }

    if (map.getLevel() !== mapLevel) {
      map.setLevel(mapLevel)
    }
  }, [mapLevel])

  if (status === 'fallback') {
    return (
      <FallbackMapPane
        mapLevel={mapLevel}
        onMapLevelChange={onMapLevelChange}
        onMarkerSelect={onMarkerSelect}
        places={places}
        selectedPlaceId={selectedPlaceId}
      />
    )
  }

  if (status === 'loading') {
    return <MapLoadingPane />
  }

  if (status === 'unavailable' || status === 'error') {
    return <MapErrorPane onRetry={retry} />
  }

  return (
    <div className="relative z-0 h-full min-h-screen overflow-hidden bg-slate-900" data-testid="map-canvas">
      <MapLevelHud mapLevel={mapLevel} />
      <div className="h-full min-h-screen" ref={mapRef} />
    </div>
  )
}
