"use client"

import { useEffect, type ReactNode } from "react"
import { useStore } from "@/lib/store"
import { PanelHeader } from "@/components/panels/panel-header"
import { ScenarioEditor } from "@/components/panels/scenario-editor"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MOVEMENT_SOUND_PRESETS,
  playMovementSound,
  setMovementSoundOptions,
  type MovementSoundKind,
} from "@/lib/sound"
import type { BeaconSettings, Direction } from "@/lib/types"
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { playBeep } from "@/lib/sound"
import { getSliderNumber } from "@/lib/slider-value"
import type { Direction } from "@/lib/types"

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "N", label: "Север ↑" },
  { value: "NE", label: "Северо-восток ↗" },
  { value: "E", label: "Восток →" },
  { value: "SE", label: "Юго-восток ↘" },
  { value: "S", label: "Юг ↓" },
  { value: "SW", label: "Юго-запад ↙" },
  { value: "W", label: "Запад ←" },
  { value: "NW", label: "Северо-запад ↖" },
]

function getSliderNumber(value: number | number[]): number {
  return Array.isArray(value) ? value[0] : value
}

function getMovementSoundKind(settings: BeaconSettings): MovementSoundKind {
  return ((settings as BeaconSettings & { movementSoundKind?: MovementSoundKind }).movementSoundKind ?? "beep")
}

function getMovementSoundDuration(settings: BeaconSettings): number {
  return ((settings as BeaconSettings & { movementSoundDurationMs?: number }).movementSoundDurationMs ?? 120)
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="space-y-4 rounded-xl border border-border bg-card px-4 py-4">{children}</div>
    </section>
  )
}

function Divider() {
  return <div className="h-px bg-border" />
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-0.5">
      <span>
        <span className="block text-sm font-medium leading-snug">{label}</span>
        {desc && <span className="block text-xs leading-snug text-muted-foreground">{desc}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  )
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <div className={disabled ? "space-y-2 opacity-40" : "space-y-2"}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{display}</span>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(next) => onChange(getSliderNumber(next))}
        aria-label={label}
      />
    </div>
  )
}

function IntervalRow({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const label = value >= 60_000 ? `${(value / 60_000).toFixed(1)} мин` : value >= 1_000 ? `${(value / 1_000).toFixed(2)} с` : `${value} мс`
  return (
    <div className={disabled ? "space-y-2 opacity-40" : "space-y-2"}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">Интервал обновления</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={100}
            max={3_600_000}
            step={100}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              const next = Number(e.target.value)
              if (!Number.isNaN(next) && next >= 100 && next <= 3_600_000) onChange(next)
            }}
            className="h-7 w-24 rounded-md border border-border bg-background px-2 text-right font-mono text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Интервал в миллисекундах"
          />
          <span className="text-xs text-muted-foreground">мс</span>
        </div>
      </div>
      <Slider
        value={Math.min(value, 10_000)}
        min={100}
        max={10_000}
        step={100}
        disabled={disabled}
        onValueChange={(next) => onChange(getSliderNumber(next))}
        aria-label="Интервал обновления (грубая настройка)"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>100 мс</span><span className="tabular-nums">{label}</span><span>10 с+</span>
      </div>
    </div>
  )
}

export function SettingsPanel() {
  const { settings, updateSettings, theme, toggleTheme, zoom, setZoom } = useStore()
  const movementSoundKind = getMovementSoundKind(settings)
  const movementSoundDurationMs = getMovementSoundDuration(settings)
  const setSoundPatch = (patch: Partial<{ movementSoundKind: MovementSoundKind; movementSoundDurationMs: number }>) => {
    updateSettings(patch as Partial<BeaconSettings>)
  }

  useEffect(() => {
    setMovementSoundOptions({ kind: movementSoundKind, durationMs: movementSoundDurationMs })
  }, [movementSoundKind, movementSoundDurationMs])

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Настройки" subtitle="Параметры маяка и приложения" />
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="space-y-6 px-4 py-5 pb-8">
          <Section title="Интерфейс">
            <SliderRow label="Ширина панели" value={settings.panelWidth} display={`${settings.panelWidth} px`} min={240} max={520} step={20} onChange={(v) => updateSettings({ panelWidth: v })} />
          </Section>

          <Section title="Отображение">
            <ToggleRow label="Показывать маяк" desc="Точка на карте" checked={settings.visible} onChange={(v) => updateSettings({ visible: v })} />
            <Divider />
            <div className="flex items-center justify-between gap-4 py-0.5">
              <span><span className="block text-sm font-medium leading-snug">Цвет маяка</span><span className="block text-xs leading-snug text-muted-foreground">Нажмите на круг, чтобы выбрать цвет</span></span>
              <label className="flex cursor-pointer items-center gap-2.5">
                <span className="size-7 rounded-full border-2 border-border shadow-inner transition-transform hover:scale-110" style={{ background: settings.beaconColor }} aria-hidden />
                <input type="color" value={settings.beaconColor} onChange={(e) => updateSettings({ beaconColor: e.target.value })} className="sr-only" aria-label="Цвет маяка" />
                <span className="font-mono text-xs text-muted-foreground">{settings.beaconColor}</span>
              </label>
            </div>
            <Divider />
            <ToggleRow label="Тёмная тема" desc="Синяя карта, тёмный интерфейс" checked={theme === "dark"} onChange={toggleTheme} />
          </Section>

          <Section title="Карта">
            <SliderRow label="Масштаб" value={zoom} display={`${zoom}`} min={5} max={19} step={1} onChange={(v) => setZoom(v)} />
            <Divider />
            <SliderRow label="Оттенок тёмной карты" value={settings.mapHue} display={`${settings.mapHue}°`} min={0} max={359} step={1} disabled={theme !== "dark"} onChange={(v) => updateSettings({ mapHue: v })} />
            {theme !== "dark" && <p className="text-xs text-muted-foreground">Переключите в тёмную тему, чтобы изменить оттенок карты</p>}
          </Section>

          <Section title="Передвижение">
            <p className="text-xs text-muted-foreground">Нажмите на карту, чтобы установить маяк — отсюда он продолжит движение.</p>
            <ToggleRow label="Автодвижение" desc="Маяк периодически смещается по улицам" checked={settings.autoMove} onChange={(v) => updateSettings({ autoMove: v })} />
            <Divider />
            <IntervalRow value={settings.intervalMs} onChange={(v) => updateSettings({ intervalMs: v })} disabled={!settings.autoMove || settings.scenarioEnabled} />
            <Divider />
            <ToggleRow label="Двигаться по улицам" desc="Перемещение по узлам дорожного графа" checked={settings.followRoute} onChange={(v) => updateSettings({ followRoute: v })} />
            <div className="space-y-2">
              <span className="text-sm font-medium">Направление</span>
              <Select value={settings.direction} onValueChange={(v) => updateSettings({ direction: v as Direction })} disabled={settings.followRoute}>
                <SelectTrigger className="w-full" aria-label="Направление движения"><SelectValue /></SelectTrigger>
                <SelectContent>{DIRECTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <SliderRow label="Шаг перемещения" value={settings.stepMeters} display={`${settings.stepMeters} м`} min={10} max={300} step={10} disabled={settings.followRoute} onChange={(v) => updateSettings({ stepMeters: v })} />
          </Section>

          <Section title="Сценарии движения">
            <p className="text-xs text-muted-foreground">Сценарий — это последовательность шагов с индивидуальной задержкой и расстоянием. При запуске сценария автодвижение отключается.</p>
            <ScenarioEditor />
          </Section>

          <Section title="Расписание">
            <ToggleRow label="Перемещение по времени" desc="Двигаться в заданный момент" checked={settings.scheduledMove} onChange={(v) => updateSettings({ scheduledMove: v })} />
            <div className={settings.scheduledMove ? "space-y-2" : "space-y-2 opacity-40"}>
              <span className="text-sm font-medium">Время</span>
              <Input type="time" value={settings.scheduleAt} disabled={!settings.scheduledMove} onChange={(e) => updateSettings({ scheduleAt: e.target.value })} className="w-full" aria-label="Время перемещения" />
            </div>
          </Section>

          <Section title="Пульсация">
            <ToggleRow label="Пульсация точки" desc="Анимация вокруг маяка" checked={settings.pulseEnabled} onChange={(v) => updateSettings({ pulseEnabled: v })} />
            <Divider />
            <SliderRow label="Скорость пульса" value={settings.pulseDurationMs} display={`${(settings.pulseDurationMs / 1000).toFixed(1)} с`} min={600} max={4000} step={100} disabled={!settings.pulseEnabled} onChange={(v) => updateSettings({ pulseDurationMs: v })} />
            <SliderRow label="Размер пульса" value={settings.pulseScale} display={`×${settings.pulseScale.toFixed(1)}`} min={1.5} max={5} step={0.5} disabled={!settings.pulseEnabled} onChange={(v) => updateSettings({ pulseScale: v })} />
          </Section>

          <Section title="Звук">
            <ToggleRow label="Звуковой сигнал" desc="Сигнал при каждом перемещении" checked={settings.soundEnabled} onChange={(v) => {
              updateSettings({ soundEnabled: v })
              if (v) playMovementSound(settings.soundVolume, movementSoundKind, movementSoundDurationMs)
            }} />
            <Divider />
            <div className={settings.soundEnabled ? "space-y-2" : "space-y-2 opacity-40"}>
              <span className="text-sm font-medium">Тип сигнала</span>
              <Select value={movementSoundKind} disabled={!settings.soundEnabled} onValueChange={(v) => setSoundPatch({ movementSoundKind: v as MovementSoundKind })}>
                <SelectTrigger className="w-full" aria-label="Тип звукового сигнала"><SelectValue /></SelectTrigger>
                <SelectContent>{MOVEMENT_SOUND_PRESETS.map((preset) => <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <SliderRow label="Длина сигнала" value={movementSoundDurationMs} display={`${(movementSoundDurationMs / 1000).toFixed(2)} с`} min={120} max={3000} step={120} disabled={!settings.soundEnabled} onChange={(v) => setSoundPatch({ movementSoundDurationMs: v })} />
            <SliderRow label="Громкость" value={Math.round(settings.soundVolume * 100)} display={`${Math.round(settings.soundVolume * 100)}%`} min={0} max={100} step={5} disabled={!settings.soundEnabled} onChange={(v) => updateSettings({ soundVolume: v / 100 })} />
            <button type="button" disabled={!settings.soundEnabled} onClick={() => playMovementSound(settings.soundVolume, movementSoundKind, movementSoundDurationMs)} className="w-full rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-40">Проверить сигнал</button>
          </Section>
        </div>
      </ScrollArea>
    </div>
  )
}
