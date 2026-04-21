import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'

type FrameControlsProps = {
  durationSec: number
  frameTimeSec: number
  onChange: (value: number) => void
  onNudge: (delta: number) => void
  onAutoPick: () => void
}

export const FrameControls = ({
  durationSec,
  frameTimeSec,
  onChange,
  onNudge,
  onAutoPick,
}: FrameControlsProps) => (
  <Card className="border-border/70 bg-card/80">
    <CardHeader>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Frame Selection
          </p>
          <CardTitle className="font-heading text-2xl">Choose the representative moment</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onNudge(-1 / 24)}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNudge(1 / 24)}>
            <ArrowRight className="size-4" />
            Forward
          </Button>
          <Button size="sm" onClick={onAutoPick}>
            <Sparkles className="size-4" />
            Richest frame
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <Slider
        value={[frameTimeSec]}
        min={0}
        max={Math.max(durationSec, 0.01)}
        step={1 / 24}
        onValueChange={([next]) => onChange(next)}
      />
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>0.00s</span>
        <span>{frameTimeSec.toFixed(2)}s selected</span>
        <span>{durationSec.toFixed(2)}s</span>
      </div>
    </CardContent>
  </Card>
)
