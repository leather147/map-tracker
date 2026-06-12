"use client"

import { useStore } from "@/lib/store"
import { MapPanel } from "@/components/panels/map-panel"
import { ObjectsPanel } from "@/components/panels/objects-panel"
import { HistoryPanel } from "@/components/panels/history-panel"
import { GeofencesPanel } from "@/components/panels/geofences-panel"
import { SettingsPanel } from "@/components/panels/settings-panel"

export function PanelContent() {
  const { activePanel } = useStore()

  const panel = (() => {
    switch (activePanel) {
      case "objects":
        return <ObjectsPanel />
      case "history":
        return <HistoryPanel />
      case "geofences":
        return <GeofencesPanel />
      case "settings":
        return <SettingsPanel />
      case "map":
      default:
        return <MapPanel />
    }
  })()

  // re-mount on panel change to trigger a smooth fade/slide entrance
  return (
    <div key={activePanel} className="h-full animate-fade-in">
      {panel}
    </div>
  )
}
