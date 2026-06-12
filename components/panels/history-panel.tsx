"use client"

import { Navigation, Play, Pause, Hexagon, LogIn, LogOut, Trash2, Crosshair, MapPin } from "lucide-react"
import { useStore } from "@/lib/store"
import { PanelHeader } from "@/components/panels/panel-header"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { HistoryEntry } from "@/lib/types"
import { cn } from "@/lib/utils"

const EVENT_META: Record<
  HistoryEntry["event"],
  { icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  move: { icon: Navigation, tone: "text-primary" },
  start: { icon: Play, tone: "text-warm" },
  stop: { icon: Pause, tone: "text-muted-foreground" },
  "geofence-enter": { icon: LogIn, tone: "text-primary" },
  "geofence-exit": { icon: LogOut, tone: "text-beacon" },
  manual: { icon: MapPin, tone: "text-warm" },
}

function timeFmt(at: number) {
  return new Date(at).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function HistoryPanel() {
  const { history, clearHistory, requestCenter, setActivePanel } = useStore()

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="История"
        subtitle={`${history.length} событий передвижения`}
        action={
          <button
            type="button"
            onClick={clearHistory}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
            Очистить
          </button>
        }
      />
      <ScrollArea className="flex-1">
        {history.length === 0 ? (
          <div className="grid h-40 place-items-center px-6 text-center text-sm text-muted-foreground">
            <div className="space-y-2">
              <Hexagon className="mx-auto size-6 opacity-40" />
              <p>Событий пока нет</p>
            </div>
          </div>
        ) : (
          <ol className="relative space-y-1 p-3">
            {history.map((entry) => {
              const meta = EVENT_META[entry.event]
              const Icon = meta.icon
              return (
                <li
                  key={entry.id}
                  className="group flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent"
                >
                  <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-card", meta.tone)}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{entry.note ?? entry.street}</p>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {timeFmt(entry.at)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.street} · {entry.speedKmh} км/ч ·{" "}
                      {entry.position[0].toFixed(4)}, {entry.position[1].toFixed(4)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      requestCenter(entry.position)
                      setActivePanel("map")
                    }}
                    aria-label="Показать на карте"
                    className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                  >
                    <Crosshair className="size-4" />
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </ScrollArea>
    </div>
  )
}
