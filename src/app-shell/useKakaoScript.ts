import { useCallback, useLayoutEffect, useState } from 'react'

export type KakaoMapInstance = {
  getLevel: () => number
  panTo: (latLng: unknown) => void
  setLevel: (level: number) => void
}

export type KakaoMarkerInstance = {
  setMap: (map: KakaoMapInstance | null) => void
}

export type KakaoOverlayInstance = {
  setMap: (map: KakaoMapInstance | null) => void
}

export type KakaoNamespace = {
  maps: {
    load: (callback: () => void) => void
    Map: new (container: HTMLElement, options: { center: unknown; level: number }) => KakaoMapInstance
    LatLng: new (latitude: number, longitude: number) => unknown
    Marker: new (options: { image: unknown; map: KakaoMapInstance; position: unknown }) => KakaoMarkerInstance
    MarkerImage: new (source: string, size: unknown) => unknown
    Size: new (width: number, height: number) => unknown
    CustomOverlay: new (options: { content: HTMLElement; map: KakaoMapInstance; position: unknown; xAnchor?: number; yAnchor?: number }) => KakaoOverlayInstance
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

export type KakaoScriptStatus = 'fallback' | 'loading' | 'ready' | 'unavailable' | 'error'

const KAKAO_SCRIPT_SELECTOR = 'script[data-kakao-map-sdk="true"]'

const hasUsableKakaoRuntime = () =>
  typeof window.kakao?.maps?.load === 'function'
  && typeof window.kakao?.maps?.Map === 'function'
  && typeof window.kakao?.maps?.LatLng === 'function'
  && typeof window.kakao?.maps?.Marker === 'function'
  && typeof window.kakao?.maps?.MarkerImage === 'function'
  && typeof window.kakao?.maps?.Size === 'function'
  && typeof window.kakao?.maps?.CustomOverlay === 'function'
  && typeof window.kakao?.maps?.event?.addListener === 'function'

const hasKakaoLoader = () =>
  typeof window.kakao?.maps?.load === 'function'

export const useKakaoScript = () => {
  const appKey = import.meta.env.PUBLIC_KAKAO_MAP_APP_KEY
  const isTestMode = import.meta.env.MODE === 'test'
  const [retryKey, setRetryKey] = useState(0)
  const hasExistingRuntime = hasUsableKakaoRuntime()
  const hasLoader = hasKakaoLoader()
  const canUseRuntime = hasLoader || (Boolean(appKey) && !isTestMode)
  const [runtimeStatus, setRuntimeStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useLayoutEffect(() => {
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
