"use client"

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type {
  BeaconSettings,
  Geofence,
  HistoryEntry,
  LatLng,
  MapLayer,
  PanelId,
  RotationMode,
  Scenario,
  ScenarioStep,
  ThemeMode,
} from "@/lib/types"
import {
  SPB_CENTER,
  SPB_ROUTE,
  bearingFromDirection,
  distanceMeters,
  moveByDistance,
  nearestNode,
  pickNextNode,
  bearing as calcBearing,
} from "@/lib/geo"
import { playAlarm } from "@/lib/sound"

const SPB_STREETS = [
  "Невский проспект",
  "Дворцовая набережная",
  "Литейный проспект",
  "Садовая улица",
  "Лиговский проспект",
  "набережная реки Фонтанки",
  "Большая Морская улица",
  "площадь Восстания",
  "Малая Конюшенная улица",
  "Гороховая улица",
]

function streetForIndex(i: number): string {
  return SPB_STREETS[i % SPB_STREETS.length]
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

const MIN_INTERVAL_MS = 10_000

const DEFAULT_SETTINGS: BeaconSettings = {
  visible: true,
  autoMove: false,
  intervalMs: MIN_INTERVAL_MS,
  stepMeters: 18,
  direction: "NE",
  followRoute: true,
  scheduledMove: false,
  scheduleAt: "12:00",
  scenarioEnabled: false,
  activeScenarioId: null,
  pulseEnabled: true,
  pulseDurationMs: 1800,
  pulseScale: 3,
  soundEnabled: false,
  soundVolume: 0.4,
  alarmSound: "beep",
  mapHue: 40,
  beaconColor: "#ef4444",
  panelWidth: 340,
}

const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "sc-patrol",
    name: "Патруль",
    loop: true,
    steps: [
      { id: uid(), delayMs: 1000, stepMeters: 20, direction: null },
      { id: uid(), delayMs: 1000, stepMeters: 20, direction: null },
      { id: uid(), delayMs: 3000, stepMeters: 5,  direction: null },
      { id: uid(), delayMs: 1000, stepMeters: 20, direction: null },
      { id: uid(), delayMs: 5000, stepMeters: 0,  direction: null },
    ],
  },
  {
    id: "sc-fast",
    name: "Быстрое движение",
    loop: true,
    steps: [
      { id: uid(), delayMs: 500,  stepMeters: 60, direction: null },
      { id: uid(), delayMs: 500,  stepMeters: 60, direction: null },
      { id: uid(), delayMs: 500,  stepMeters: 60, direction: null },
      { id: uid(), delayMs: 500,  stepMeters: 60, direction: null },
      { id: uid(), delayMs: 2000, stepMeters: 10, direction: null },
    ],
  },
  {
    id: "sc-stop-go",
    name: "Стой-иди",
    loop: true,
    steps: [
      { id: uid(), delayMs: 2000, stepMeters: 30, direction: null },
      { id: uid(), delayMs: 8000, stepMeters: 0,  direction: null },
      { id: uid(), delayMs: 2000, stepMeters: 30, direction: null },
      { id: uid(), delayMs: 8000, stepMeters: 0,  direction: null },
    ],
  },
]

const INITIAL_OBJECTS: TrackedObject[] = [
  {
    id: "beacon-1",
    name: "Маяк-01",
    type: "vehicle",
    online: true,
    battery: 87,
    position: SPB_ROUTE[0],
    street: "Невский проспект",
  },
  {
    id: "beacon-2",
    name: "Курьер-14",
    type: "person",
    online: true,
    battery: 62,
    position: [59.9311, 30.3609],
    street: "Лиговский проспект",
  },
  {
    id: "beacon-3",
    name: "Груз-А7",
    type: "asset",
    online: false,
    battery: 18,
    position: [59.9501, 30.3056],
    street: "Дворцовая набережная",
  },
]

const INITIAL_GEOFENCES: Geofence[] = [
  {
    id: uid(),
    name: "Центр",
    center: [59.9386, 30.3141],
    radius: 1200,
    active: true,
    color: "#a855f7",
    alertOnEnter: true,
    alertOnExit: true,
  },
  {
    id: uid(),
    name: "Площадь Восстания",
    center: [59.9311, 30.3609],
    radius: 600,
    active: false,
    color: "#f59e0b",
    alertOnEnter: true,
    alertOnExit: false,
  },
]

interface StoreValue {
  theme: ThemeMode
  toggleTheme: () => void
  activePanel: PanelId
  setActivePanel: (p: PanelId) => void
  layers: Record<MapLayer, boolean>
  toggleLayer: (l: MapLayer) => void
  zoom: number
  setZoom: (z: number | ((z: number) => number)) => void
  rotationMode: RotationMode
  toggleRotationMode: () => void
  heading: number
  centerRequest: { position: LatLng; nonce: number } | null
  requestCenter: (position?: LatLng) => void
  settings: BeaconSettings
  updateSettings: (patch: Partial<BeaconSettings>) => void
  position: LatLng
  speedKmh: number
  street: string
  moving: boolean
  moveOnce: () => void
  placeBeacon: (pos: LatLng) => void
  objects: TrackedObject[]
  history: HistoryEntry[]
  clearHistory: () => void
  geofences: Geofence[]
  addGeofence: () => void
  updateGeofence: (id: string, patch: Partial<Geofence>) => void
  removeGeofence: (id: string) => void
  insideGeofenceIds: string[]
  scenarios: Scenario[]
  addScenario: () => void
  updateScenario: (id: string, patch: Partial<Omit<Scenario, "id" | "steps">>) => void
  removeScenario: (id: string) => void
  addScenarioStep: (scenarioId: string) => void
  updateScenarioStep: (scenarioId: string, stepId: string, patch: Partial<ScenarioStep>) => void
  removeScenarioStep: (scenarioId: string, stepId: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function useStore(): StoreValue {
  const ctx = use(StoreContext)
  if (!ctx) throw new Error("useStore must be used within BeaconStoreProvider")
  return ctx
}

export function BeaconStoreProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>("dark")
  const [activePanel, setActivePanel] = useState<PanelId>("map")

  const [layers, setLayers] = useState<Record<MapLayer, boolean>>({
    traffic: false,
    transport: false,
    roads: true,
    labels: true,
    buildings: true,
  })
  const [zoom, setZoomState] = useState(13)
  const [rotationMode, setRotationMode] = useState<RotationMode>("north")
  const [heading, setHeading] = useState(0)
  const [centerRequest, setCenterRequest] = useState<StoreValue["centerRequest"]>(null)
  const [settings, setSettings] = useState<BeaconSettings>(DEFAULT_SETTINGS)
  const [position, setPosition] = useState<LatLng>(SPB_ROUTE[0])
  const [speedKmh, setSpeedKmh] = useState(0)
  const [street, setStreet] = useState(SPB_STREETS[0])
  const [moving, setMoving] = useState(false)
  const [objects] = useState<TrackedObject[]>(INITIAL_OBJECTS)
  const [history, setHistory] = useState<HistoryEntry[]>([
    { id: uid(), at: Date.now(), position: SPB_ROUTE[0], speedKmh: 0, street: SPB_STREETS[0], event: "start", note: "Отслеживание запущено" },
  ])
  const [geofences, setGeofences] = useState<Geofence[]>(INITIAL_GEOFENCES)
  const [insideGeofenceIds, setInsideGeofenceIds] = useState<string[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS)

  const stepCountRef = useRef(0)
  const currentNodeRef = useRef(nearestNode(SPB_ROUTE[0]))
  const arrivalBearingRef = useRef(45)
  const settingsRef = useRef(settings)
  const positionRef = useRef(position)
  const insideRef = useRef<string[]>(insideGeofenceIds)
  const geofencesRef = useRef(geofences)
  settingsRef.current = settings
  positionRef.current = position
  insideRef.current = insideGeofenceIds
  geofencesRef.current = geofences

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    root.classList.toggle("light", theme === "light")
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--beacon-pulse-duration", `${settings.pulseDurationMs}ms`)
    root.style.setProperty("--beacon-pulse-scale", String(settings.pulseScale))
    root.style.setProperty("--map-hue", `${settings.mapHue}deg`)
    root.style.setProperty("--beacon-user-color", settings.beaconColor)
  }, [settings.pulseDurationMs, settings.pulseScale, settings.mapHue, settings.beaconColor])

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), [])
  const toggleLayer = useCallback((l: MapLayer) => setLayers((prev) => ({ ...prev, [l]: !prev[l] })), [])
  const setZoom = useCallback((z: number | ((z: number) => number)) => setZoomState((prev) => Math.max(2, Math.min(19, Math.round(typeof z === "function" ? z(prev) : z)))), [])
  const toggleRotationMode = useCallback(() => setRotationMode((m) => (m === "north" ? "movement" : "north")), [])
  const requestCenter = useCallback((p?: LatLng) => setCenterRequest({ position: p ?? positionRef.current, nonce: Date.now() }), [])
  const updateSettings = useCallback((patch: Partial<BeaconSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...patch,
      intervalMs: Math.max(MIN_INTERVAL_MS, patch.intervalMs ?? prev.intervalMs),
      alarmSound: patch.alarmSound ?? prev.alarmSound ?? "beep",
    }))
  }, [])

  const pushHistory = useCallback((entry: Omit<HistoryEntry, "id" | "at">) => {
    setHistory((prev) => [{ ...entry, id: uid(), at: Date.now() }, ...prev].slice(0, 200))
  }, [])

  const evaluateGeofences = useCallback((pos: LatLng) => {
    const s = settingsRef.current
    const active = geofencesRef.current.filter((g) => g.active)
    const nowInside = active.filter((g) => distanceMeters(pos, g.center) <= g.radius).map((g) => g.id)
    const prevInside = insideRef.current
    for (const g of active) {
      const was = prevInside.includes(g.id)
      const is = nowInside.includes(g.id)
      if (!was && is && g.alertOnEnter) {
        pushHistory({ position: pos, speedKmh: 0, street: streetForIndex(stepCountRef.current), event: "geofence-enter", note: `Вход в геозону «${g.name}»` })
        if (s.soundEnabled) playAlarm(s.alarmSound, s.soundVolume)
      }
      if (was && !is && g.alertOnExit) {
        pushHistory({ position: pos, speedKmh: 0, street: streetForIndex(stepCountRef.current), event: "geofence-exit", note: `Выход из геозоны «${g.name}»` })
        if (s.soundEnabled) playAlarm(s.alarmSound, s.soundVolume)
      }
    }
    insideRef.current = nowInside
    setInsideGeofenceIds(nowInside)
  }, [pushHistory])

  const performMove = useCallback(() => {
    const s = settingsRef.current
    const from = positionRef.current
    let to: LatLng
    let heading: number
    if (s.followRoute) {
      const node = currentNodeRef.current
      const arrivalBearing = arrivalBearingRef.current
      const distToNode = distanceMeters(from, node.pos)
      if (distToNode <= s.stepMeters) {
        const { node: nextNode, exitBearing } = pickNextNode(node, arrivalBearing)
        currentNodeRef.current = nextNode
        arrivalBearingRef.current = exitBearing
        heading = exitBearing
        to = moveByDistance(node.pos, s.stepMeters, heading)
      } else {
        heading = calcBearing(from, node.pos)
        to = moveByDistance(from, s.stepMeters, heading)
      }
    } else {
      heading = bearingFromDirection(s.direction)
      to = moveByDistance(from, s.stepMeters, heading)
      currentNodeRef.current = nearestNode(to)
      arrivalBearingRef.current = heading
    }
    const dist = distanceMeters(from, to)
    const speed = Math.round((dist / (s.intervalMs / 1000)) * 3.6)
    stepCountRef.current += 1
    const nextStreet = streetForIndex(stepCountRef.current)
    setPosition(to)
    setSpeedKmh(speed)
    setStreet(nextStreet)
    setMoving(true)
    setHeading(heading)
    pushHistory({ position: to, speedKmh: speed, street: nextStreet, event: "move" })
    if (s.soundEnabled) playAlarm(s.alarmSound, s.soundVolume)
    evaluateGeofences(to)
    window.setTimeout(() => setMoving(false), Math.min(900, Math.max(100, s.intervalMs - 100)))
  }, [evaluateGeofences, pushHistory])

  const moveOnce = useCallback(() => performMove(), [performMove])

  const placeBeacon = useCallback((pos: LatLng) => {
    currentNodeRef.current = nearestNode(pos)
    arrivalBearingRef.current = 45
    stepCountRef.current += 1
    const nextStreet = streetForIndex(stepCountRef.current)
    setPosition(pos)
    setSpeedKmh(0)
    setStreet(nextStreet)
    setMoving(false)
    pushHistory({ position: pos, speedKmh: 0, street: nextStreet, event: "manual", note: "Маяк установлен вручную" })
    evaluateGeofences(pos)
  }, [evaluateGeofences, pushHistory])

  useEffect(() => {
    if (!settings.autoMove || !settings.visible || settings.scheduledMove) return
    const id = window.setInterval(() => performMove(), Math.max(MIN_INTERVAL_MS, settings.intervalMs))
    return () => window.clearInterval(id)
  }, [settings.autoMove, settings.visible, settings.scheduledMove, settings.intervalMs, performMove])

  useEffect(() => {
    if (!settings.scheduledMove || !settings.visible) return
    const id = window.setInterval(() => {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, "0")
      const mm = String(now.getMinutes()).padStart(2, "0")
      if (`${hh}:${mm}` === settings.scheduleAt && now.getSeconds() === 0) performMove()
    }, 1000)
    return () => window.clearInterval(id)
  }, [settings.scheduledMove, settings.visible, settings.scheduleAt, performMove])

  const scenarioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!settings.scenarioEnabled || !settings.activeScenarioId || !settings.visible) {
      if (scenarioTimerRef.current) clearTimeout(scenarioTimerRef.current)
      return
    }
    const scenario = scenarios.find((s) => s.id === settings.activeScenarioId)
    if (!scenario || scenario.steps.length === 0) return
    let cancelled = false
    function scheduleNext(stepIdx: number) {
      if (cancelled) return
      const step = scenario!.steps[stepIdx]
      if (!step) return
      scenarioTimerRef.current = setTimeout(() => {
        if (cancelled) return
        if (step.stepMeters > 0) {
          const s = settingsRef.current
          const from = positionRef.current
          let heading: number
          let to: LatLng
          if (step.direction) {
            heading = bearingFromDirection(step.direction)
            to = moveByDistance(from, step.stepMeters, heading)
            currentNodeRef.current = nearestNode(to)
            arrivalBearingRef.current = heading
          } else if (s.followRoute) {
            const node = currentNodeRef.current
            const distToNode = distanceMeters(from, node.pos)
            if (distToNode <= step.stepMeters) {
              const { node: nextNode, exitBearing } = pickNextNode(node, arrivalBearingRef.current)
              currentNodeRef.current = nextNode
              arrivalBearingRef.current = exitBearing
              heading = exitBearing
              to = moveByDistance(node.pos, step.stepMeters, heading)
            } else {
              heading = calcBearing(from, node.pos)
              to = moveByDistance(from, step.stepMeters, heading)
            }
          } else {
            heading = bearingFromDirection(s.direction)
            to = moveByDistance(from, step.stepMeters, heading)
          }
          const dist = distanceMeters(from, to)
          const speed = Math.round((dist / (step.delayMs / 1000)) * 3.6)
          stepCountRef.current += 1
          const nextStreet = streetForIndex(stepCountRef.current)
          setPosition(to)
          setSpeedKmh(speed)
          setStreet(nextStreet)
          setMoving(true)
          setHeading(heading)
          pushHistory({ position: to, speedKmh: speed, street: nextStreet, event: "move" })
          if (s.soundEnabled) playAlarm(s.alarmSound, s.soundVolume)
          evaluateGeofences(to)
          window.setTimeout(() => setMoving(false), Math.min(900, Math.max(100, step.delayMs - 50)))
        }
        const nextIdx = stepIdx + 1
        if (nextIdx < scenario!.steps.length) scheduleNext(nextIdx)
        else if (scenario!.loop) scheduleNext(0)
      }, step.delayMs)
    }
    scheduleNext(0)
    return () => {
      cancelled = true
      if (scenarioTimerRef.current) clearTimeout(scenarioTimerRef.current)
    }
  }, [settings.scenarioEnabled, settings.activeScenarioId, settings.visible, scenarios, evaluateGeofences, pushHistory])

  const addScenario = useCallback(() => setScenarios((prev) => [...prev, { id: uid(), name: `Сценарий ${prev.length + 1}`, loop: true, steps: [{ id: uid(), delayMs: 2000, stepMeters: 20, direction: null }] }]), [])
  const updateScenario = useCallback((id: string, patch: Partial<Omit<Scenario, "id" | "steps">>) => setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s))), [])
  const removeScenario = useCallback((id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id))
    setSettings((prev) => prev.activeScenarioId === id ? { ...prev, activeScenarioId: null, scenarioEnabled: false } : prev)
  }, [])
  const addScenarioStep = useCallback((scenarioId: string) => setScenarios((prev) => prev.map((s) => s.id === scenarioId ? { ...s, steps: [...s.steps, { id: uid(), delayMs: 2000, stepMeters: 20, direction: null }] } : s)), [])
  const updateScenarioStep = useCallback((scenarioId: string, stepId: string, patch: Partial<ScenarioStep>) => setScenarios((prev) => prev.map((s) => s.id === scenarioId ? { ...s, steps: s.steps.map((st) => (st.id === stepId ? { ...st, ...patch } : st)) } : s)), [])
  const removeScenarioStep = useCallback((scenarioId: string, stepId: string) => setScenarios((prev) => prev.map((s) => s.id === scenarioId ? { ...s, steps: s.steps.filter((st) => st.id !== stepId) } : s)), [])
  const clearHistory = useCallback(() => { setHistory([]); insideRef.current = []; setInsideGeofenceIds([]) }, [])
  const addGeofence = useCallback(() => setGeofences((prev) => [...prev, { id: uid(), name: `Геозона ${prev.length + 1}`, center: positionRef.current, radius: 800, active: true, color: "#a855f7", alertOnEnter: true, alertOnExit: true }]), [])
  const updateGeofence = useCallback((id: string, patch: Partial<Geofence>) => setGeofences((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g))), [])
  const removeGeofence = useCallback((id: string) => setGeofences((prev) => prev.filter((g) => g.id !== id)), [])

  const value = useMemo<StoreValue>(() => ({
    theme, toggleTheme, activePanel, setActivePanel, layers, toggleLayer, zoom, setZoom,
    rotationMode, toggleRotationMode, heading, centerRequest, requestCenter, settings, updateSettings,
    position, speedKmh, street, moving, moveOnce, placeBeacon, objects, history, clearHistory,
    geofences, addGeofence, updateGeofence, removeGeofence, insideGeofenceIds, scenarios,
    addScenario, updateScenario, removeScenario, addScenarioStep, updateScenarioStep, removeScenarioStep,
  }), [theme, toggleTheme, activePanel, layers, toggleLayer, zoom, setZoom, rotationMode, toggleRotationMode, heading, centerRequest, requestCenter, settings, updateSettings, position, speedKmh, street, moving, moveOnce, placeBeacon, objects, history, clearHistory, geofences, addGeofence, updateGeofence, removeGeofence, insideGeofenceIds, scenarios, addScenario, updateScenario, removeScenario, addScenarioStep, updateScenarioStep, removeScenarioStep])

  return <StoreContext value={value}>{children}</StoreContext>
}
