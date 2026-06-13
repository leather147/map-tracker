"use client"

import { useState } from "react"
import {
  Play,
  Pause,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Pencil,
  Check,
} from "lucide-react"
import { useStore } from "@/lib/store"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getSliderNumber } from "@/lib/slider-value"
import type { Direction, Scenario } from "@/lib/types"

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "N",  label: "Север" },
  { value: "NE", label: "СВ" },
  { value: "E",  label: "Восток" },
  { value: "SE", label: "ЮВ" },
  { value: "S",  label: "Юг" },
  { value: "SW", label: "ЮЗ" },
  { value: "W",  label: "Запад" },
  { value: "NW", label: "СЗ" },
]

function formatDelay(ms: number): string {
  if (ms < 1000) return `${ms} мс`
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)} с`
  return `${(ms / 60_000).toFixed(1)} мин`
}

// ── Single scenario card ───────────────────────────────────────────────────────
function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const {
    settings,
    updateSettings,
    updateScenario,
    removeScenario,
    addScenarioStep,
    updateScenarioStep,
    removeScenarioStep,
  } = useStore()

  const isActive =
    settings.scenarioEnabled && settings.activeScenarioId === scenario.id

  const [expanded, setExpanded] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(scenario.name)

  function toggleActive() {
    if (isActive) {
      updateSettings({ scenarioEnabled: false, activeScenarioId: null, autoMove: true })
    } else {
      updateSettings({
        scenarioEnabled: true,
        activeScenarioId: scenario.id,
        autoMove: false,
        scheduledMove: false,
      })
    }
  }

  const totalDuration = scenario.steps.reduce((a, s) => a + s.delayMs, 0)

  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-all",
        isActive ? "border-primary/50 shadow-[var(--glow-primary)]" : "border-border",
      )}
    >
      {/* header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* play/stop */}
        <button
          type="button"
          onClick={toggleActive}
          aria-label={isActive ? "Остановить сценарий" : "Запустить сценарий"}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg transition-all active:scale-90",
            isActive
              ? "text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-primary/15 hover:text-primary",
          )}
          style={isActive ? { background: "var(--grad-primary)", boxShadow: "var(--glow-primary)" } : {}}
        >
          {isActive ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>

        {/* name */}
        {editingName ? (
          <form
            className="flex flex-1 items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault()
              updateScenario(scenario.id, { name: nameValue.trim() || scenario.name })
              setEditingName(false)
            }}
          >
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="h-7 flex-1 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button type="submit" className="grid size-7 place-items-center rounded-md hover:bg-accent">
              <Check className="size-3.5 text-primary" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => { setNameValue(scenario.name); setEditingName(true) }}
            className="flex flex-1 items-center gap-1.5 text-left text-sm font-medium hover:text-primary"
          >
            {scenario.name}
            <Pencil className="size-3 shrink-0 text-muted-foreground" />
          </button>
        )}

        {/* meta chips */}
        <span className="shrink-0 text-xs text-muted-foreground">
          {scenario.steps.length} шаг. / {formatDelay(totalDuration)}
        </span>

        {/* loop toggle */}
        <Switch
          checked={scenario.loop}
          onCheckedChange={(v) => updateScenario(scenario.id, { loop: v })}
          aria-label="Зациклить сценарий"
          className="shrink-0"
        />
        <RotateCcw className={cn("size-3.5 shrink-0", scenario.loop ? "text-primary" : "text-muted-foreground")} />

        {/* expand */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="grid size-7 shrink-0 place-items-center rounded-lg hover:bg-accent"
          aria-expanded={expanded}
          aria-label="Развернуть шаги"
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>

        {/* delete */}
        <button
          type="button"
          onClick={() => removeScenario(scenario.id)}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
          aria-label="Удалить сценарий"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* steps */}
      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
          {scenario.steps.map((step, idx) => (
            <div
              key={step.id}
              className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 space-y-2.5"
            >
              {/* step header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Шаг {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeScenarioStep(scenario.id, step.id)}
                  disabled={scenario.steps.length <= 1}
                  className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500 disabled:pointer-events-none disabled:opacity-30"
                  aria-label="Удалить шаг"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* delay slider: 100 ms – 60 000 ms, log-like steps */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Задержка</span>
                  <span className="tabular-nums font-medium text-foreground">{formatDelay(step.delayMs)}</span>
                </div>
                <Slider
                  value={step.delayMs}
                  min={100}
                  max={60000}
                  step={100}
                  onValueChange={(next) =>
                    updateScenarioStep(scenario.id, step.id, { delayMs: getSliderNumber(next) })
                  }
                  aria-label="Задержка шага"
                />
              </div>

              {/* step meters */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Расстояние</span>
                  <span className="tabular-nums font-medium text-foreground">
                    {step.stepMeters === 0 ? "стоп" : `${step.stepMeters} м`}
                  </span>
                </div>
                <Slider
                  value={step.stepMeters}
                  min={0}
                  max={500}
                  step={5}
                  onValueChange={(next) =>
                    updateScenarioStep(scenario.id, step.id, { stepMeters: getSliderNumber(next) })
                  }
                  aria-label="Расстояние шага"
                />
              </div>

              {/* direction override */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground flex-1">Направление</span>
                <Select
                  value={step.direction ?? "auto"}
                  onValueChange={(v) =>
                    updateScenarioStep(scenario.id, step.id, {
                      direction: v === "auto" ? null : (v as Direction),
                    })
                  }
                >
                  <SelectTrigger className="h-7 w-32 text-xs" aria-label="Направление шага">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Авто (граф)</SelectItem>
                    {DIRECTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          {/* add step */}
          <button
            type="button"
            onClick={() => addScenarioStep(scenario.id)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="size-3.5" />
            Добавить шаг
          </button>
        </div>
      )}
    </div>
  )
}

// ── Public export ──────────────────────────────────────────────────────────────
export function ScenarioEditor() {
  const { scenarios, addScenario } = useStore()

  return (
    <div className="space-y-2">
      {scenarios.map((s) => (
        <ScenarioCard key={s.id} scenario={s} />
      ))}
      <button
        type="button"
        onClick={addScenario}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-4" />
        Новый сценарий
      </button>
    </div>
  )
}
