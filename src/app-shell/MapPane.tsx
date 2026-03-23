import { useEffect, useMemo, useRef } from 'react'
import { MAP_INITIAL_CENTER } from './mockPlaces'
import type { PlaceSummary, PlaceType } from './types'
import {
  useKakaoScript,
  type KakaoMapInstance,
  type KakaoMarkerInstance,
  type KakaoOverlayInstance,
} from './useKakaoScript'

type MapPaneProps = {
  places: PlaceSummary[]
  selectedPlaceId: string | null
  mapLevel: number
  onMapLevelChange: (level: number) => void
  onMarkerSelect: (placeId: string) => void
}

const LEVEL_LABEL_THRESHOLD = 5
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

const toMarkerImageSource = (placeType: PlaceType) => {
  const palette = markerPalette[placeType]

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44" fill="none">
      <path d="M17 1C8.16344 1 1 8.16344 1 17C1 30.5 17 43 17 43C17 43 33 30.5 33 17C33 8.16344 25.8366 1 17 1Z" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="2"/>
      <circle cx="17" cy="17" r="6" fill="white"/>
    </svg>
  `)}`
}

const FallbackMapPane = ({
  places,
  selectedPlaceId,
  mapLevel,
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

  return (
    <div
      aria-label="지도 캔버스"
      className="relative z-0 h-full min-h-screen overflow-hidden bg-slate-900"
      data-testid="map-canvas"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,0.25),_transparent_25%),linear-gradient(135deg,_rgba(15,23,42,1)_0%,_rgba(30,41,59,1)_45%,_rgba(59,130,246,0.35)_100%)]" />
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
      <div className="h-full min-h-screen" ref={mapRef} />
    </div>
  )
}
