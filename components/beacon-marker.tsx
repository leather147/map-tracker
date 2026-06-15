"use client"

import { useEffect, useRef, useState } from "react"
import { Navigation, Gauge, MapPin, BatteryMedium, X, TriangleAlert } from "lucide-react"
import { useStore } from "@/lib/store"
import { playAlarm } from "@/lib/sound"
import { cn } from "@/lib/utils"

export function BeaconMarker({
  x,
  y,
  centered = false,
}: {
  x?: number
  y?: number
  centered?: boolean
}) {
  const { settings, position, speedKmh, street, moving, theme } = useStore()
  const [open, setOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastLeaving, setToastLeaving] = useState(false)
  const [moveKey, setMoveKey] = useState(0)
  const prevMoving = useRef(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detect each new move event and trigger toast + pulse restart.
  useEffect(() => {
    if (moving && !prevMoving.current) {
      setMoveKey((k) => k + 1)
      setToastLeaving(false)
      setShowToast(true)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => {
        setToastLeaving(true)
        toastTimer.current = setTimeout(() => setShowToast(false), 300)
      }, 1800)
    }
    prevMoving.current = moving
  }, [moving])

  // Continuous beacon alarm: repeats exactly on the pulse cycle, even when the point is static.
  useEffect(() => {
    if (!settings.visible || !settings.soundEnabled || !settings.continuousAlarm) return

    const duration = Math.max(600, settings.pulseDurationMs ?? 1800)
    playAlarm(settings.alarmSound, settings.soundVolume)
    const id = window.setInterval(() => {
      playAlarm(settings.alarmSound, settings.soundVolume)
    }, duration)

    return () => window.clearInterval(id)
  }, [
    settings.visible,
    settings.soundEnabled,
    settings.continuousAlarm,
    settings.alarmSound,
    settings.soundVolume,
    settings.pulseDurationMs,
  ])

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const color = settings.beaconColor ?? "#ef4444"

  const counterFilter =
    theme === "dark"
      ? `invert(100%) hue-rotate(calc(180deg - ${settings.mapHue}deg))`
      : "none"

  return (
    <div
      className="pointer-events-none absolute z-20 size-7"
      style={
        centered
          ? { left: 0, top: 0, transform: "translate(-50%, -50%)" }
          : { left: x, top: y, transform: "translate(-50%, -50%)" }
      }
    >
      {showToast && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap",
            toastLeaving ? "beacon-toast-out" : "beacon-toast-in",
          )}
          aria-live="polite"
          role="status"
        >
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-xl"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              boxShadow: "0 0 18px 4px rgba(124,58,237,0.55), 0 4px 16px rgba(0,0,0,0.35)",
            }}
          >
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            Точка переместилась
          </div>
        </div>
      )}

      {settings.pulseEnabled && (
        <span
          key={`ring-outer-${moveKey}`}
          className="absolute left-1/2 top-1/2 -z-10 size-7 -translate-x-1/2 -translate-y-1/2"
          aria-hidden
        >
          <span
            className="beacon-ring block size-full rounded-full"
            style={{ background: color, opacity: 0.35, filter: counterFilter }}
          />
        </span>
      )}
      {settings.pulseEnabled && (
        <span
          key={`ring-inner-${moveKey}`}
          className="absolute left-1/2 top-1/2 -z-10 size-5 -translate-x-1/2 -translate-y-1/2"
          aria-hidden
        >
          <span
            className="beacon-ring block size-full rounded-full"
            style={{
              background: color,
              opacity: 0.55,
              animationDuration: `${Math.max(600, (settings.pulseDurationMs ?? 1800) * 0.6)}ms`,
              filter: counterFilter,
            }}
          />
        </span>
      )}

      <button
        key={moveKey}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        className={cn(
          "pointer-events-auto absolute left-1/2 top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full",
          "transition-transform hover:scale-105 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beacon",
        )}
        style={{
          background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${color} 60%, white), ${color} 60%, color-mix(in srgb, ${color} 80%, black))`,
          boxShadow: [
            `0 0 0 2px color-mix(in srgb, ${color} 20%, white)`,
            `0 0 8px 2px color-mix(in srgb, ${color} 85%, transparent)`,
            `0 0 18px 5px color-mix(in srgb, ${color} 55%, transparent)`,
            `0 0 36px 10px color-mix(in srgb, ${color} 30%, transparent)`,
          ].join(", "),
          filter: counterFilter,
          willChange: "transform",
        }}
        aria-label="Маяк: показать информацию о передвижении"
        aria-expanded={open}
      >
        <span
          className="absolute left-[22%] top-[14%] size-[32%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.75) 0%, transparent 70%)" }}
          aria-hidden
        />
        <span className="size-1.5 rounded-full bg-white/90 shadow-sm" />
      </button>

      {open && (
        <div
          className="glass-strong pointer-events-auto absolute bottom-full left-1/2 mb-3 w-60 origin-bottom -translate-x-1/2 animate-panel-in rounded-xl p-3 text-popover-foreground"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: color }} />
              <span className="text-sm font-semibold">Маяк-01</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Закрыть"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <Row icon={<MapPin className="size-3.5 text-primary" />} label="Улица" value={street} />
            <Row icon={<Gauge className="size-3.5 text-warm" />} label="Скорость" value={`${speedKmh} км/ч`} />
            <Row icon={<Navigation className="size-3.5 text-primary" />} label="Координаты" value={`${position[0].toFixed(4)}, ${position[1].toFixed(4)}`} />
            <Row icon={<BatteryMedium className="size-3.5 text-warm" />} label="Статус" value={moving ? "В движении" : "На месте"} />
          </div>

          <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-popover" />
        </div>
      )}
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}
