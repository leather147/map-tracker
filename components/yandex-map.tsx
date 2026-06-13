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

  // DOM node that Yandex renders the custom placemark into, so we can portal BeaconMarker there
  const [markerHost, setMarkerHost] = useState<HTMLElement | null>(null)

  // Stable refs so event handlers never capture stale values
  const placeBeaconRef = useRef(placeBeacon)
  placeBeaconRef.current = placeBeacon
  const setZoomRef = useRef(setZoom)
  setZoomRef.current = setZoom
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  const [status, setStatus] = useState<Status>(API_KEY ? "loading" : "error")
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

        // Custom HTML placemark — Yandex handles all geo→pixel projection internally.
        // We create a host <div>, portal our React BeaconMarker into it, and pass
        // it to ymaps as an HTML layout so it always sits exactly on the coordinate.
        const host = document.createElement("div")
        host.style.cssText = "position:relative;width:0;height:0;overflow:visible;"

        const Layout = ymaps.templateLayoutFactory.createClass(
          '<div id="beacon-layout-host" style="position:relative;width:0;height:0;overflow:visible;"></div>',
          {
            build() {
              Layout.superclass.build.call(this)
              const el = this.getParentElement().querySelector("#beacon-layout-host")
              if (el && !cancelled) setMarkerHost(el as HTMLElement)
            },
            clear() {
              setMarkerHost(null)
              Layout.superclass.clear.call(this)
            },
          },
        )

        const placemark = new ymaps.Placemark(
          [position[0], position[1]],
          {},
          {
            iconLayout: Layout,
            iconShape: { type: "Circle", coordinates: [0, 0], radius: 14 },
          },
        )
        placemarkRef.current = placemark
        map.geoObjects.add(placemark)

        if (!cancelled) setStatus("ready")
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

  // ── Labels layer — hide/show map text via injected style ──────────────────
  // Yandex Maps 2.1 renders labels as a separate tile layer in its own pane.
  // We use version-agnostic attribute selectors so the rule survives SDK
  // patch updates that change the minor version in class names.
  useEffect(() => {
    const id = "ymaps-labels-override"
    let el = document.getElementById(id) as HTMLStyleElement | null

    if (!layers.labels) {
      if (!el) {
        el = document.createElement("style")
        el.id = id
        document.head.appendChild(el)
      }
      el.textContent = `
        /* Version-agnostic: target any Yandex pane that carries place labels */
        [class*="ymaps"][class*="places-pane"],
        [class*="ymaps"][class*="places-pane"] *,
        [class*="ymaps"][class*="labels"],
        [class*="ymaps"][class*="labels"] * {
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `
    } else {
      el?.remove()
    }
    return () => {
      if (layers.labels) document.getElementById("ymaps-labels-override")?.remove()
    }
  }, [layers.labels])
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

  // ── Sync placemark coordinate when position changes ────────────────────────
  useEffect(() => {
    if (placemarkRef.current) {
      try { placemarkRef.current.geometry.setCoordinates([position[0], position[1]]) } catch {}
    }
  }, [position])

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

      {/* Beacon marker — portalled into Yandex's own placemark DOM node so
          the library handles geo→pixel positioning with no manual math */}
      {markerHost && settings.visible && status === "ready" &&
        createPortal(<BeaconMarker centered />, markerHost)}
    </div>
  )
}
