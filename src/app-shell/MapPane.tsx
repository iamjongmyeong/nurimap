import { useEffect, useMemo, useRef, useState } from 'react'
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

const LEVEL_LABEL_THRESHOLD = 5
const MAP_MIN_LEVEL = 1
const MAP_MAX_LEVEL = 14

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

const useKakaoScript = () => {
  const appKey = import.meta.env.PUBLIC_KAKAO_MAP_APP_KEY
  const hasExistingRuntime = Boolean(window.kakao?.maps)
  const canUseRuntime = hasExistingRuntime || (Boolean(appKey) && import.meta.env.MODE !== 'test')
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>(() => {
    if (hasExistingRuntime) {
      return 'ready'
    }

    if (!canUseRuntime) {
      return 'unavailable'
    }

    return 'loading'
  })

  useEffect(() => {
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => setStatus('ready'))
      return
    }

    if (!canUseRuntime) {
      return
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-kakao-map-sdk="true"]')

    const handleReady = () => {
      window.kakao?.maps.load(() => setStatus('ready'))
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleReady, { once: true })
      return () => {
        existingScript.removeEventListener('load', handleReady)
      }
    }

    const script = document.createElement('script')
    script.async = true
    script.dataset.kakaoMapSdk = 'true'
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`
    script.addEventListener('load', handleReady, { once: true })
    document.head.appendChild(script)

    return () => {
      script.removeEventListener('load', handleReady)
    }
  }, [appKey, canUseRuntime])

  return {
    appKey,
    status,
  }
}

const MapStatusHud = ({
  focusCenter,
  mapLevel,
  selectedPlaceName,
}: {
  focusCenter: { latitude: number; longitude: number }
  mapLevel: number
  selectedPlaceName: string | null
}) => (
  <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[calc(100%-6.5rem)] flex-wrap gap-2 text-[11px] font-medium text-slate-100">
    <span
      className="rounded-full border border-white/15 bg-slate-950/65 px-3 py-1.5 shadow-lg backdrop-blur"
      data-testid="map-center"
    >
        중심 좌표: {focusCenter.latitude}, {focusCenter.longitude}
    </span>
    <span
      className="rounded-full border border-white/15 bg-slate-950/65 px-3 py-1.5 shadow-lg backdrop-blur"
      data-testid="map-level"
    >
      level {mapLevel}
    </span>
    {selectedPlaceName ? (
      <span
        className="rounded-full border border-white/15 bg-slate-950/65 px-3 py-1.5 shadow-lg backdrop-blur"
        data-testid="map-focus-place"
      >
        선택된 장소: {selectedPlaceName}
      </span>
    ) : null}
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
      className="btn btn-circle btn-sm border-0 bg-base-100/95 text-base-content shadow-sm"
      disabled={mapLevel <= MAP_MIN_LEVEL}
      onClick={onZoomIn}
      type="button"
    >
      ＋
    </button>
    <button
      aria-label="지도 축소"
      className="btn btn-circle btn-sm border-0 bg-base-100/95 text-base-content shadow-sm"
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
      <MapStatusHud focusCenter={focusCenter} mapLevel={mapLevel} selectedPlaceName={focusedPlace?.name ?? null} />
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
                className="mt-2 inline-flex min-w-max rounded-full bg-base-100/95 px-3 py-1 text-xs font-semibold text-slate-800 shadow"
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

export const MapPane = ({
  places,
  selectedPlaceId,
  mapLevel,
  onMapLevelChange,
  onMarkerSelect,
}: MapPaneProps) => {
  const { status } = useKakaoScript()
  const mapRef = useRef<HTMLDivElement | null>(null)
  const kakaoMapRef = useRef<KakaoMapInstance | null>(null)
  const markerRefs = useRef<KakaoMarkerInstance[]>([])
  const overlayRefs = useRef<KakaoOverlayInstance[]>([])
  const zoomControlRef = useRef<unknown | null>(null)
  const visiblePlaces = useMemo(
    () => places.filter(hasCoordinates),
    [places],
  )
  const focusedPlace = visiblePlaces.find((place) => place.id === selectedPlaceId) ?? null
  const focusCenter = focusedPlace
    ? { latitude: focusedPlace.latitude, longitude: focusedPlace.longitude }
    : MAP_INITIAL_CENTER

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

  if (status !== 'ready') {
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

  return (
    <div className="relative z-0 h-full min-h-screen overflow-hidden bg-slate-900" data-testid="map-canvas">
      <MapStatusHud focusCenter={focusCenter} mapLevel={mapLevel} selectedPlaceName={focusedPlace?.name ?? null} />
      <div className="h-full min-h-screen" ref={mapRef} />
    </div>
  )
}
