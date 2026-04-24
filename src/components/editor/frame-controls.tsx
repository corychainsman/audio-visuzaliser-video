import { Ellipsis, ArrowLeft, ArrowRight, Download, Play, Sparkles, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
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
    <CardContent className="space-y-4">
      <div className="flex items-center justify-between gap-2 md:hidden">
        <Button
          onClick={isPlaying ? onStop : onPlay}
          disabled={isBusy}
          className="min-w-28 flex-1 text-base"
        >
          {isPlaying ? <Square className="size-4" /> : <Play className="size-4" />}
          {isPlaying ? 'Stop' : `Play ${previewDurationSec.toFixed(0)}s`}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadFullVideo}
          disabled={isBusy}
          className="shrink-0"
        >
          <Download className="size-4" />
          Export
        </Button>
        <Drawer>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              className="shrink-0"
            >
              <Ellipsis className="size-4" />
              Controls
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Frame Controls</DrawerTitle>
              <DrawerDescription>
                Fine-tune the selected frame and preview actions.
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-5 overflow-y-auto px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => onNudge(-1 / 24)}
                  disabled={isBusy}
                  aria-label="Back one frame"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <div className="min-w-0 flex-1 text-center text-sm text-muted-foreground">
                  {frameTimeSec.toFixed(2)}s selected
                </div>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => onNudge(1 / 24)}
                  disabled={isBusy}
                  aria-label="Forward one frame"
                >
                  <ArrowRight className="size-4" />
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
                <span>{durationSec.toFixed(2)}s</span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={onAutoPick}
                disabled={isBusy}
              >
                <Sparkles className="size-4" />
                Auto-select Best Frame
              </Button>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      <div className="hidden space-y-4 md:block">
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
              disabled={isBusy}
            >
              <Sparkles className="size-4" />
              Auto-select Best Frame
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={onDownloadFullVideo}
            disabled={isBusy}
            className="border-primary px-5 text-base ring-primary"
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
      </div>
    </CardContent>
  </Card>
)
