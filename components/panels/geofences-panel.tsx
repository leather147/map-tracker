"use client"

import { Plus, Trash2, Crosshair } from "lucide-react"
import { useStore } from "@/lib/store"
import { PanelHeader } from "@/components/panels/panel-header"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import type { Geofence } from "@/lib/types"
import { cn } from "@/lib/utils"

export function GeofencesPanel() {
  const { geofences, addGeofence, updateGeofence, removeGeofence, requestCenter, setActivePanel, insideGeofenceIds } =
    useStore()

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="Геозоны"
        subtitle={`${geofences.filter((g) => g.active).length} активны из ${geofences.length}`}
        action={
          <button
            type="button"
            onClick={addGeofence}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            Добавить
          </button>
        }
      />
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          {geofences.map((g) => (
            <GeofenceCard
              key={g.id}
              g={g}
              inside={insideGeofenceIds.includes(g.id)}
              onChange={(patch) => updateGeofence(g.id, patch)}
              onRemove={() => removeGeofence(g.id)}
              onLocate={() => {
                requestCenter(g.center)
                setActivePanel("map")
              }}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function GeofenceCard({
  g,
  inside,
  onChange,
  onRemove,
  onLocate,
}: {
  g: Geofence
  inside: boolean
  onChange: (patch: Partial<Geofence>) => void
  onRemove: () => void
  onLocate: () => void
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-3", inside ? "border-primary/50" : "border-border")}>
      <div className="flex items-center gap-2">
        <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
        <Input
          value={g.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-8 flex-1 border-transparent bg-transparent px-1 text-sm font-semibold focus-visible:border-border"
          aria-label="Название геозоны"
        />
        {inside && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
            внутри
          </span>
        )}
        <Switch checked={g.active} onCheckedChange={(v) => onChange({ active: v })} aria-label="Активна" />
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Радиус</span>
          <span className="tabular-nums text-foreground">{g.radius} м</span>
        </div>
        <Slider
          value={[g.radius]}
          min={100}
          max={3000}
          step={50}
          onValueChange={(v) => onChange({ radius: Array.isArray(v) ? v[0] : v })}
          aria-label="Радиус геозоны"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <label className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-2">
          <span>Вход</span>
          <Switch checked={g.alertOnEnter} onCheckedChange={(v) => onChange({ alertOnEnter: v })} aria-label="Оповещать при входе" />
        </label>
        <label className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-2">
          <span>Выход</span>
          <Switch checked={g.alertOnExit} onCheckedChange={(v) => onChange({ alertOnExit: v })} aria-label="Оповещать при выходе" />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onLocate}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs font-medium transition-colors hover:bg-accent"
        >
          <Crosshair className="size-3.5 text-primary" />
          На карте
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Удалить геозону"
          className="grid size-8 place-items-center rounded-lg border border-border text-beacon transition-colors hover:bg-beacon/10"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}
