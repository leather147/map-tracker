"use client"

import { BeaconMarker } from "@/components/beacon-marker"
import { useStore } from "@/lib/store"
import type { LatLng } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

const API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY
const ROUTE_COLOR = "#ef4444"

declare global { interface Window { ymaps?: any } }

let scriptPromise: Promise<void> | null = null

function loadYmaps21(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject("ssr")
  if (window.ymaps?.ready) return new Promise<void>((res) => window.ymaps.ready(res))
  if (!API_KEY) return Promise.reject("no-key")
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-yandex-maps-api='2.1']")
    if (existing) {
      existing.addEventListener("load", () => window.ymaps.ready(resolve), { once: true })
      existing.addEventListener("error", () => { scriptPromise = null; reject("load-error") }, { once: true })
      return
    }
    const script = document.createElement("script")
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${API_KEY}&lang=ru_RU`
    script.async = true
    script.dataset.yandexMapsApi = "2.1"
    script.onload = () => window.ymaps.ready(resolve)
    script.onerror = () => { scriptPromise = null; reject("load-error") }
    document.head.appendChild(script)
  })
  return scriptPromise
}

type Status = "loading" | "ready" | "error"

function collectCoordinates(value: any, out: LatLng[]) {
  if (!Array.isArray(value)) return
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    out.push([value[0], value[1]])
    return
  }
  for (const item of value) collectCoordinates(item, out)
}

function readGeometryCoordinates(target: any, out: LatLng[]) {
  try { collectCoordinates(target?.geometry?.getCoordinates?.(), out) } catch {}
}

function getRouteCoordinates(route: any): LatLng[] {
  const coords: LatLng[] = []
  readGeometryCoordinates(route, coords)
  try {
    route.getPaths?.().each((path: any) => {
      readGeometryCoordinates(path, coords)
      try { path.getSegments?.().each((segment: any) => readGeometryCoordinates(segment, coords)) } catch {}
    })
  } catch {}

  const cleaned: LatLng[] = []
  for (const point of coords) {
    const prev = cleaned[cleaned.length - 1]
    if (!prev || Math.abs(prev[0] - point[0]) > 0.000001 || Math.abs(prev[1] - point[1]) > 0.000001) cleaned.push(point)
  }
  return cleaned
}

function pushLeg(result: LatLng[], from: LatLng, to: LatLng) {
  if (result.length === 0) result.push(from)
  const last = result[result.length - 1]
  if (Math.abs(last[0] - from[0]) > 0.000001 || Math.abs(last[1] - from[1]) > 0.000001) result.push(from)
  result.push(to)
}

async function buildSegmentedRoadRoute(ymaps: any, points: LatLng[]): Promise<LatLng[]> {
  const result: LatLng[] = []
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i]
    const to = points[i + 1]
    try {
      const segmentRoute = await ymaps.route([from, to], { routingMode: "auto" })
      const segmentCoords = getRouteCoordinates(segmentRoute)
      if (segmentCoords.length >= 2) {
        result.push(...(result.length === 0 ? segmentCoords : segmentCoords.slice(1)))
        continue
      }
    } catch {}
    pushLeg(result, from, to)
  }
  return result
}

export function YandexMap() {
  const {
    layers,
    zoom,
    setZoom,
    position,
    settings,
    centerRequest,
    placeBeacon,
    theme,
    routePoints,
    routeStatus,
    setRoutePathFromMap,
    setRouteBuildState,
  } = useStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const placemarkRef = useRef<any>(null)
  const trafficRef = useRef<any>(null)
  const routeLineRef = useRef<any>(null)
  const destinationRef = useRef<any>(null)
  const [markerHost, setMarkerHost] = useState<HTMLElement | null>(null)

  const placeBeaconRef = useRef(placeBeacon)
  placeBeaconRef.current = placeBeacon
  const setZoomRef = useRef(setZoom)
  setZoomRef.current = setZoom
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const setRoutePathFromMapRef = useRef(setRoutePathFromMap)
  setRoutePathFromMapRef.current = setRoutePathFromMap
  const setRouteBuildStateRef = useRef(setRouteBuildState)
  setRouteBuildStateRef.current = setRouteBuildState

  const [status, setStatus] = useState<Status>(API_KEY ? "loading" : "error")

  useEffect(() => {
    if (!API_KEY) return
    let cancelled = false
    loadYmaps21()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return
        const ymaps = window.ymaps
        const map = new ymaps.Map(containerRef.current, { center: [position[0], position[1]], zoom, controls: [] }, { suppressMapOpenBlock: true, copyrightUseMapMargin: false })
        mapRef.current = map
        try { map.copyrights.togglePromo(false) } catch {}
        map.events.add("boundschange", () => {
          if (cancelled) return
          const z = Math.round(map.getZoom())
          if (z !== zoomRef.current) setZoomRef.current(z)
        })
        map.events.add("click", (e: any) => {
          if (cancelled) return
          const coords: [number, number] = e.get("coords")
          placeBeaconRef.current([coords[0], coords[1]])
        })
        const Layout = ymaps.templateLayoutFactory.createClass('<div id="beacon-layout-host" style="position:relative;width:0;height:0;overflow:visible;"></div>', {
          build() {
            Layout.superclass.build.call(this)
            const el = this.getParentElement().querySelector("#beacon-layout-host")
            if (el && !cancelled) setMarkerHost(el as HTMLElement)
          },
          clear() {
            setMarkerHost(null)
            Layout.superclass.clear.call(this)
          },
        })
        const placemark = new ymaps.Placemark([position[0], position[1]], {}, { iconLayout: Layout, iconShape: { type: "Circle", coordinates: [0, 0], radius: 14 } })
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
        routeLineRef.current = null
        destinationRef.current = null
        scriptPromise = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    } else if (trafficRef.current) {
      try { trafficRef.current.hideTraffic(); map.controls.remove(trafficRef.current) } catch {}
      trafficRef.current = null
    }
  }, [layers.traffic, status])

  useEffect(() => {
    const id = "ymaps-labels-override"
    let el = document.getElementById(id) as HTMLStyleElement | null
    if (!layers.labels) {
      if (!el) {
        el = document.createElement("style")
        el.id = id
        document.head.appendChild(el)
      }
      el.textContent = `[class*="ymaps"][class*="places-pane"],[class*="ymaps"][class*="places-pane"] *,[class*="ymaps"][class*="labels"],[class*="ymaps"][class*="labels"] *{opacity:0!important;pointer-events:none!important;}`
    } else {
      el?.remove()
    }
    return () => { if (layers.labels) document.getElementById("ymaps-labels-override")?.remove() }
  }, [layers.labels])

  useEffect(() => {
    const map = mapRef.current
    const ymaps = window.ymaps
    if (!map || !ymaps || status !== "ready") return

    const clearRoute = () => {
      if (routeLineRef.current) { try { map.geoObjects.remove(routeLineRef.current) } catch {}; routeLineRef.current = null }
      if (destinationRef.current) { try { map.geoObjects.remove(destinationRef.current) } catch {}; destinationRef.current = null }
    }

    clearRoute()
    if (!settings.routeMode) {
      setRouteBuildStateRef.current("idle")
      return clearRoute
    }
    if (routePoints.length < 2) {
      setRouteBuildStateRef.current("error", "Need at least two route points")
      return clearRoute
    }

    let cancelled = false
    setRouteBuildStateRef.current("building")
    buildSegmentedRoadRoute(ymaps, routePoints)
      .then((coords) => {
        if (cancelled) return
        if (coords.length < 2) {
          setRouteBuildStateRef.current("error", "No route geometry")
          return
        }
        const routeLine = new ymaps.Polyline(coords, { hintContent: "KZ SPB" }, { strokeColor: ROUTE_COLOR, strokeOpacity: 0.96, strokeWidth: 4, strokeStyle: "solid" })
        routeLineRef.current = routeLine
        map.geoObjects.add(routeLine)
        const destination = routePoints[routePoints.length - 1]
        const destinationMarker = new ymaps.Placemark(destination, { hintContent: "SPB" }, { preset: "islands#redDotIcon", iconColor: ROUTE_COLOR })
        destinationRef.current = destinationMarker
        map.geoObjects.add(destinationMarker)
        setRoutePathFromMapRef.current(coords)
        try {
          const bounds = routeLine.geometry.getBounds?.()
          if (bounds) map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 64, duration: 450 })
        } catch {}
      })
      .catch(() => {
        if (!cancelled) setRouteBuildStateRef.current("error", "No route geometry")
      })

    return () => { cancelled = true; clearRoute() }
  }, [routePoints, settings.routeMode, status])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (Math.round(map.getZoom()) !== zoom) map.setZoom(zoom, { duration: 200 })
  }, [zoom])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== "ready") return
    const fit = () => { try { map.container.fitToViewport() } catch {} }
    window.addEventListener("resize", fit)
    document.addEventListener("fullscreenchange", fit)
    const timeoutId = window.setTimeout(fit, 250)
    return () => {
      window.removeEventListener("resize", fit)
      document.removeEventListener("fullscreenchange", fit)
      window.clearTimeout(timeoutId)
    }
  }, [status])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !centerRequest) return
    map.setCenter([centerRequest.position[0], centerRequest.position[1]], zoom, { duration: 400 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerRequest])

  useEffect(() => {
    if (placemarkRef.current) {
      try { placemarkRef.current.geometry.setCoordinates([position[0], position[1]]) } catch {}
    }
  }, [position])

  const CROP = 52
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: "inherit" }}>
      <div ref={wrapperRef} className="absolute" style={{ inset: `-${CROP}px` }}>
        <div ref={containerRef} className={cn("absolute inset-0", theme === "dark" && status === "ready" && "map-dark-filter")} aria-label="Route map" />
      </div>

      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-background">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm">Loading map...</span>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/80 text-sm text-muted-foreground">
          <span>Map unavailable</span>
          <span className="text-xs opacity-70">Check Yandex Maps API key</span>
        </div>
      )}

      {status === "ready" && settings.routeMode && routeStatus === "building" && (
        <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-card/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow backdrop-blur">
          Building route...
        </div>
      )}

      {markerHost && settings.visible && status === "ready" && createPortal(<BeaconMarker centered />, markerHost)}
    </div>
  )
}
