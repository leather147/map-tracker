"use client"

import { Radar, Sun, Moon, Eye, EyeOff, Volume2, VolumeX } from "lucide-react"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

function QuickToggle({
  on,
  onClick,
  label,
  iconOn,
  iconOff,
  accent,
}: {
  on: boolean
  onClick: () => void
  label: string
  iconOn: React.ReactNode
  iconOff: React.ReactNode
  accent?: "primary" | "warm" | "beacon"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      title={label}
      className={cn(
        "grid size-9 place-items-center rounded-2xl text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on && accent === "primary" && "bg-primary/15 text-primary",
        on && accent === "warm"    && "bg-warm/20 text-warm",
        on && accent === "beacon"  && "bg-beacon/15 text-beacon",
      )}
    >
      {on ? iconOn : iconOff}
    </button>
  )
}

export function TopBar() {
  const { theme, toggleTheme, settings, updateSettings } = useStore()

  return (
    <div className="glass pointer-events-auto flex animate-fade-in items-center gap-1 rounded-3xl p-1.5 shadow-lg">
      <div className="flex items-center gap-2 px-2">
        <span
          className="grid size-7 place-items-center rounded-2xl"
          style={{ background: "var(--grad-primary)", boxShadow: "var(--glow-primary)" }}
        >
          <Radar className="size-4 text-primary-foreground" />
        </span>
        <span className="hidden text-sm font-semibold tracking-tight sm:block">
          Маяк<span className="text-primary">Трек</span>
        </span>
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      <QuickToggle
        on={settings.visible}
        onClick={() => updateSettings({ visible: !settings.visible })}
        label={settings.visible ? "Скрыть маяк" : "Показать маяк"}
        iconOn={<Eye className="size-[18px]" />}
        iconOff={<EyeOff className="size-[18px]" />}
        accent="beacon"
      />
      <QuickToggle
        on={settings.soundEnabled}
        onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
        label={settings.soundEnabled ? "Выключить звук" : "Включить звук"}
        iconOn={<Volume2 className="size-[18px]" />}
        iconOff={<VolumeX className="size-[18px]" />}
        accent="warm"
      />
      <QuickToggle
        on={theme === "light"}
        onClick={toggleTheme}
        label="Сменить тему"
        iconOn={<Sun className="size-[18px]" />}
        iconOff={<Moon className="size-[18px]" />}
        accent="warm"
      />
    </div>
  )
}
