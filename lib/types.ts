export type LatLng = [number, number]
export type ThemeMode = "light" | "dark"
export type MapLayer = "traffic" | "transport" | "roads" | "labels" | "buildings"
export type RotationMode = "north" | "movement"
export type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW"
export type MovementSoundKind = "beep" | "soft" | "radar" | "alarm" | "radio"
export type PanelId = "map" | "objects" | "history" | "geofences" | "settings"

export interface HistoryEntry {
  id: string
  at: number
  position: LatLng
  speedKmh: number
  street: string
  event: "move" | "start" | "stop" | "geofence-enter" | "geofence-exit" | "manual"
  note?: string
}

export interface Geofence {
  id: string
  name: string
  center: LatLng
  radius: number
  active: boolean
  color: string
  alertOnEnter: boolean
  alertOnExit: boolean
}

export interface TrackedObject {
  id: string
  name: string
  type: "vehicle" | "person" | "asset"
  online: boolean
  battery: number
  position: LatLng
  street: string
}

export interface ScenarioStep {
  id: string
  delayMs: number
  stepMeters: number
  direction: Direction | null
}

export interface Scenario {
  id: string
  name: string
  loop: boolean
  steps: ScenarioStep[]
}

export interface BeaconSettings {
  visible: boolean
  autoMove: boolean
  intervalMs: number
  stepMeters: number
  direction: Direction
  followRoute: boolean
  scheduledMove: boolean
  scheduleAt: string
  scenarioEnabled: boolean
  activeScenarioId: string | null
  pulseEnabled: boolean
  pulseDurationMs: number
  pulseScale: number
  soundEnabled: boolean
  soundVolume: number
  movementSoundKind?: MovementSoundKind
  movementSoundDurationMs?: number
  mapHue: number
  beaconColor: string
  panelWidth: number
}
