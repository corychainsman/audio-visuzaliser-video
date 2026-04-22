import { ArrowLeft, ArrowRight, Download, Play, Sparkles, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'

type FrameControlsProps = {
  durationSec: number
  frameTimeSec: number
  previewDurationSec: number
  isPlaying: boolean
  isBusy: boolean
  onChange: (value: number) => void
  onNudge: (delta: number) => void
  onAutoPick: () => void
  onPlay: () => void
  onStop: () => void
  onDownloadFullVideo: () => void
}

export const FrameControls = ({
  durationSec,
  frameTimeSec,
  previewDurationSec,
  isPlaying,
  isBusy,
  onChange,
  onNudge,
  onAutoPick,
  onPlay,
  onStop,
  onDownloadFullVideo,
}: FrameControlsProps) => (
  <Card className="border-border/70 bg-card/80">
    <CardHeader>
      <div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Frame Selection
          </p>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onNudge(-1 / 24)}
          disabled={isBusy}
          aria-label="Back one frame"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Button
          onClick={isPlaying ? onStop : onPlay}
          disabled={isBusy}
          className="w-32 text-base"
        >
          <span className="flex w-full items-center justify-center gap-2">
            <span className="flex w-4 justify-center">
              {isPlaying ? <Square className="size-4" /> : <Play className="size-4" />}
            </span>
            <span className="w-10 text-center">
              {isPlaying ? 'Stop' : `Play ${previewDurationSec.toFixed(0)}s`}
            </span>
          </span>
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onNudge(1 / 24)}
          disabled={isBusy}
          aria-label="Forward one frame"
        >
          <ArrowRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm" 
          onClick={onAutoPick} 
          disabled={isBusy}>
          <Sparkles className="size-4" />
          Auto-select Best Frame
        </Button>
        </div>
        <Button
          variant="outline"
          onClick={onDownloadFullVideo}
          disabled={isBusy}
          className="px-5 text-base"
        >
          <Download className="size-4" />
          Download Full Video
        </Button>
      </div>
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
