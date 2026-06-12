"use client"

import { Car, User, Package, Battery, BatteryLow, Crosshair } from "lucide-react"
import { useStore } from "@/lib/store"
import { PanelHeader } from "@/components/panels/panel-header"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TrackedObject } from "@/lib/types"
import { cn } from "@/lib/utils"

const TYPE_ICON = {
  vehicle: Car,
  person: User,
  asset: Package,
}

export function ObjectsPanel() {
  const { objects, requestCenter, setActivePanel } = useStore()

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Объекты" subtitle={`${objects.length} устройства на карте`} />
      <ScrollArea className="flex-1">
        <ul className="space-y-2 p-3">
          {objects.map((obj) => (
            <ObjectRow
              key={obj.id}
              obj={obj}
              onLocate={() => {
                requestCenter(obj.position)
                setActivePanel("map")
              }}
            />
          ))}
        </ul>
      </ScrollArea>
    </div>
  )
}

function ObjectRow({ obj, onLocate }: { obj: TrackedObject; onLocate: () => void }) {
  const Icon = TYPE_ICON[obj.type]
  const lowBattery = obj.battery <= 20
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          obj.online ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{obj.name}</p>
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              obj.online ? "bg-warm" : "bg-muted-foreground",
            )}
            title={obj.online ? "В сети" : "Не в сети"}
          />
        </div>
        <p className="truncate text-xs text-muted-foreground">{obj.street}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span
          className={cn(
            "flex items-center gap-1 text-xs tabular-nums",
            lowBattery ? "text-beacon" : "text-muted-foreground",
          )}
        >
          {lowBattery ? <BatteryLow className="size-3.5" /> : <Battery className="size-3.5" />}
          {obj.battery}%
        </span>
        <button
          type="button"
          onClick={onLocate}
          aria-label={`Показать ${obj.name} на карте`}
          className="grid size-7 place-items-center rounded-lg border border-border text-primary transition-colors hover:bg-accent"
        >
          <Crosshair className="size-4" />
        </button>
      </div>
    </li>
  )
}
