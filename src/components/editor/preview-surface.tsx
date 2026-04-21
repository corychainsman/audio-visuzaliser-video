import type { RefObject } from 'react'

import { Film } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type PreviewSurfaceProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  mode: 'editor' | 'preview'
  previewUrl: string | null
  isBusy: boolean
  progressRatio: number
  progressMessage: string
  onCancel: () => void
}

export const PreviewSurface = ({
  canvasRef,
  mode,
  previewUrl,
  isBusy,
  progressRatio,
  progressMessage,
  onCancel,
}: PreviewSurfaceProps) => (
  <section className="relative aspect-video overflow-hidden bg-[#111827]">
    <canvas
      ref={canvasRef}
      className={cn(
        'h-full w-full object-contain',
        mode === 'preview' ? 'hidden' : 'block',
      )}
    />
    {mode === 'preview' && previewUrl ? (
      <video
        className="h-full w-full object-contain"
        src={previewUrl}
        autoPlay
      />
    ) : null}
    {isBusy ? (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/50 text-white backdrop-blur-sm">
        <Card className="w-full max-w-md border-white/20 bg-black/35 text-white shadow-none">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <Film className="size-6" />
              <p className="text-lg font-medium">{Math.round(progressRatio * 100)}%</p>
            </div>
            <div className="w-full">
              <Progress value={Math.round(progressRatio * 100)} />
            </div>
            <p className="max-w-sm text-center text-sm text-white/80">
              {progressMessage || 'Rendering video in-browser'}
            </p>
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    ) : null}
  </section>
)
