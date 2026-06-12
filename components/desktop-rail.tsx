"use client"

import { Radar } from "lucide-react"
import { useStore } from "@/lib/store"
import { NAV_ITEMS } from "@/components/bottom-nav"
import { cn } from "@/lib/utils"

export function DesktopRail() {
  const { activePanel, setActivePanel } = useStore()

  return (
    <div className="glass-strong flex h-full flex-col items-center gap-1 border-y-0 border-l-0 border-r border-border/60 px-1.5 py-3">
      <span
        className="mb-2 grid size-10 place-items-center rounded-2xl"
        style={{ background: "var(--grad-primary)", boxShadow: "var(--glow-primary)" }}
      >
        <Radar className="size-5 text-primary-foreground" />
      </span>
      {NAV_ITEMS.map((item) => {
        const active = activePanel === item.id
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActivePanel(item.id)}
            aria-current={active ? "page" : undefined}
            title={item.label}
            style={active ? { background: "var(--grad-primary)", boxShadow: "var(--glow-primary)" } : {}}
            className={cn(
              "flex w-14 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium transition-all active:scale-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
