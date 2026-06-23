export type LatLng = [number, number]

export type ThemeMode = "light" | "dark"

export type MapLayer = "traffic" | "transport" | "roads" | "labels" | "buildings"

export type RotationMode = "north" | "movement"

export type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW"

export type PanelId = "map" | "objects" | "history" | "geofences" | "settings"

export type RouteBuildStatus = "idle" | "building" | "ready" | "error"

export type AlarmSoundId =
  | "beep"
  | "double-beep"
  | "scanner"
  | "siren"
  | "urgent"
  | "evacuation"
  | "radar"
  | "warning"

export interface HistoryEntry {
  id: string
  at: number
  position: LatLng
  speedKmh: number
  street: string
  event: "move" | "start" | "stop" | "geofence-enter" | "geofence-exit" | "manual" | "route"
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
  routeMode: boolean
  routeLoop: boolean
  scheduledMove: boolean
  scheduleAt: string
  scenarioEnabled: boolean
  activeScenarioId: string | null
  pulseEnabled: boolean
  pulseDurationMs: number
  pulseScale: number
  soundEnabled: boolean
  soundVolume: number
  alarmSound: AlarmSoundId
  continuousAlarm: boolean
  mapHue: number
  beaconColor: string
  markerSize: number
  panelWidth: number
}
