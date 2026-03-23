import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
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

const LEVEL_LABEL_THRESHOLD = 3
const MARKER_VISIBILITY_THRESHOLD = 4
const MAP_LOADING_COPY = '지도를 불러오는 중이에요.'
const MAP_FAILURE_TITLE = '지도를 불러오지 못했어요.'
const MAP_FAILURE_BODY = '네트워크 상태를 확인한 뒤 다시 시도해주세요.'
const MAP_RETRY_LABEL = '다시 시도'

type PlaceWithCoordinates = PlaceSummary & {
  latitude: number
  longitude: number
}

type MapZoomPresentation = {
  hitTargetSize: number
  labelFontSize: number
  labelFontWeight: number
  labelGap: number
  labelStrokeWidth: number
  markerSize: number
}

const hasCoordinates = (place: PlaceSummary): place is PlaceWithCoordinates =>
  place.latitude !== undefined && place.longitude !== undefined

const MAP_LABEL_MAX_WIDTH_PX = 160
const markerPalette: Record<PlaceType, { fill: string; label: string }> = {
  restaurant: {
    fill: '#5862FB',
    label: '식당',
  },
  cafe: {
    fill: '#5862FB',
    label: '카페',
  },
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const getMapZoomPresentation = (mapLevel: number): MapZoomPresentation => {
  if (mapLevel <= 1) {
    return {
      hitTargetSize: 56,
      labelFontSize: 14,
      labelFontWeight: 500,
      labelGap: -32,
      labelStrokeWidth: 3,
      markerSize: 48,
    }
  }

  if (mapLevel === 2) {
    return {
      hitTargetSize: 52,
      labelFontSize: 13,
      labelFontWeight: 500,
      labelGap: -30,
      labelStrokeWidth: 3,
      markerSize: 44,
    }
  }

  if (mapLevel === 3) {
    return {
      hitTargetSize: 40,
      labelFontSize: 12,
      labelFontWeight: 500,
      labelGap: -28,
      labelStrokeWidth: 2,
      markerSize: 32,
    }
  }

  if (mapLevel === 4) {
    return {
      hitTargetSize: 36,
      labelFontSize: 8,
      labelFontWeight: 400,
      labelGap: -24,
      labelStrokeWidth: 2,
      markerSize: 28,
    }
  }

  if (mapLevel === 5) {
    return {
      hitTargetSize: 24,
      labelFontSize: 8,
      labelFontWeight: 400,
      labelGap: -5,
      labelStrokeWidth: 1,
      markerSize: 16,
    }
  }

  return {
    hitTargetSize: 32,
    labelFontSize: 9,
    labelFontWeight: 400,
    labelGap: -1.5,
    labelStrokeWidth: 1,
    markerSize: 18,
  }
}

const getFallbackMarkerLabelOffset = ({ hitTargetSize, labelGap, markerSize }: Pick<MapZoomPresentation, 'hitTargetSize' | 'labelGap' | 'markerSize'>) =>
  hitTargetSize / 2 + markerSize / 2 + labelGap

const getKakaoMarkerLabelOffset = ({ labelGap, markerSize }: Pick<MapZoomPresentation, 'labelGap' | 'markerSize'>) =>
  markerSize / 2 + labelGap

const getMarkerLabelStyle = ({ labelFontSize, labelFontWeight, labelStrokeWidth }: Pick<MapZoomPresentation, 'labelFontSize' | 'labelFontWeight' | 'labelStrokeWidth'>): CSSProperties => ({
  color: '#5862FB',
  fontFamily: 'Pretendard, sans-serif',
  fontSize: `${labelFontSize}px`,
  fontWeight: labelFontWeight,
  lineHeight: '100%',
  maxWidth: `${MAP_LABEL_MAX_WIDTH_PX}px`,
  overflow: 'hidden',
  textAlign: 'center',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  WebkitTextStroke: `${labelStrokeWidth}px #FFFFFF`,
  paintOrder: 'stroke fill',
})

const applyMarkerLabelStyle = (element: HTMLElement, presentation: Pick<MapZoomPresentation, 'labelFontSize' | 'labelFontWeight' | 'labelStrokeWidth'>) => {
  const style = getMarkerLabelStyle(presentation)

  Object.assign(element.style, {
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: String(style.fontWeight),
    letterSpacing: style.letterSpacing,
    lineHeight: String(style.lineHeight),
    maxWidth: style.maxWidth,
    overflow: style.overflow,
    textAlign: String(style.textAlign),
    textOverflow: style.textOverflow,
    whiteSpace: style.whiteSpace,
    pointerEvents: 'none',
    userSelect: 'none',
  })
  element.style.setProperty('-webkit-text-stroke', String(style.WebkitTextStroke))
  element.style.setProperty('paint-order', String(style.paintOrder))
}

const createMapLabelElement = (name: string, testId: string, presentation: MapZoomPresentation) => {
  const wrapper = document.createElement('div')
  wrapper.setAttribute('aria-hidden', 'true')
  wrapper.style.display = 'flex'
  wrapper.style.flexDirection = 'column'
  wrapper.style.alignItems = 'center'
  wrapper.style.pointerEvents = 'none'
  wrapper.style.paddingTop = `${getKakaoMarkerLabelOffset(presentation)}px`

  const label = document.createElement('div')
  label.dataset.testid = testId
  label.textContent = name
  applyMarkerLabelStyle(label, presentation)

  wrapper.appendChild(label)

  return wrapper
}

const toMarkerImageSource = (placeType: PlaceType) => {
  const palette = markerPalette[placeType]

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <g clip-path="url(#clip0_marker)">
        <g filter="url(#filter0_d_marker)">
          <circle cx="12" cy="12" r="8" fill="${palette.fill}"/>
          <circle cx="12" cy="12" r="7" stroke="white" stroke-width="2"/>
        </g>
        <circle cx="12" cy="12" r="2" fill="white"/>
      </g>
      <defs>
        <filter id="filter0_d_marker" x="-1" y="-1" width="26" height="26" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_marker"/>
          <feOffset/>
          <feGaussianBlur stdDeviation="2"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_marker"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_marker" result="shape"/>
        </filter>
        <clipPath id="clip0_marker">
          <rect width="24" height="24" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  `)}`
}

const MapMarkerLabel = ({
  name,
  presentation,
  testId,
}: {
  name: string
  presentation: Pick<MapZoomPresentation, 'labelFontSize' | 'labelFontWeight' | 'labelStrokeWidth'>
  testId: string
}) => (
  <span
    aria-hidden="true"
    className="pointer-events-none block select-none"
    data-testid={testId}
    style={getMarkerLabelStyle(presentation)}
  >
    {name}
  </span>
)

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
  const zoomPresentation = useMemo(
    () => getMapZoomPresentation(mapLevel),
    [mapLevel],
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
      {mapLevel <= MARKER_VISIBILITY_THRESHOLD ? visiblePlaces.map((place) => {
        const isSelected = selectedPlaceId === place.id
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
            className="absolute -translate-x-1/2 -translate-y-1/2"
            key={place.id}
            style={{
              height: `${zoomPresentation.hitTargetSize}px`,
              left: `${left}%`,
              top: `${top}%`,
              width: `${zoomPresentation.hitTargetSize}px`,
              zIndex: isSelected ? 6 : 5,
            }}
          >
            <button
              aria-label={`${place.name} 마커`}
              className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full"
              data-marker-variant="user-added"
              data-marker-type={place.place_type}
              data-testid={`map-marker-${place.id}`}
              onClick={() => onMarkerSelect(place.id)}
              type="button"
            >
              <img
                alt=""
                aria-hidden="true"
                data-testid={`map-marker-glyph-${place.id}`}
                src={toMarkerImageSource(place.place_type)}
                style={{
                  height: `${zoomPresentation.markerSize}px`,
                  width: `${zoomPresentation.markerSize}px`,
                }}
              />
              <span className="sr-only">{markerPalette[place.place_type].label}</span>
            </button>
            {mapLevel <= LEVEL_LABEL_THRESHOLD ? (
              <div
                className="absolute left-1/2 flex -translate-x-1/2 justify-center"
                data-testid={`map-label-anchor-${place.id}`}
                style={{ top: `${getFallbackMarkerLabelOffset(zoomPresentation)}px` }}
              >
                <MapMarkerLabel
                  name={place.name}
                  presentation={zoomPresentation}
                  testId={`map-label-${place.id}`}
                />
              </div>
            ) : null}
          </div>
        )
      }) : null}
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
  const zoomPresentation = useMemo(
    () => getMapZoomPresentation(mapLevel),
    [mapLevel],
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

    if (mapLevel > MARKER_VISIBILITY_THRESHOLD) {
      return
    }

    visiblePlaces.forEach((place) => {
      const position = new kakao.maps.LatLng(place.latitude, place.longitude)
      const markerImage = new kakao.maps.MarkerImage(
        toMarkerImageSource(place.place_type),
        new kakao.maps.Size(zoomPresentation.markerSize, zoomPresentation.markerSize),
      )
      const marker = new kakao.maps.Marker({
        position,
        image: markerImage,
        map,
      })

      kakao.maps.event.addListener(marker, 'click', () => onMarkerSelect(place.id))
      markerRefs.current.push(marker)

      if (mapLevel <= LEVEL_LABEL_THRESHOLD) {
        const label = createMapLabelElement(place.name, `map-label-${place.id}`, zoomPresentation)

        const overlay = new kakao.maps.CustomOverlay({
          content: label,
          map,
          position,
          xAnchor: 0.5,
          yAnchor: 0,
        })

        overlayRefs.current.push(overlay)
      }
    })
  }, [mapLevel, onMarkerSelect, visiblePlaces, zoomPresentation])

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
