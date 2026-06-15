const fs = require('fs')
const path = require('path')

const root = process.cwd()

function fail(message) {
  console.error(`\nERROR: ${message}`)
  process.exit(1)
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

function write(file, content) {
  const full = path.join(root, file)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf8')
  console.log(`updated ${file}`)
}

function exists(file) {
  return fs.existsSync(path.join(root, file))
}

function walk(dir, out = []) {
  const full = path.join(root, dir)
  if (!fs.existsSync(full)) return out

  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') continue
    const rel = path.join(dir, entry.name).replace(/\\/g, '/')
    if (entry.isDirectory()) walk(rel, out)
    else if (/\.tsx?$/.test(entry.name)) out.push(rel)
  }

  return out
}

const preferencesCode = `export type DisplayPreferences = {
  fullscreenEnabledByDefault: boolean
  keepScreenAwake: boolean
}

export const DISPLAY_PREFERENCES_STORAGE_KEY = "map-tracker:display-preferences"
export const DISPLAY_PREFERENCES_EVENT = "map-tracker:display-preferences-change"

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  fullscreenEnabledByDefault: true,
  keepScreenAwake: true,
}

function normalizeDisplayPreferences(value: unknown): DisplayPreferences {
  const candidate = value && typeof value === "object" ? (value as Partial<DisplayPreferences>) : {}

  return {
    fullscreenEnabledByDefault:
      typeof candidate.fullscreenEnabledByDefault === "boolean"
        ? candidate.fullscreenEnabledByDefault
        : DEFAULT_DISPLAY_PREFERENCES.fullscreenEnabledByDefault,
    keepScreenAwake:
      typeof candidate.keepScreenAwake === "boolean"
        ? candidate.keepScreenAwake
        : DEFAULT_DISPLAY_PREFERENCES.keepScreenAwake,
  }
}

export function getDisplayPreferences(): DisplayPreferences {
  if (typeof window === "undefined") return DEFAULT_DISPLAY_PREFERENCES

  try {
    const raw = window.localStorage.getItem(DISPLAY_PREFERENCES_STORAGE_KEY)
    if (!raw) return DEFAULT_DISPLAY_PREFERENCES
    return normalizeDisplayPreferences(JSON.parse(raw))
  } catch {
    return DEFAULT_DISPLAY_PREFERENCES
  }
}

export function setDisplayPreferences(nextPreferences: Partial<DisplayPreferences>): DisplayPreferences {
  if (typeof window === "undefined") {
    return normalizeDisplayPreferences({ ...DEFAULT_DISPLAY_PREFERENCES, ...nextPreferences })
  }

  const preferences = normalizeDisplayPreferences({
    ...getDisplayPreferences(),
    ...nextPreferences,
  })

  window.localStorage.setItem(DISPLAY_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  window.dispatchEvent(new CustomEvent(DISPLAY_PREFERENCES_EVENT, { detail: preferences }))

  return preferences
}
`

const managerCode = `"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  DEFAULT_DISPLAY_PREFERENCES,
  DISPLAY_PREFERENCES_EVENT,
  getDisplayPreferences,
  type DisplayPreferences,
} from "@/lib/display-preferences"

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
  msFullscreenElement?: Element | null
  msExitFullscreen?: () => Promise<void> | void
}

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
  msRequestFullscreen?: () => Promise<void> | void
}

type WakeLockSentinelLike = EventTarget & {
  released: boolean
  release: () => Promise<void>
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>
  }
}

function getFullscreenElement() {
  if (typeof document === "undefined") return null
  const fullscreenDocument = document as FullscreenDocument

  return (
    document.fullscreenElement ??
    fullscreenDocument.webkitFullscreenElement ??
    fullscreenDocument.msFullscreenElement ??
    null
  )
}

async function requestPageFullscreen() {
  const element = document.documentElement as FullscreenElement

  if (getFullscreenElement()) return

  if (element.requestFullscreen) {
    await element.requestFullscreen({ navigationUI: "hide" })
    return
  }

  if (element.webkitRequestFullscreen) {
    await element.webkitRequestFullscreen()
    return
  }

  if (element.msRequestFullscreen) {
    await element.msRequestFullscreen()
  }
}

async function exitPageFullscreen() {
  const fullscreenDocument = document as FullscreenDocument

  if (!getFullscreenElement()) return

  if (document.exitFullscreen) {
    await document.exitFullscreen()
    return
  }

  if (fullscreenDocument.webkitExitFullscreen) {
    await fullscreenDocument.webkitExitFullscreen()
    return
  }

  if (fullscreenDocument.msExitFullscreen) {
    await fullscreenDocument.msExitFullscreen()
  }
}

export function DisplayModeManager() {
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [preferences, setPreferences] = useState<DisplayPreferences>(DEFAULT_DISPLAY_PREFERENCES)

  const syncFullscreenState = useCallback(() => {
    setIsFullscreen(Boolean(getFullscreenElement()))
  }, [])

  const releaseWakeLock = useCallback(async () => {
    const wakeLock = wakeLockRef.current
    wakeLockRef.current = null

    if (!wakeLock || wakeLock.released) return

    try {
      await wakeLock.release()
    } catch {
      // Some browsers reject release when the document is already hidden.
    }
  }, [])

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === "undefined") return

    const wakeLockApi = (navigator as NavigatorWithWakeLock).wakeLock
    if (!wakeLockApi || document.visibilityState !== "visible") return

    try {
      await releaseWakeLock()
      const wakeLock = await wakeLockApi.request("screen")
      wakeLockRef.current = wakeLock
      wakeLock.addEventListener("release", () => {
        if (wakeLockRef.current === wakeLock) wakeLockRef.current = null
      })
    } catch {
      // Wake Lock is unavailable in some browsers, private modes, or low-power states.
    }
  }, [releaseWakeLock])

  const enterFullscreen = useCallback(async () => {
    try {
      await requestPageFullscreen()
      syncFullscreenState()
    } catch {
      // Browsers intentionally block fullscreen without a user gesture.
    }
  }, [syncFullscreenState])

  const exitFullscreen = useCallback(async () => {
    try {
      await exitPageFullscreen()
      syncFullscreenState()
    } catch {
      // Ignore browser-specific fullscreen failures.
    }
  }, [syncFullscreenState])

  useEffect(() => {
    setMounted(true)
    setPreferences(getDisplayPreferences())
  }, [])

  useEffect(() => {
    if (!mounted) return

    const syncPreferences = () => setPreferences(getDisplayPreferences())

    window.addEventListener(DISPLAY_PREFERENCES_EVENT, syncPreferences)
    window.addEventListener("storage", syncPreferences)

    return () => {
      window.removeEventListener(DISPLAY_PREFERENCES_EVENT, syncPreferences)
      window.removeEventListener("storage", syncPreferences)
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted) return

    syncFullscreenState()

    document.addEventListener("fullscreenchange", syncFullscreenState)
    document.addEventListener("webkitfullscreenchange", syncFullscreenState)
    document.addEventListener("MSFullscreenChange", syncFullscreenState)

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState)
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState)
      document.removeEventListener("MSFullscreenChange", syncFullscreenState)
    }
  }, [mounted, syncFullscreenState])

  useEffect(() => {
    if (!mounted) return

    if (!preferences.fullscreenEnabledByDefault) return

    const tryEnterFullscreen = () => {
      void enterFullscreen()
    }

    void enterFullscreen()

    window.addEventListener("pointerdown", tryEnterFullscreen, { once: true })
    window.addEventListener("keydown", tryEnterFullscreen, { once: true })
    window.addEventListener("touchstart", tryEnterFullscreen, { once: true })

    return () => {
      window.removeEventListener("pointerdown", tryEnterFullscreen)
      window.removeEventListener("keydown", tryEnterFullscreen)
      window.removeEventListener("touchstart", tryEnterFullscreen)
    }
  }, [enterFullscreen, mounted, preferences.fullscreenEnabledByDefault])

  useEffect(() => {
    if (!mounted) return

    if (!preferences.keepScreenAwake) {
      void releaseWakeLock()
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void requestWakeLock()
      else void releaseWakeLock()
    }

    void requestWakeLock()
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      void releaseWakeLock()
    }
  }, [mounted, preferences.keepScreenAwake, releaseWakeLock, requestWakeLock])

  if (!mounted) return null

  return (
    <button
      type="button"
      aria-label={isFullscreen ? "Выйти из полноэкранного режима" : "Войти в полноэкранный режим"}
      title={isFullscreen ? "Выйти из полноэкранного режима" : "Войти в полноэкранный режим"}
      onClick={() => {
        void (isFullscreen ? exitFullscreen() : enterFullscreen())
      }}
      className="fixed right-3 top-1/2 z-[9999] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-lg font-semibold text-foreground shadow-lg backdrop-blur transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <span aria-hidden="true">{isFullscreen ? "↙" : "⛶"}</span>
    </button>
  )
}
`

const settingsComponentCode = `"use client"

import { useEffect, useState } from "react"
import {
  DEFAULT_DISPLAY_PREFERENCES,
  DISPLAY_PREFERENCES_EVENT,
  getDisplayPreferences,
  setDisplayPreferences,
  type DisplayPreferences,
} from "@/lib/display-preferences"

export function DisplayModeSettings() {
  const [preferences, setPreferencesState] = useState<DisplayPreferences>(DEFAULT_DISPLAY_PREFERENCES)

  useEffect(() => {
    const sync = () => setPreferencesState(getDisplayPreferences())

    sync()
    window.addEventListener(DISPLAY_PREFERENCES_EVENT, sync)
    window.addEventListener("storage", sync)

    return () => {
      window.removeEventListener(DISPLAY_PREFERENCES_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  function updatePreferences(nextPreferences: Partial<DisplayPreferences>) {
    setPreferencesState(setDisplayPreferences(nextPreferences))
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Экран</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Управление полноэкранным режимом и отключением сна устройства на сайте.
        </p>
      </div>

      <div className="space-y-3">
        <DisplayModeSettingRow
          title="Полноэкранный режим по умолчанию"
          description="Сайт будет входить в полноэкранный режим после первого клика, тапа или нажатия клавиши."
          checked={preferences.fullscreenEnabledByDefault}
          onCheckedChange={(checked) => updatePreferences({ fullscreenEnabledByDefault: checked })}
        />

        <DisplayModeSettingRow
          title="Не выключать экран"
          description="Сайт будет удерживать экран включённым, пока вкладка активна. Работает там, где браузер поддерживает Screen Wake Lock."
          checked={preferences.keepScreenAwake}
          onCheckedChange={(checked) => updatePreferences({ keepScreenAwake: checked })}
        />
      </div>
    </section>
  )
}

function DisplayModeSettingRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={
          checked
            ? "relative h-6 w-11 shrink-0 rounded-full bg-primary transition-colors"
            : "relative h-6 w-11 shrink-0 rounded-full bg-muted transition-colors"
        }
      >
        <span
          className={
            checked
              ? "absolute left-5 top-1 h-4 w-4 rounded-full bg-primary-foreground transition-transform"
              : "absolute left-1 top-1 h-4 w-4 rounded-full bg-background transition-transform"
          }
        />
      </button>
    </div>
  )
}
`

function ensureLayout() {
  const candidates = ['app/layout.tsx', 'src/app/layout.tsx']
  const layoutPath = candidates.find(exists)
  if (!layoutPath) fail('Could not find app/layout.tsx or src/app/layout.tsx')

  let content = read(layoutPath)

  if (!content.includes('@/components/display-mode-manager')) {
    const lines = content.split(/\r?\n/)
    let lastImport = -1
    for (let i = 0; i < lines.length; i += 1) {
      if (/^import\s/.test(lines[i])) lastImport = i
    }
    if (lastImport === -1) fail(`Could not insert DisplayModeManager import into ${layoutPath}`)
    lines.splice(lastImport + 1, 0, 'import { DisplayModeManager } from "@/components/display-mode-manager"')
    content = lines.join('\n')
  }

  if (!content.includes('<DisplayModeManager />')) {
    if (content.includes('{children}')) {
      content = content.replace('{children}', '<DisplayModeManager />\n        {children}')
    } else if (content.includes('</body>')) {
      content = content.replace('</body>', '        <DisplayModeManager />\n      </body>')
    } else {
      fail(`Could not insert <DisplayModeManager /> into ${layoutPath}`)
    }
  }

  write(layoutPath, content)
}

function findSettingsFile() {
  const directCandidates = [
    'components/panels/settings-panel.tsx',
    'src/components/panels/settings-panel.tsx',
    'components/settings-panel.tsx',
    'src/components/settings-panel.tsx',
    'app/settings/page.tsx',
    'src/app/settings/page.tsx',
  ]

  const direct = directCandidates.find(exists)
  if (direct) return direct

  const files = walk('.')
  const scored = files
    .map((file) => {
      const content = read(file)
      let score = 0
      if (/settings/i.test(file)) score += 5
      if (/SettingsPanel|SettingsPage|Settings/.test(content)) score += 4
      if (/Настройки|настройки|settings/i.test(content)) score += 3
      if (/export\s+(function|const)\s+/.test(content)) score += 1
      return { file, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored[0]?.file ?? null
}

function ensureSettingsPanel() {
  const settingsPath = findSettingsFile()
  if (!settingsPath) {
    fail('Could not find the settings TSX file. Tell me the real settings file path and I will give you a direct patch.')
  }

  let content = read(settingsPath)

  if (!content.includes('@/components/display-mode-settings')) {
    const lines = content.split(/\r?\n/)
    let lastImport = -1
    for (let i = 0; i < lines.length; i += 1) {
      if (/^import\s/.test(lines[i])) lastImport = i
    }

    if (lastImport === -1) {
      fail(`Could not insert DisplayModeSettings import into ${settingsPath}`)
    }

    lines.splice(lastImport + 1, 0, 'import { DisplayModeSettings } from "@/components/display-mode-settings"')
    content = lines.join('\n')
  }

  if (!content.includes('<DisplayModeSettings />')) {
    const lines = content.split(/\r?\n/)
    const startIndex = Math.max(
      lines.findIndex((line) => /(?:export\s+)?function\s+SettingsPanel\b/.test(line)),
      lines.findIndex((line) => /(?:export\s+)?const\s+SettingsPanel\b/.test(line)),
      lines.findIndex((line) => /(?:export\s+)?function\s+SettingsPage\b/.test(line)),
      lines.findIndex((line) => /(?:export\s+)?const\s+SettingsPage\b/.test(line)),
      0,
    )

    let returnLine = -1
    for (let i = startIndex; i < lines.length; i += 1) {
      if (/return\s*\(/.test(lines[i])) {
        returnLine = i
        break
      }
    }

    if (returnLine === -1) {
      fail(`Could not find a JSX return in ${settingsPath}`)
    }

    let rootLine = -1
    for (let i = returnLine + 1; i < lines.length; i += 1) {
      const trimmed = lines[i].trim()
      if (!trimmed || trimmed.startsWith('{/*') || trimmed.startsWith('//')) continue
      if (trimmed.startsWith('<')) {
        rootLine = i
        break
      }
    }

    if (rootLine === -1) {
      fail(`Could not find the root JSX element in ${settingsPath}`)
    }

    let insertAfter = rootLine
    for (let i = rootLine; i < lines.length; i += 1) {
      const trimmed = lines[i].trim()
      if (trimmed === '<>' || trimmed === '<React.Fragment>' || trimmed.endsWith('>')) {
        insertAfter = i
        break
      }
    }

    const indent = (lines[rootLine].match(/^\s*/) || [''])[0]
    const childIndent = `${indent}  `
    lines.splice(insertAfter + 1, 0, `${childIndent}<DisplayModeSettings />`)
    content = lines.join('\n')
  }

  write(settingsPath, content)
}

write('lib/display-preferences.ts', preferencesCode)
write('components/display-mode-manager.tsx', managerCode)
write('components/display-mode-settings.tsx', settingsComponentCode)
ensureLayout()
ensureSettingsPanel()

console.log('\nDone. Now run: pnpm build')
