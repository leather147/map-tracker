"use client"

import { useState } from "react"
import { Layers, Car, Bus, Route, Tag, Building2, Check } from "lucide-react"
import { useStore } from "@/lib/store"
import type { MapLayer } from "@/lib/types"
import { cn } from "@/lib/utils"

const LAYER_META: { id: MapLayer; label: string; icon: React.ReactNode }[] = [
  { id: "traffic", label: "Пробки", icon: <Car className="size-4" /> },
  { id: "transport", label: "Транспорт", icon: <Bus className="size-4" /> },
  { id: "roads", label: "Дороги", icon: <Route className="size-4" /> },
  { id: "labels", label: "Подписи", icon: <Tag className="size-4" /> },
  { id: "buildings", label: "Здания", icon: <Building2 className="size-4" /> },
]

export function LayersControl() {
  const { layers, toggleLayer } = useStore()
  const [open, setOpen] = useState(false)
  const activeCount = Object.values(layers).filter(Boolean).length

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Слои карты"
        aria-expanded={open}
        className={cn(
          "glass grid size-10 place-items-center rounded-lg text-foreground transition-all hover:bg-accent active:scale-90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "text-primary-foreground",
        )}
        style={open ? { background: "var(--grad-primary)", boxShadow: "var(--glow-primary)" } : {}}
      >
        <Layers className="size-5" />
        <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-warm text-[10px] font-bold text-warm-foreground">
          {activeCount}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="glass-strong absolute right-0 top-12 z-40 w-52 origin-top-right animate-panel-in rounded-xl p-1.5 text-popover-foreground">
            <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Слои карты</p>
            {LAYER_META.map((l) => {
              const on = layers[l.id]
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleLayer(l.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2.5">
                    <span className={cn("text-muted-foreground", on && "text-primary")}>{l.icon}</span>
                    {l.label}
                  </span>
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-full border border-border transition-colors",
                      on && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {on && <Check className="size-3" />}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
