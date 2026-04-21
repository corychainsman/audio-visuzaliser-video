import type { ReactNode } from 'react'

import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

type NumericControlAction = {
  label: string
  icon: ReactNode
  onClick: () => void
}

type NumericControlProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  hint?: string
  actions?: NumericControlAction[]
  onChange: (value: number) => void
  onNudge?: (delta: number) => void
}

export const NumericControl = ({
  label,
  value,
  min,
  max,
  step = 1,
  hint,
  actions = [],
  onChange,
  onNudge,
}: NumericControlProps) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div>
        <Label className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
          {label}
        </Label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {actions.length > 0 ? (
          <div className="inline-flex items-center rounded-lg border border-input bg-background/70 p-0.5">
            {actions.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={action.onClick}
                className="rounded-md"
              >
                {action.icon}
                <span className="sr-only">{action.label}</span>
              </Button>
            ))}
          </div>
        ) : null}
        <Input
          type="number"
          className="w-24 bg-background/70 text-right"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          onKeyDown={(event) => {
            if (!onNudge) {
              return
            }

            if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
              onNudge(event.ctrlKey ? step * 5 : step)
            }

            if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
              onNudge(event.ctrlKey ? -step * 5 : -step)
            }
          }}
        />
      </div>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([next]) => onChange(next)}
    />
  </div>
)
