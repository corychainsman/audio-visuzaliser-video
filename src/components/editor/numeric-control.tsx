import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

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
  inputDisplayValue?: string
  onInputDisplayChange?: (value: string) => number | null
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
  inputDisplayValue,
  onInputDisplayChange,
  onChange,
  onNudge,
}: NumericControlProps) => {
  const usesCustomInputDisplay = inputDisplayValue !== undefined
  const [draftValue, setDraftValue] = useState<string | null>(null)
  const displayedCustomValue = inputDisplayValue ?? String(value)

  return (
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
            type={usesCustomInputDisplay ? 'text' : 'number'}
            inputMode={usesCustomInputDisplay ? 'numeric' : undefined}
            className="w-24 bg-background/70 text-right"
            value={usesCustomInputDisplay ? (draftValue ?? displayedCustomValue) : value}
            min={usesCustomInputDisplay ? undefined : min}
            max={usesCustomInputDisplay ? undefined : max}
            step={usesCustomInputDisplay ? undefined : step}
            onChange={(event) => {
              if (!usesCustomInputDisplay) {
                onChange(Number(event.target.value))
                return
              }

              const nextRawValue = event.target.value
              const nextValue = onInputDisplayChange?.(nextRawValue) ?? Number(nextRawValue)

              if (nextValue !== null && Number.isFinite(nextValue)) {
                setDraftValue(null)
                onChange(nextValue)
                return
              }

              setDraftValue(nextRawValue)
            }}
            onBlur={() => {
              if (usesCustomInputDisplay) {
                setDraftValue(null)
              }
            }}
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
}
