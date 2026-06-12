"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useStore } from "@/lib/store"
import { BeaconMarker } from "@/components/beacon-marker"
import { MapFallback } from "@/components/map-fallback"
import type { LatLng } from "@/lib/types"

const API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY

declare global {
  interface Window {
    ymaps3?: any
  }
}

let scriptPromise: Promise<any> | null = null

// Loads the Yandex Maps JS API v3. v3 supports a real, native dark theme,
// so we no longer apply any CSS filter on top of the tiles.
function loadYmaps3(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject("no window")
  if (window.ymaps3?.ready) return window.ymaps3.ready.then(() => window.ymaps3)
  if (!API_KEY) return Promise.reject("no-key")
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${API_KEY}&lang=ru_RU`
    script.async = true
    script.onload = () => {
      window.ymaps3.ready.then(() => resolve(window.ymaps3)).catch(reject)
    }
    script.onerror = () => reject("load-error")
    document.head.appendChild(script)
  })
  return scriptPromise
}

type Status = "loading" | "ready" | "fallback"

// store order is [lat, lng]; Yandex v3 uses [lng, lat]
const toYmaps = (p: LatLng): [number, number] => [p[1], p[0]]
const fromYmaps = (p: number[]): LatLng => [p[1], p[0]]

export function YandexMap() {
  const {
    layers,
    zoom,
    setZoom,
    rotationMode,
    heading,
    position,
    settings,
    centerRequest,
    placeBeacon,
  } = useStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const trafficRef = useRef<any>(null)
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  // stable callbacks for the map listener
  const placeRef = useRef(placeBeacon)
  placeRef.current = placeBeacon
  const setZoomRef = useRef(setZoom)
  setZoomRef.current = setZoom

  const [status, setStatus] = useState<Status>(API_KEY ? "loading" : "fallback")
  // DOM element hosting the React beacon marker (rendered via portal)
  const [markerEl, setMarkerEl] = useState<HTMLElement | null>(null)

  // init map
  useEffect(() => {
    let cancelled = false
    loadYmaps3()
      .then((ymaps3) => {
        if (cancelled || !containerRef.current || mapRef.current) return
        const {
          YMap,
          YMapDefaultSchemeLayer,
          YMapDefaultFeaturesLayer,
          YMapListener,
          YMapMarker,
        } = ymaps3

        const map = new YMap(containerRef.current, {
          location: { center: toYmaps(position), zoom },
          // native dark theme straight from the API — no overlay filters
          theme: "dark",
          behaviors: ["drag", "pinchZoom", "scrollZoom", "dblClick", "mouseRotate"],
        })
        mapRef.current = map

        map.addChild(new YMapDefaultSchemeLayer({ theme: "dark" }))
        map.addChild(new YMapDefaultFeaturesLayer())

        // beacon marker (hosts a React-rendered element via portal)
        const el = document.createElement("div")
        el.style.pointerEvents = "none"
        const marker = new YMapMarker({ coordinates: toYmaps(position), zIndex: 1000 }, el)
        markerRef.current = marker
        map.addChild(marker)
        if (!cancelled) setMarkerEl(el)

        // sync zoom on user interaction + place beacon on click
        const listener = new YMapListener({
          layer: "any",
          onUpdate: ({ location }: any) => {
            if (cancelled || !location) return
            const z = Math.round(location.zoom)
            if (z !== zoomRef.current) setZoomRef.current(z)
          },
          onClick: (_object: any, event: any) => {
            if (cancelled || !event?.coordinates) return
            placeRef.current(fromYmaps(event.coordinates))
          },
        })
        map.addChild(listener)

        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("fallback")
      })
    return () => {
      cancelled = true
      if (mapRef.current) {
        try {
          mapRef.current.destroy()
        } catch {
          /* noop */
        }
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // traffic layer toggle (best-effort dynamic import; degrades gracefully)
  useEffect(() => {
    const map = mapRef.current
    const ymaps3 = window.ymaps3
    if (!map || !ymaps3) return
    let cancelled = false

    async function apply() {
      if (layers.traffic) {
        if (!trafficRef.current) {
          try {
            const pkg = await ymaps3.import("@yandex/ymaps3-traffic@0.0.1")
            if (cancelled) return
            trafficRef.current = new pkg.YMapTrafficLayer()
            map.addChild(trafficRef.current)
          } catch {
            /* traffic package unavailable — ignore */
          }
        }
      } else if (trafficRef.current) {
        try {
          map.removeChild(trafficRef.current)
        } catch {
          /* noop */
        }
        trafficRef.current = null
      }
    }
    apply()
    return () => {
      cancelled = true
    }
  }, [layers.traffic, status])

  // external zoom control (zoom buttons)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (Math.round(map.zoom) !== zoom) {
      map.setLocation({ zoom, duration: 200 })
    }
  }, [zoom])

  // rotation (movement mode rotates the camera by heading)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const azimuth = rotationMode === "movement" ? (heading * Math.PI) / 180 : 0
    try {
      map.setCamera({ azimuth, duration: 300 })
    } catch {
      /* noop */
    }
  }, [rotationMode, heading])

  // beacon position -> move marker
  useEffect(() => {
    const marker = markerRef.current
    if (marker) {
      try {
        marker.update({ coordinates: toYmaps(position) })
      } catch {
        /* noop */
      }
    }
  }, [position])

  // center request (LocateFixed button)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !centerRequest) return
    try {
      map.setLocation({ center: toYmaps(centerRequest.position), duration: 400 })
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerRequest])

  if (status === "fallback") {
    return <MapFallback />
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" aria-label="Карта Санкт-Петербурга" />
      {status === "loading" && (
        <div className="absolute inset-0 grid animate-fade-in place-items-center bg-background">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm">Загрузка карты…</span>
          </div>
        </div>
      )}
      {settings.visible && markerEl && createPortal(<BeaconMarker centered />, markerEl)}
    </div>
  )
}
