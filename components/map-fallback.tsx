"use client"

import { useMemo } from "react"
import { useStore } from "@/lib/store"
import { BeaconMarker } from "@/components/beacon-marker"
import { SPB_ROUTE } from "@/lib/geo"
import type { LatLng } from "@/lib/types"

// Bounding box around central Saint Petersburg for the stylized projection
const BOUNDS = { minLat: 59.92, maxLat: 59.96, minLng: 30.28, maxLng: 30.38 }

function project([lat, lng]: LatLng, w: number, h: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * w
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * h
  return { x, y }
}

export function MapFallback() {
  const { settings, position, layers, zoom, rotationMode, heading } = useStore()

  // logical canvas size; scaled by zoom relative to base zoom 13
  const w = 1000
  const h = 1000
  const scale = Math.pow(1.18, zoom - 13)

  const beacon = useMemo(() => project(position, w, h), [position])
  const routePts = useMemo(() => SPB_ROUTE.map((p) => project(p, w, h)), [])

  const rotation = rotationMode === "movement" ? -heading : 0

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "#0c0a12" }}>
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: w,
          height: h,
          transform: `translate(-50%, -50%) translate(${(w / 2 - beacon.x) * 0}px, 0px) scale(${scale}) rotate(${rotation}deg)`,
          transition: "transform 350ms ease",
        }}
      >
        <svg viewBox={`0 0 ${w} ${h}`} className="size-full" aria-label="Стилизованная карта Санкт-Петербурга">
          {/* water blocks */}
          <rect x="0" y="0" width={w} height="180" fill="#171526" />
          <rect x="0" y="0" width="150" height={h} fill="#171526" />

          {/* building blocks */}
          {layers.buildings &&
            Array.from({ length: 56 }).map((_, i) => {
              const col = i % 8
              const row = Math.floor(i / 8)
              return (
                <rect
                  key={i}
                  x={120 + col * 110 + ((row % 2) * 18)}
                  y={210 + row * 115}
                  width={78}
                  height={70}
                  rx={6}
                  fill="#15131f"
                  stroke="#221d33"
                  strokeWidth={1}
                />
              )
            })}

          {/* road grid */}
          {layers.roads && (
            <g stroke="#241f36" strokeWidth={6} fill="none">
              {Array.from({ length: 9 }).map((_, i) => (
                <line key={`v${i}`} x1={110 + i * 110} y1={180} x2={110 + i * 110} y2={h} />
              ))}
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={`h${i}`} x1={150} y1={195 + i * 115} x2={w} y2={195 + i * 115} />
              ))}
            </g>
          )}

          {/* a primary avenue (Nevsky-like) */}
          {layers.roads && (
            <line
              x1={150}
              y1={760}
              x2={w}
              y2={300}
              className="stroke-warm/50"
              strokeWidth={12}
              strokeLinecap="round"
            />
          )}

          {/* traffic overlay */}
          {layers.traffic && (
            <line
              x1={150}
              y1={760}
              x2={w}
              y2={300}
              className="stroke-beacon/60"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray="18 10"
            />
          )}

          {/* beacon route trail */}
          <polyline
            points={routePts.map((p) => `${p.x},${p.y}`).join(" ")}
            className="fill-none stroke-primary/60"
            strokeWidth={4}
            strokeDasharray="10 8"
            strokeLinecap="round"
          />

          {/* labels */}
          {layers.labels && (
            <>
              <text x="180" y="120" fill="#5b5570" fontSize="22">
                р. Нева
              </text>
              <text x="560" y="540" fill="#5b5570" fontSize="20" transform="rotate(-26 560 540)">
                Невский проспект
              </text>
            </>
          )}
        </svg>

        {/* beacon overlay, counter-rotated so the marker stays upright */}
        {settings.visible && (
          <div
            className="absolute"
            style={{
              left: beacon.x,
              top: beacon.y,
              transform: `rotate(${-rotation}deg)`,
            }}
          >
            <BeaconMarker x={0} y={0} />
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
        Демо-карта · добавьте ключ Yandex Maps для реальной карты
      </div>
    </div>
  )
}
