"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff, Play, Crosshair, Navigation, Gauge, MapPin, Activity } from "lucide-react"
import { useStore } from "@/lib/store"
import { PanelHeader } from "@/components/panels/panel-header"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

function Sk({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />
}

function MapPanelSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-hidden>
      <div className="flex gap-2">
        <Sk className="h-6 w-24 rounded-full" />
        <Sk className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Sk className="h-[58px] rounded-2xl" />
        <Sk className="h-[58px] rounded-2xl" />
        <Sk className="col-span-2 h-[58px] rounded-2xl" />
        <Sk className="col-span-2 h-[58px] rounded-2xl" />
      </div>
      <Sk className="h-10 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-2">
        <Sk className="h-10 rounded-2xl" />
        <Sk className="h-10 rounded-2xl" />
      </div>
    </div>
  )
}

export function MapPanel() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 700)
    return () => window.clearTimeout(t)
  }, [])

  const {
    settings,
    updateSettings,
    position,
    speedKmh,
    street,
    moving,
    moveOnce,
    requestCenter,
    insideGeofenceIds,
    geofences,
  } = useStore()

  const insideNames = geofences
    .filter((g) => insideGeofenceIds.includes(g.id))
    .map((g) => g.name)

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Маяк-01" subtitle="Текущее состояние объекта" />
      <ScrollArea className="flex-1">
        {!ready ? (
          <MapPanelSkeleton />
        ) : (
          <div className="space-y-4 p-4">
            {/* status pills */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  moving ? "bg-warm/20 text-warm" : "bg-primary/15 text-primary",
                )}
              >
                <span className={cn("size-1.5 rounded-full", moving ? "bg-warm" : "bg-primary")} />
                {moving ? "В движении" : "На месте"}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  settings.visible ? "bg-beacon/15 text-beacon" : "bg-muted text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    settings.visible ? "bg-beacon" : "bg-muted-foreground",
                  )}
                />
                {settings.visible ? "Виден" : "Скрыт"}
              </span>
            </div>

            {/* stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <Stat
                icon={<Gauge className="size-4 text-warm" />}
                label="Скорость"
                value={`${speedKmh} км/ч`}
              />
              <Stat
                icon={<Activity className="size-4 text-primary" />}
                label="Статус"
                value={moving ? "Движется" : "Стоит"}
              />
              <Stat
                icon={<MapPin className="size-4 text-primary" />}
                label="Улица"
                value={street}
                full
              />
              <Stat
                icon={<Navigation className="size-4 text-warm" />}
                label="Координаты"
                value={`${position[0].toFixed(4)}, ${position[1].toFixed(4)}`}
                full
              />
            </div>

            {insideNames.length > 0 && (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                Внутри геозон: {insideNames.join(", ")}
              </div>
            )}

            {/* quick actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={moveOnce}
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-primary-foreground transition-all active:scale-[0.97]"
                style={{
                  background: "var(--grad-primary)",
                  boxShadow: "var(--glow-primary)",
                }}
              >
                <Play className="size-4" />
                Сместить сейчас
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => requestCenter()}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <Crosshair className="size-4 text-primary" />
                  Центр
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings({ visible: !settings.visible })}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                >
                  {settings.visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  {settings.visible ? "Скрыть" : "Показать"}
                </button>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  full,
}: {
  icon: React.ReactNode
  label: string
  value: string
  full?: boolean
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-3", full && "col-span-2")}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}
