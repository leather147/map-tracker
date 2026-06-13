// Lightweight WebAudio sounds, no asset needed.
let ctx: AudioContext | null = null

export type MovementSoundKind = "beep" | "soft" | "radar" | "alarm" | "radio"

export const MOVEMENT_SOUND_PRESETS: { value: MovementSoundKind; label: string }[] = [
  { value: "beep", label: "Короткий бип" },
  { value: "soft", label: "Мягкий сигнал" },
  { value: "radar", label: "Радар" },
  { value: "alarm", label: "Тревога" },
  { value: "radio", label: "Рация" },
]

let movementSoundKind: MovementSoundKind = "beep"
let movementSoundDurationMs = 120

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function clampDuration(value: number): number {
  return Math.max(80, Math.min(4000, value))
}

function playTone(
  audio: AudioContext,
  volume: number,
  frequency: number,
  durationMs: number,
  offsetMs = 0,
  type: OscillatorType = "sine",
) {
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  const now = audio.currentTime + offsetMs / 1000
  const duration = clampDuration(durationMs) / 1000
  const vol = clamp01(volume) * 0.6

  osc.type = type
  osc.frequency.setValueAtTime(frequency, now)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(vol, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}

export function setMovementSoundOptions(options: { kind?: MovementSoundKind; durationMs?: number }) {
  if (options.kind) movementSoundKind = options.kind
  if (typeof options.durationMs === "number") {
    movementSoundDurationMs = clampDuration(options.durationMs)
  }
}

export function playMovementSound(
  volume = 0.4,
  kind: MovementSoundKind = movementSoundKind,
  durationMs = movementSoundDurationMs,
) {
  const audio = getCtx()
  if (!audio) return
  if (audio.state === "suspended") void audio.resume()

  const duration = clampDuration(durationMs)

  switch (kind) {
    case "soft":
      playTone(audio, volume, 660, duration, 0, "sine")
      break
    case "radar":
      playTone(audio, volume, 980, Math.min(duration, 180), 0, "triangle")
      playTone(audio, volume * 0.75, 1220, Math.min(duration, 180), Math.min(duration * 0.35, 180), "triangle")
      break
    case "alarm":
      playTone(audio, volume, 740, duration, 0, "sawtooth")
      playTone(audio, volume * 0.65, 520, Math.max(120, duration * 0.55), duration * 0.42, "sawtooth")
      break
    case "radio":
      playTone(audio, volume * 0.7, 320, Math.max(90, duration * 0.35), 0, "square")
      playTone(audio, volume, 860, Math.max(120, duration * 0.5), duration * 0.25, "triangle")
      playTone(audio, volume * 0.45, 260, Math.max(90, duration * 0.25), duration * 0.72, "square")
      break
    case "beep":
    default:
      playTone(audio, volume, 880, duration, 0, "sine")
      break
  }
}

export function playBeep(volume = 0.4, frequency?: number, durationMs?: number) {
  if (typeof frequency !== "number") {
    playMovementSound(volume, movementSoundKind, durationMs ?? movementSoundDurationMs)
    return
  }

  const audio = getCtx()
  if (!audio) return
  if (audio.state === "suspended") void audio.resume()
  playTone(audio, volume, frequency, durationMs ?? 120)
}
