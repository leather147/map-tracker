import type { AlarmSoundId } from "@/lib/types"

// Lightweight WebAudio alarm tones, no assets needed.
let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

type Tone = {
  frequency: number
  durationMs: number
  gapMs?: number
  type?: OscillatorType
}

export const ALARM_SOUND_OPTIONS: { id: AlarmSoundId; label: string; description: string }[] = [
  { id: "beep", label: "Короткий бип", description: "Один чистый сигнал" },
  { id: "double-beep", label: "Двойной бип", description: "Два коротких сигнала" },
  { id: "scanner", label: "Сканер", description: "Радиосигнал наблюдения" },
  { id: "siren", label: "Сирена", description: "Классическая тревога" },
  { id: "urgent", label: "Срочная тревога", description: "Быстрая серия импульсов" },
  { id: "evacuation", label: "Эвакуация", description: "Низко-высокий сигнал" },
  { id: "radar", label: "Радар", description: "Короткий поисковый пик" },
  { id: "warning", label: "Предупреждение", description: "Грубый тревожный тон" },
]

const ALARM_PATTERNS: Record<AlarmSoundId, Tone[]> = {
  "beep": [{ frequency: 880, durationMs: 120, type: "sine" }],
  "double-beep": [
    { frequency: 920, durationMs: 90, gapMs: 70, type: "sine" },
    { frequency: 920, durationMs: 110, type: "sine" },
  ],
  scanner: [
    { frequency: 700, durationMs: 65, gapMs: 45, type: "triangle" },
    { frequency: 980, durationMs: 65, gapMs: 45, type: "triangle" },
    { frequency: 760, durationMs: 90, type: "triangle" },
  ],
  siren: [
    { frequency: 560, durationMs: 180, gapMs: 35, type: "sawtooth" },
    { frequency: 960, durationMs: 220, gapMs: 35, type: "sawtooth" },
    { frequency: 560, durationMs: 180, type: "sawtooth" },
  ],
  urgent: [
    { frequency: 1200, durationMs: 70, gapMs: 45, type: "square" },
    { frequency: 1200, durationMs: 70, gapMs: 45, type: "square" },
    { frequency: 1200, durationMs: 70, gapMs: 45, type: "square" },
    { frequency: 920, durationMs: 120, type: "square" },
  ],
  evacuation: [
    { frequency: 420, durationMs: 240, gapMs: 60, type: "sawtooth" },
    { frequency: 780, durationMs: 240, gapMs: 60, type: "sawtooth" },
    { frequency: 420, durationMs: 240, type: "sawtooth" },
  ],
  radar: [
    { frequency: 1550, durationMs: 45, gapMs: 35, type: "sine" },
    { frequency: 1300, durationMs: 55, gapMs: 35, type: "sine" },
    { frequency: 1550, durationMs: 75, type: "sine" },
  ],
  warning: [
    { frequency: 330, durationMs: 180, gapMs: 50, type: "square" },
    { frequency: 330, durationMs: 180, type: "square" },
  ],
}

function playTone(audio: AudioContext, tone: Tone, volume: number, offsetMs: number) {
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = tone.type ?? "sine"
  osc.frequency.value = tone.frequency

  const start = audio.currentTime + offsetMs / 1000
  const end = start + tone.durationMs / 1000
  const vol = Math.max(0, Math.min(1, volume))

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(vol, start + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)

  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(start)
  osc.stop(end + 0.03)
}

export function playAlarm(sound: AlarmSoundId = "beep", volume = 1) {
  const audio = getCtx()
  if (!audio) return
  if (audio.state === "suspended") void audio.resume()

  const pattern = ALARM_PATTERNS[sound] ?? ALARM_PATTERNS.beep
  let offset = 0
  for (const tone of pattern) {
    playTone(audio, tone, volume, offset)
    offset += tone.durationMs + (tone.gapMs ?? 0)
  }
}

export function playBeep(volume = 1, frequency = 880, durationMs = 120) {
  const audio = getCtx()
  if (!audio) return
  if (audio.state === "suspended") void audio.resume()

  playTone(audio, { frequency, durationMs, type: "sine" }, volume, 0)
}
