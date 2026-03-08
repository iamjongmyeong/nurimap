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
  const canUseRuntime = Boolean(appKey) && import.meta.env.MODE !== 'test'
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>(() => {
    if (!canUseRuntime) {
      return 'unavailable'
    }

    return window.kakao?.maps ? 'ready' : 'loading'
  })

  useEffect(() => {
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

const MapMetaHud = ({ mapLevel }: { mapLevel: number }) => (
  <div className="absolute inset-x-6 top-6 z-10 flex flex-col gap-3 rounded-3xl bg-base-100/10 p-4 text-white backdrop-blur">
    <div>
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Nurimap</p>
      <h1 className="mt-2 text-2xl font-semibold">내부 장소 지도를 위한 앱 셸</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-200/90">
        Plan 02에서는 Kakao Map과 목록 탐색의 기본 상호작용을 검증합니다.
      </p>
    </div>
    <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-200/90">
      <span className="rounded-full bg-white/10 px-3 py-1" data-testid="map-center">
        중심 좌표: {MAP_INITIAL_CENTER.latitude}, {MAP_INITIAL_CENTER.longitude}
      </span>
      <span className="rounded-full bg-white/10 px-3 py-1" data-testid="map-level">
        level {mapLevel}
      </span>
    </div>
  </div>
)

const FallbackMapPane = ({
  places,
  selectedPlaceId,
  mapLevel,
  onMarkerSelect,
}: Omit<MapPaneProps, 'onMapLevelChange'>) => {
  const visiblePlaces = useMemo(
    () => places.filter(hasCoordinates),
    [places],
  )

  return (
    <div
      aria-label="지도 캔버스"
      className="relative h-full min-h-screen overflow-hidden bg-slate-900"
      data-testid="map-canvas"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,0.25),_transparent_25%),linear-gradient(135deg,_rgba(15,23,42,1)_0%,_rgba(30,41,59,1)_45%,_rgba(59,130,246,0.35)_100%)]" />
      <MapMetaHud mapLevel={mapLevel} />
      {visiblePlaces.map((place) => {
        const palette = markerPalette[place.place_type]
        const top = clamp(
          50 - ((place.latitude ?? MAP_INITIAL_CENTER.latitude) - MAP_INITIAL_CENTER.latitude) * 3500,
          18,
          86,
        )
        const left = clamp(
          50 + ((place.longitude ?? MAP_INITIAL_CENTER.longitude) - MAP_INITIAL_CENTER.longitude) * 8000,
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

  if (status !== 'ready') {
    return (
      <FallbackMapPane
        mapLevel={mapLevel}
        onMarkerSelect={onMarkerSelect}
        places={places}
        selectedPlaceId={selectedPlaceId}
      />
    )
  }

  return (
    <div className="relative h-full min-h-screen overflow-hidden bg-slate-900" data-testid="map-canvas">
      <MapMetaHud mapLevel={mapLevel} />
      <div className="h-full min-h-screen" ref={mapRef} />
    </div>
  )
}
