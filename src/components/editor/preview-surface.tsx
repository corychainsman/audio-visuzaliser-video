import type { CSSProperties, RefObject } from 'react'

import { Film } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type PreviewSurfaceProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  aspectRatio: number
  mode: 'editor' | 'preview'
  previewUrl: string | null
  isBusy: boolean
  progressRatio: number
  progressMessage: string
  onCancel: () => void
}

export const PreviewSurface = ({
  canvasRef,
  aspectRatio,
  mode,
  previewUrl,
  isBusy,
  progressRatio,
  progressMessage,
  onCancel,
}: PreviewSurfaceProps) => (
  <Card
    className="preview-surface relative w-full border border-border/70 bg-background/60 p-0 shadow-lg shadow-black/20 md:min-h-0 md:flex-1"
    style={{ '--preview-aspect': `${aspectRatio}` } as CSSProperties}
  >
    <div className="absolute inset-0 bg-transparent [background-image:linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.05)_75%,rgba(255,255,255,0.05)),linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.05)_75%,rgba(255,255,255,0.05))] [background-position:0_0,8px_8px] [background-size:16px_16px]" />
    <canvas
      ref={canvasRef}
      className={cn(
        'relative z-10 h-full w-full object-contain',
        mode === 'preview' ? 'hidden' : 'block',
      )}
    />
    {mode === 'preview' && previewUrl ? (
      <video
        className="relative z-10 h-full w-full object-contain"
        src={previewUrl}
        autoPlay
      />
    ) : null}
    {isBusy ? (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/70 text-foreground backdrop-blur-sm">
        <Card className="w-full max-w-md border-border/70 bg-card/85 text-card-foreground shadow-none">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <Film className="size-6" />
              <p className="text-lg font-medium">{Math.round(progressRatio * 100)}%</p>
            </div>
            <div className="w-full">
              <Progress value={Math.round(progressRatio * 100)} />
            </div>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              {progressMessage || 'Rendering video in-browser'}
            </p>
            <Button
              type="button"
              variant="outline"
              className="border-border/70 bg-background/60 text-foreground hover:bg-muted hover:text-foreground"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    ) : null}
  </Card>
)
