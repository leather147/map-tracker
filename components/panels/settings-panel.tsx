"use client"

import { useStore } from "@/lib/store"
import { PanelHeader } from "@/components/panels/panel-header"
import { ScenarioEditor } from "@/components/panels/scenario-editor"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ALARM_SOUND_OPTIONS, playAlarm } from "@/lib/sound"
import { getSliderNumber } from "@/lib/slider-value"
import type { AlarmSoundId, Direction } from "@/lib/types"
import { DisplayModeSettings } from "@/components/display-mode-settings"

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

const MIN_MARKER_SIZE = 30
const MAX_MARKER_SIZE = 64

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="space-y-4 rounded-xl bg-card px-4 py-4">{children}</div>
    </section>
  )
}

function Divider() {
  return <div className="h-px bg-border/60" />
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

function SliderRow({ label, value, display, min, max, step, onChange, disabled }: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className={disabled ? "space-y-2 opacity-40 pointer-events-none" : "space-y-2"}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{display}</span>
      </div>
      <Slider value={value} min={min} max={max} step={step} disabled={disabled} onValueChange={(next) => onChange(getSliderNumber(next))} aria-label={label} />
    </div>
  )
}

function IntervalRow({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className={disabled ? "space-y-2 opacity-40 pointer-events-none" : "space-y-2"}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">Интервал позиций</span>
        <div className="flex items-center gap-1">
          <input type="number" min={10} max={3600} step={1} value={Math.round(value / 1000)} disabled={disabled} onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v) && v >= 10 && v <= 3600) onChange(v * 1000) }} className="h-7 w-20 rounded-md bg-background px-2 text-right font-mono text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-ring" aria-label="Интервал позиций в секундах" />
          <span className="text-xs text-muted-foreground">с</span>
        </div>
      </div>
      <Slider value={Math.min(Math.max(value / 1000, 10), 300)} min={10} max={300} step={5} disabled={disabled} onValueChange={(next) => onChange(getSliderNumber(next) * 1000)} aria-label="Интервал позиций" />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>10 с</span>
        <span className="tabular-nums">{value >= 60_000 ? `${(value / 60_000).toFixed(1)} мин` : `${Math.round(value / 1000)} с`}</span>
        <span>5 мин</span>
      </div>
    </div>
  )
}

export function SettingsPanel() {
  const { settings, updateSettings, theme, toggleTheme, zoom, setZoom } = useStore()
  const markerSize = Math.max(MIN_MARKER_SIZE, Math.min(MAX_MARKER_SIZE, settings.markerSize ?? MIN_MARKER_SIZE))

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0">
        <PanelHeader title="Настройки" subtitle="Параметры маяка и приложения" />
      </div>

      <ScrollArea className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="space-y-6 px-4 py-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <DisplayModeSettings />

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
            <SliderRow label="Размер маркера" value={markerSize} display={`${markerSize} px`} min={MIN_MARKER_SIZE} max={MAX_MARKER_SIZE} step={2} onChange={(v) => updateSettings({ markerSize: v })} />
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
            <div className="space-y-2"><span className="text-sm font-medium">Направление</span><Select value={settings.direction} onValueChange={(v) => updateSettings({ direction: v as Direction })} disabled={settings.followRoute}><SelectTrigger className="w-full" aria-label="Направление движения"><SelectValue /></SelectTrigger><SelectContent>{DIRECTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent></Select></div>
            <SliderRow label="Шаг перемещения" value={settings.stepMeters} display={`${settings.stepMeters} м`} min={10} max={300} step={10} disabled={settings.followRoute} onChange={(v) => updateSettings({ stepMeters: v })} />
          </Section>

          <Section title="Сценарии движения">
            <p className="text-xs text-muted-foreground">Сценарий — это последовательность шагов с индивидуальной задержкой и расстоянием. При запуске сценария автодвижение отключается.</p>
            <ScenarioEditor />
          </Section>

          <Section title="Расписание">
            <ToggleRow label="Перемещение по времени" desc="Двигаться в заданный момент" checked={settings.scheduledMove} onChange={(v) => updateSettings({ scheduledMove: v })} />
            <div className={settings.scheduledMove ? "space-y-2" : "space-y-2 opacity-40 pointer-events-none"}><span className="text-sm font-medium">Время</span><Input type="time" value={settings.scheduleAt} disabled={!settings.scheduledMove} onChange={(e) => updateSettings({ scheduleAt: e.target.value })} className="w-full" aria-label="Время перемещения" /></div>
          </Section>

          <Section title="Пульсация">
            <ToggleRow label="Пульсация точки" desc="Анимация вокруг маяка" checked={settings.pulseEnabled} onChange={(v) => updateSettings({ pulseEnabled: v })} />
            <Divider />
            <SliderRow label="Скорость пульса" value={settings.pulseDurationMs} display={`${(settings.pulseDurationMs / 1000).toFixed(1)} с`} min={600} max={4000} step={100} disabled={!settings.pulseEnabled} onChange={(v) => updateSettings({ pulseDurationMs: v })} />
            <SliderRow label="Размер пульса" value={settings.pulseScale} display={`×${settings.pulseScale.toFixed(1)}`} min={1.5} max={5} step={0.5} disabled={!settings.pulseEnabled} onChange={(v) => updateSettings({ pulseScale: v })} />
          </Section>

          <Section title="Звук">
            <ToggleRow label="Звуковой сигнал" desc="Основной звук маяка и тревог" checked={settings.soundEnabled} onChange={(v) => { updateSettings({ soundEnabled: v }); if (v) playAlarm(settings.alarmSound, settings.soundVolume) }} />
            <Divider />
            <ToggleRow label="Постоянная сигнализация" desc="Повторять сигнал в ритм пульсации, даже если точка стоит" checked={settings.continuousAlarm} onChange={(v) => updateSettings({ continuousAlarm: v })} />
            <Divider />
            <div className={settings.soundEnabled ? "space-y-2" : "space-y-2 opacity-40 pointer-events-none"}>
              <span className="text-sm font-medium">Тип сигнала</span>
              <Select value={settings.alarmSound} onValueChange={(v) => updateSettings({ alarmSound: v as AlarmSoundId })} disabled={!settings.soundEnabled}><SelectTrigger className="w-full" aria-label="Тип тревожного сигнала"><SelectValue /></SelectTrigger><SelectContent>{ALARM_SOUND_OPTIONS.map((sound) => <SelectItem key={sound.id} value={sound.id}>{sound.label}</SelectItem>)}</SelectContent></Select>
              <p className="text-xs text-muted-foreground">{ALARM_SOUND_OPTIONS.find((sound) => sound.id === settings.alarmSound)?.description}</p>
            </div>
            <Divider />
            <SliderRow label="Громкость" value={Math.round(settings.soundVolume * 100)} display={`${Math.round(settings.soundVolume * 100)}%`} min={0} max={100} step={5} disabled={!settings.soundEnabled} onChange={(v) => updateSettings({ soundVolume: v / 100 })} />
            <button type="button" disabled={!settings.soundEnabled} onClick={() => playAlarm(settings.alarmSound, settings.soundVolume)} className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-40">Проверить сигнал</button>
          </Section>
        </div>
      </ScrollArea>
    </div>
  )
}