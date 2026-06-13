"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useStore } from "@/lib/store"
import { YandexMap } from "@/components/yandex-map"
import { TopBar } from "@/components/top-bar"
import { BottomNav } from "@/components/bottom-nav"
import { DesktopRail } from "@/components/desktop-rail"
import { MapControls } from "@/components/map-controls"
import { LayersControl } from "@/components/layers-control"
import { ScaleBar } from "@/components/scale-bar"
import { PanelContent } from "@/components/panel-content"
import { cn } from "@/lib/utils"

export function AppShell() {
  const { activePanel, settings } = useStore()
  const panelWidth = settings.panelWidth ?? 340
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* Map base layer */}
      <div className="absolute inset-0">
        <YandexMap />
      </div>

      {/* ============ DESKTOP (lg+) ============ */}
      <div className="pointer-events-none absolute inset-0 hidden lg:flex lg:flex-row">

        {/* left rail — always visible */}
        <div className="pointer-events-auto h-full shrink-0">
          <DesktopRail />
        </div>

        {/* collapsible content panel — animates width 340px ↔ 0 */}
        <div
          className={cn(
            "pointer-events-auto h-full shrink-0 overflow-hidden",
            "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            collapsed ? "w-0" : `w-[${panelWidth}px]`,
          )}
          style={collapsed ? {} : { width: panelWidth }}
        >
          {/* inner div keeps fixed width so content never wraps during transition */}
          <div
            className="glass-strong h-full overflow-hidden border-y-0 border-l-0 rounded-r-xl animate-fade-in"
            style={{ width: panelWidth }}
          >
            <PanelContent />
          </div>
        </div>

        {/* toggle tab — rounded on right side only, "curving into" the panel */}
        <div className="pointer-events-auto self-center">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"}
            title={collapsed ? "Развернуть панель" : "Свернуть панель"}
            className={cn(
              "glass pointer-events-auto flex h-14 w-5 items-center justify-center",
              "rounded-r-xl border-l-0",
              "transition-all duration-200 hover:bg-primary/10 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {collapsed
              ? <ChevronRight className="size-3 text-muted-foreground" />
              : <ChevronLeft className="size-3 text-muted-foreground" />}
          </button>
        </div>

        {/* spacer so map is interactive to the right */}
        <div className="flex-1" />

        {/* top-right overlay: top bar + layers */}
        <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-3">
          <div className="pointer-events-auto">
            <TopBar />
          </div>
          <div className="pointer-events-auto">
            <LayersControl />
          </div>
        </div>

        {/* right map controls */}
        <div className="pointer-events-auto absolute bottom-8 right-4">
          <MapControls />
        </div>

        {/* scale bottom-right */}
        <div className="pointer-events-none absolute bottom-4 right-20">
          <ScaleBar />
        </div>
      </div>

      {/* ============ MOBILE / TABLET (<lg) ============ */}
      <div className="pointer-events-none absolute inset-0 lg:hidden">
        {/* top bar */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="pointer-events-auto">
            <TopBar />
          </div>
          <div className="pointer-events-auto">
            <LayersControl />
          </div>
        </div>

        {/* right map controls */}
        <div className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2">
          <MapControls />
        </div>

        {/* scale */}
        <div className="pointer-events-none absolute bottom-44 left-3">
          <ScaleBar />
        </div>

        {/* bottom sheet panel */}
        {activePanel !== "map" ? (
          <div className="glass-strong pointer-events-auto absolute inset-x-0 bottom-[84px] mx-2 max-h-[55dvh] animate-sheet-up overflow-hidden rounded-xl">
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border/60" />
            <div className="h-[52dvh]">
              <PanelContent />
            </div>
          </div>
        ) : (
          <MobileMapStrip />
        )}

        {/* bottom nav */}
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 p-2">
          <BottomNav />
        </div>
      </div>
    </div>
  )
}

function MobileMapStrip() {
  const { settings, speedKmh, street, moving, moveOnce } = useStore()
  if (!settings.visible) return null
  return (
    <div className="glass pointer-events-auto absolute inset-x-0 bottom-[84px] mx-2 flex animate-sheet-up items-center gap-3 rounded-xl px-3 py-2.5">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-lg"
        style={{ background: "var(--grad-primary)", boxShadow: "var(--glow-beacon)" }}
      >
        <span className="size-2.5 rounded-full bg-white/90" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          Маяк-01 · {moving ? "в движении" : "на месте"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {street} · {speedKmh} км/ч
        </p>
      </div>
      <button
        type="button"
        onClick={moveOnce}
        className="btn-gradient shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all active:scale-90"
      >
        Сместить
      </button>
    </div>
  )
}
