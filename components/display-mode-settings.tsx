"use client"

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
