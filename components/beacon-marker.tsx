"use client"

import { useState } from "react"
import { Navigation, Gauge, MapPin, BatteryMedium, X } from "lucide-react"
import { useStore } from "@/lib/store"
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
  const { settings, position, speedKmh, street, moving } = useStore()
  const [open, setOpen] = useState(false)

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={
        centered
          ? { left: 0, top: 0, transform: "translate(-50%, -50%)" }
          : { left: x, top: y, transform: "translate(-50%, -50%)" }
      }
    >
      {/* outer slow pulse ring */}
      {settings.pulseEnabled && (
        <span
          className="beacon-ring absolute left-1/2 top-1/2 -z-10 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "var(--beacon)", opacity: 0.35 }}
          aria-hidden
        />
      )}
      {/* inner faster pulse ring */}
      {settings.pulseEnabled && (
        <span
          className="beacon-ring absolute left-1/2 top-1/2 -z-10 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "var(--beacon)",
            opacity: 0.55,
            animationDuration: `${Math.max(600, (settings.pulseDurationMs ?? 1800) * 0.6)}ms`,
          }}
          aria-hidden
        />
      )}

      {/* dot */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        className={cn(
          "pointer-events-auto relative grid size-5 cursor-pointer place-items-center rounded-full transition-transform",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beacon",
          moving && "scale-110",
        )}
        style={{
          background:
            "radial-gradient(circle at 35% 30%, oklch(0.78 0.22 27), oklch(0.52 0.28 27) 60%, oklch(0.4 0.26 27))",
          boxShadow: [
            "0 0 0 2px oklch(0.95 0.01 27 / 0.9)",
            "0 0 8px 2px oklch(0.62 0.26 27 / 0.85)",
            "0 0 18px 5px oklch(0.62 0.26 27 / 0.55)",
            "0 0 36px 10px oklch(0.62 0.26 27 / 0.3)",
          ].join(", "),
        }}
        aria-label="Маяк: показать информацию о передвижении"
        aria-expanded={open}
      >
        {/* shine highlight */}
        <span
          className="absolute left-[22%] top-[14%] size-[32%] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.75) 0%, transparent 70%)",
          }}
          aria-hidden
        />
        {/* center pip */}
        <span className="size-1.5 rounded-full bg-white/90 shadow-sm" />
      </button>

      {/* popup */}
      {open && (
        <div
          className="glass-strong pointer-events-auto absolute bottom-full left-1/2 mb-3 w-60 origin-bottom -translate-x-1/2 animate-panel-in rounded-xl p-3 text-popover-foreground"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-beacon" />
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
            <Row
              icon={<Gauge className="size-3.5 text-warm" />}
              label="Скорость"
              value={`${speedKmh} км/ч`}
            />
            <Row
              icon={<Navigation className="size-3.5 text-primary" />}
              label="Координаты"
              value={`${position[0].toFixed(4)}, ${position[1].toFixed(4)}`}
            />
            <Row
              icon={<BatteryMedium className="size-3.5 text-warm" />}
              label="Статус"
              value={moving ? "В движении" : "На месте"}
            />
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
