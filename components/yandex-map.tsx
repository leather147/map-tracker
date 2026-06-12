"use client"

import { useEffect, useRef, useState } from "react"
import { useStore } from "@/lib/store"
import { BeaconMarker } from "@/components/beacon-marker"
import { MapFallback } from "@/components/map-fallback"
import type { LatLng } from "@/lib/types"

const API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY

declare global {
  interface Window {
    ymaps?: any
  }
}

let scriptPromise: Promise<any> | null = null

function loadYmaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject("no window")
  if (window.ymaps?.Map) return Promise.resolve(window.ymaps)
  if (!API_KEY) return Promise.reject("no-key")
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${API_KEY}&lang=ru_RU`
    script.async = true
    script.onload = () => {
      window.ymaps.ready(() => resolve(window.ymaps))
    }
    script.onerror = () => reject("load-error")
    document.head.appendChild(script)
  })
  return scriptPromise
}

type Status = "loading" | "ready" | "fallback"

export function YandexMap() {
  const {
    theme,
    layers,
    zoom,
    setZoom,
    rotationMode,
    heading,
    position,
    settings,
    centerRequest,
    objects,
  } = useStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const trafficRef = useRef<any>(null)
  const projChangeRef = useRef(false)
  const positionRef = useRef<LatLng>(position)
  positionRef.current = position
  const [status, setStatus] = useState<Status>(API_KEY ? "loading" : "fallback")
  // pixel position of beacon for the HTML overlay marker
  const [pixel, setPixel] = useState<{ x: number; y: number } | null>(null)

  // init map
  useEffect(() => {
    let cancelled = false
    loadYmaps()
      .then((ymaps) => {
        if (cancelled || !containerRef.current || mapRef.current) return
        const map = new ymaps.Map(
          containerRef.current,
          {
            center: position,
            zoom,
            controls: [],
          },
          { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true },
        )
        mapRef.current = map
        trafficRef.current = new ymaps.control.TrafficControl({ shown: false })
        map.controls.add(trafficRef.current)

        const sync = () => {
          if (cancelled) return
          setZoom(map.getZoom())
          updatePixel()
        }
        map.events.add(["boundschange", "actionend"], sync)
        setStatus("ready")
        requestAnimationFrame(updatePixel)
      })
      .catch(() => {
        if (!cancelled) setStatus("fallback")
      })
    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updatePixel = () => {
    const map = mapRef.current
    if (!map) return
    try {
      const projection = map.options.get("projection")
      const z = map.getZoom()
      const globalPx = projection.toGlobalPixels(positionRef.current, z)
      const centerPx = map.getGlobalPixelCenter()
      const size = map.container.getSize() // [width, height]
      setPixel({
        x: size[0] / 2 + (globalPx[0] - centerPx[0]),
        y: size[1] / 2 + (globalPx[1] - centerPx[1]),
      })
    } catch {
      setPixel(null)
    }
  }

  // theme -> map tiles
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.options.set("theme", theme === "dark" ? "dark" : "light")
  }, [theme, status])

  // layers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const type = layers.transport ? "yandex#publicMap" : "yandex#map"
    map.setType(type)
    if (trafficRef.current) {
      if (layers.traffic) trafficRef.current.showTraffic()
      else trafficRef.current.hideTraffic()
    }
  }, [layers, status])

  // external zoom control
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getZoom() !== zoom) map.setZoom(zoom, { duration: 200 })
  }, [zoom])

  // rotation
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const targetAzimuth = rotationMode === "movement" ? (heading * Math.PI) / 180 : 0
    try {
      map.options.set("azimuth", targetAzimuth)
    } catch {
      /* projection without rotation support */
    }
  }, [rotationMode, heading])

  // beacon position -> recenter softly only on follow, always reproject marker
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    updatePixel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position])

  // center request
  useEffect(() => {
    const map = mapRef.current
    if (!map || !centerRequest) return
    map.panTo(centerRequest.position, { duration: 400 }).then(updatePixel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerRequest])

  if (status === "fallback") {
    return <MapFallback />
  }

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" aria-label="Карта Санкт-Петербурга" />
      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-background">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm">Загрузка карты…</span>
          </div>
        </div>
      )}
      {settings.visible && pixel && (
        <BeaconMarker x={pixel.x} y={pixel.y} />
      )}
    </div>
  )
}
