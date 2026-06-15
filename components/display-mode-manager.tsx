"use client"

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
