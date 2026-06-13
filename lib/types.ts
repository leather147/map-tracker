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
  radius: number // meters
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

// ─── Scenario types ───────────────────────────────────────────────────────────

/** A single step in a movement scenario */
export interface ScenarioStep {
  id: string
  /** Pause before this step fires (ms) */
  delayMs: number
  /** How many meters to move in this step */
  stepMeters: number
  /** Optional fixed direction; null = follow street graph */
  direction: Direction | null
}

/** A named sequence of steps that replace auto-move when active */
export interface Scenario {
  id: string
  name: string
  /** Loop scenario after last step */
  loop: boolean
  steps: ScenarioStep[]
}

// ─────────────────────────────────────────────────────────────────────────────

export interface BeaconSettings {
  visible: boolean
  // movement
  autoMove: boolean
  intervalMs: number // how often it moves (ms) — high-precision, 100–60000
  stepMeters: number // distance per move
  direction: Direction
  followRoute: boolean
  scheduledMove: boolean
  scheduleAt: string // HH:MM
  // scenario
  scenarioEnabled: boolean
  activeScenarioId: string | null
  // pulse
  pulseEnabled: boolean
  pulseDurationMs: number
  pulseScale: number
  // sound
  soundEnabled: boolean
  soundVolume: number
  movementSoundKind: MovementSoundKind
  movementSoundDurationMs: number
  // map
  mapHue: number  // hue-rotate degrees for dark map filter (0–360)
  // beacon appearance
  beaconColor: string  // CSS color string, e.g. "#ef4444"
  // ui
  panelWidth: number   // desktop left panel width in px (240–520)
}
