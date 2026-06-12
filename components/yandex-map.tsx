"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useStore } from "@/lib/store"
import { BeaconMarker } from "@/components/beacon-marker"
import { cn } from "@/lib/utils"
import type { LatLng } from "@/lib/types"

const API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY

declare global {
  interface Window {
    ymaps?: any
  }
}

let scriptPromise: Promise<void> | null = null

function loadYmaps21(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject("ssr")
  if (window.ymaps?.ready) return new Promise<void>((res) => window.ymaps.ready(res))
  if (!API_KEY) return Promise.reject("no-key")
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${API_KEY}&lang=ru_RU`
    script.async = true
    script.onload = () => window.ymaps.ready(resolve)
    script.onerror = () => { scriptPromise = null; reject("load-error") }
    document.head.appendChild(script)
  })
  return scriptPromise
}

type Status = "loading" | "ready" | "error"

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
    theme,
  } = useStore()

  const containerRef  = useRef<HTMLDivElement>(null)
  const wrapperRef    = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<any>(null)
  const placemarkRef  = useRef<any>(null)
  const trafficRef    = useRef<any>(null)

  // Stable refs so event handlers never capture stale values
  const placeBeaconRef = useRef(placeBeacon)
  placeBeaconRef.current = placeBeacon
  const setZoomRef = useRef(setZoom)
  setZoomRef.current = setZoom
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  const [status, setStatus] = useState<Status>(API_KEY ? "loading" : "error")
  const [markerContainer, setMarkerContainer] = useState<HTMLElement | null>(null)

  // ── Init v2.1 map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!API_KEY) return
    let cancelled = false

    loadYmaps21()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return
        const ymaps = window.ymaps

        const map = new ymaps.Map(
          containerRef.current,
          { center: [position[0], position[1]], zoom, controls: [] },
          { suppressMapOpenBlock: true, copyrightUseMapMargin: false },
        )
        mapRef.current = map

        // Disable Yandex promo balloon
        try { map.copyrights.togglePromo(false) } catch {}

        // Sync zoom from user interaction
        map.events.add("boundschange", () => {
          if (cancelled) return
          const z = Math.round(map.getZoom())
          if (z !== zoomRef.current) setZoomRef.current(z)
        })

        // Click on map → place beacon at that coordinate
        map.events.add("click", (e: any) => {
          if (cancelled) return
          const coords: [number, number] = e.get("coords")
          placeBeaconRef.current([coords[0], coords[1]])
        })

        // Invisible placemark so we can read geo→pixel position
        const placemark = new ymaps.Placemark(
          [position[0], position[1]],
          {},
          { visible: false },
        )
        placemarkRef.current = placemark
        map.geoObjects.add(placemark)

        // Overlay div that we position via geo→pixel projection
        const markerEl = document.createElement("div")
        markerEl.style.cssText =
          "position:absolute;top:0;left:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:500;"
        containerRef.current.style.position = "relative"
        containerRef.current.appendChild(markerEl)

        if (!cancelled) {
          setMarkerContainer(markerEl)
          setStatus("ready")
        }
      })
      .catch(() => { if (!cancelled) setStatus("error") })

    return () => {
      cancelled = true
      if (mapRef.current) {
        try { mapRef.current.destroy() } catch {}
        mapRef.current = null
        placemarkRef.current = null
        trafficRef.current = null
        scriptPromise = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Traffic layer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    const ymaps = window.ymaps
    if (!map || !ymaps || status !== "ready") return

    if (layers.traffic) {
      if (!trafficRef.current) {
        trafficRef.current = new ymaps.control.TrafficControl({ shown: true })
        map.controls.add(trafficRef.current)
        trafficRef.current.showTraffic()
      }
    } else {
      if (trafficRef.current) {
        try {
          trafficRef.current.hideTraffic()
          map.controls.remove(trafficRef.current)
        } catch {}
        trafficRef.current = null
      }
    }
  }, [layers.traffic, status])

  // ── External zoom buttons ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (Math.round(map.getZoom()) !== zoom) map.setZoom(zoom, { duration: 200 })
  }, [zoom])

  // ── Center request ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !centerRequest) return
    map.setCenter([centerRequest.position[0], centerRequest.position[1]], zoom, { duration: 400 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerRequest])

  // ── Sync placemark & marker overlay position ───────────────────────────────
  useEffect(() => {
    if (placemarkRef.current) {
      try { placemarkRef.current.geometry.setCoordinates([position[0], position[1]]) } catch {}
    }
  }, [position])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !markerContainer) return

    function updatePos() {
      if (!map || !markerContainer) return
      try {
        const px = map.converter.geoToPage([position[0], position[1]])
        if (!px) return
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        // px is in page coordinates; subtract container offset to get local coords
        const mapEl = map.container.getElement()
        const mapRect = mapEl?.getBoundingClientRect() ?? rect
        markerContainer.style.transform = `translate(${px[0] - mapRect.left}px, ${px[1] - mapRect.top}px)`
      } catch {}
    }

    updatePos()
    map.events.add("actiontick",    updatePos)
    map.events.add("boundschange",  updatePos)
    return () => {
      map.events.remove("actiontick",   updatePos)
      map.events.remove("boundschange", updatePos)
    }
  }, [position, markerContainer, status])

  // ── Render ─────────────────────────────────────────────────────────────────
  // The outer wrapper overflows by CROP_PX on all sides so the Yandex logo
  // strip at the bottom AND the injected traffic/branding buttons are clipped.
  const CROP = 52
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ borderRadius: "inherit" }}
    >
      {/* negative margin exposes extra map area that gets clipped by overflow:hidden above */}
      <div
        ref={wrapperRef}
        className="absolute"
        style={{ inset: `-${CROP}px` }}
      >
        <div
          ref={containerRef}
          className={cn(
            "absolute inset-0",
            // CSS dark theme: invert(90%) hue-rotate(180deg) turns the light
            // Yandex tiles into a dark map without any filter on our UI layer.
            theme === "dark" && status === "ready" && "map-dark-filter",
          )}
          aria-label="Карта Санкт-Петербурга"
        />
      </div>

      {/* Loading state */}
      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-background">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm">Загрузка карты…</span>
          </div>
        </div>
      )}

      {/* Error / no key */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/80 text-sm text-muted-foreground">
          <span>Карта недоступна</span>
          <span className="text-xs opacity-70">Проверьте API-ключ Яндекс Карт</span>
        </div>
      )}

      {/* Beacon marker — rendered into the positioned overlay div */}
      {markerContainer && settings.visible && status === "ready" &&
        createPortal(<BeaconMarker centered />, markerContainer)}
    </div>
  )
}
