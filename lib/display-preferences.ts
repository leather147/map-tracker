export type DisplayPreferences = {
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
