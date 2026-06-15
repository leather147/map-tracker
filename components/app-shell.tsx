"use client"

import { useEffect, useRef, useState } from "react"
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

const MOBILE_NAV_HEIGHT = 84
const FULLSCREEN_DRAG_THRESHOLD = 34

export function AppShell() {
  const { activePanel, settings } = useStore()
  const panelWidth = settings.panelWidth ?? 340
  const railWidth = 68
  const [collapsed, setCollapsed] = useState(false)
  const [mobilePanelExpanded, setMobilePanelExpanded] = useState(false)
  const dragStartYRef = useRef<number | null>(null)
  const mapLeft = collapsed ? railWidth : railWidth + panelWidth

  useEffect(() => {
    const id = window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"))
    }, 330)
    return () => window.clearTimeout(id)
  }, [collapsed, panelWidth])

  useEffect(() => {
    setMobilePanelExpanded(false)
  }, [activePanel])

  useEffect(() => {
    const id = window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"))
    }, 330)
    return () => window.clearTimeout(id)
  }, [mobilePanelExpanded])

  function handleMobileHandlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    dragStartYRef.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleMobileHandlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const startY = dragStartYRef.current
    dragStartYRef.current = null
    if (startY == null) return

    const deltaY = event.clientY - startY
    if (deltaY <= -FULLSCREEN_DRAG_THRESHOLD) {
      setMobilePanelExpanded(true)
    } else if (deltaY >= FULLSCREEN_DRAG_THRESHOLD) {
      setMobilePanelExpanded(false)
    }
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-card/95 text-foreground lg:bg-card/95">
      {/* Desktop map sheet: its left edge moves with the panel and clips the map with soft corners. */}
      <div
        className="absolute bottom-0 right-0 top-0 hidden overflow-hidden rounded-l-[28px] bg-background shadow-[0_24px_80px_-36px_rgb(0_0_0/0.45)] transition-[left,border-radius] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block"
        style={{ left: mapLeft }}
      >
        <YandexMap />
      </div>

      {/* Mobile keeps the map full-bleed. */}
      <div className="absolute inset-0 bg-background lg:hidden">
        <YandexMap />
      </div>

      {/* ============ DESKTOP (lg+) ============ */}
      <div className="pointer-events-none absolute inset-0 hidden lg:flex lg:flex-row">

        {/* left rail — always visible */}
        <div className="pointer-events-auto h-full shrink-0" style={{ width: railWidth }}>
          <DesktopRail />
        </div>

        {/* collapsible content panel — animates width 340px ↔ 0 */}
        <div
          className={cn(
            "pointer-events-auto h-full shrink-0 overflow-visible",
            "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          )}
          style={{ width: collapsed ? 0 : panelWidth }}
        >
          <div
            className={cn(
              "h-full overflow-hidden rounded-r-[28px] bg-card/95 shadow-[18px_0_60px_-34px_rgb(0_0_0/0.5)] backdrop-blur-2xl",
              "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              collapsed ? "-translate-x-4 opacity-0" : "translate-x-0 opacity-100 animate-fade-in",
            )}
            style={{ width: panelWidth }}
          >
            <PanelContent />
          </div>
        </div>

        {/* toggle tab — sits inside the map edge so the panel can return */}
        <div
          className="pointer-events-auto absolute top-1/2 z-20 -translate-y-1/2 transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: mapLeft - 1 }}
        >
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"}
            title={collapsed ? "Развернуть панель" : "Свернуть панель"}
            className={cn(
              "flex h-14 w-6 items-center justify-center rounded-r-2xl bg-card/95 text-muted-foreground shadow-[10px_0_28px_-18px_rgb(0_0_0/0.55)] backdrop-blur-2xl",
              "transition-all duration-200 hover:bg-primary/10 hover:text-foreground active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {collapsed
              ? <ChevronRight className="size-3" />
              : <ChevronLeft className="size-3" />}
          </button>
        </div>

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
          <div
            className={cn(
              "pointer-events-auto absolute inset-x-0 mx-2 overflow-hidden bg-card/95 shadow-xl backdrop-blur-2xl",
              "transition-[bottom,top,max-height,border-radius] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              mobilePanelExpanded
                ? "bottom-[84px] top-0 max-h-none rounded-b-xl rounded-t-none"
                : "bottom-[84px] max-h-[55dvh] rounded-xl",
            )}
          >
            <button
              type="button"
              aria-label={mobilePanelExpanded ? "Свернуть меню" : "Раскрыть меню"}
              title={mobilePanelExpanded ? "Свернуть меню" : "Раскрыть меню"}
              onClick={() => setMobilePanelExpanded((v) => !v)}
              onPointerDown={handleMobileHandlePointerDown}
              onPointerUp={handleMobileHandlePointerUp}
              className="flex w-full touch-none cursor-grab items-center justify-center px-4 pb-2 pt-2.5 active:cursor-grabbing"
            >
              <span className="h-1 w-12 rounded-full bg-primary/35 transition-all group-active:w-16" />
            </button>
            <div
              className={cn(
                "min-h-0 overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                mobilePanelExpanded ? "h-[calc(100dvh-124px)]" : "h-[52dvh]",
              )}
            >
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
    <div className="pointer-events-auto absolute inset-x-0 bottom-[84px] mx-2 flex animate-sheet-up items-center gap-3 rounded-xl bg-card/95 px-3 py-2.5 shadow-lg backdrop-blur-2xl">
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
