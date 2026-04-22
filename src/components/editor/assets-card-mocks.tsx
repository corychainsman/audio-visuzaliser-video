import { ImageIcon, Music4, RotateCcw, Upload } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AssetSource } from '@/lib/state/schema'

type AssetsCardMockProps = {
  image: AssetSource
  audio: AssetSource
  onReplaceImage?: () => void
  onReplaceAudio?: () => void
  onResetAll?: () => void
}

const getAssetMeta = (asset: AssetSource) =>
  asset.kind === 'uploaded' && asset.uploadedFile
    ? `${Math.round(asset.uploadedFile.sizeBytes / 1024)} KB`
    : asset.kind

export const AssetsCardRowsMock = ({
  image,
  audio,
  onReplaceImage,
  onReplaceAudio,
  onResetAll,
}: AssetsCardMockProps) => (
  <Card className="border-border/70 bg-background/70">
    <CardHeader>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Project</p>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-heading text-2xl">Assets</CardTitle>
          <Button
            variant="destructive"
            size="sm"
            type="button"
            onClick={onResetAll}
          >
            <RotateCcw className="size-4" />
            Reset All
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/60 p-3">
        <div
          className="size-14 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted"
          aria-hidden="true"
        >
          <img
            src={image.url}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ImageIcon className="size-4 text-muted-foreground" />
            <p className="truncate text-sm font-medium">{image.name}</p>
            <Badge variant="outline">{image.kind}</Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">{image.url}</p>
        </div>
        <Button variant="outline" size="sm" type="button" onClick={onReplaceImage}>
          <Upload className="size-4" />
          Replace
        </Button>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/60 p-3">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted">
          <Music4 className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Music4 className="size-4 text-muted-foreground" />
            <p className="truncate text-sm font-medium">{audio.name}</p>
            <Badge variant="outline">{getAssetMeta(audio)}</Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">{audio.url}</p>
        </div>
        <Button variant="outline" size="sm" type="button" onClick={onReplaceAudio}>
          <Upload className="size-4" />
          Replace
        </Button>
      </div>
    </CardContent>
  </Card>
)

export const AssetsCardSplitMock = ({
  image,
  audio,
  onReplaceImage,
  onReplaceAudio,
  onResetAll,
}: AssetsCardMockProps) => (
  <Card className="border-border/70 bg-background/70">
    <CardHeader>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Project</p>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-heading text-2xl">Assets</CardTitle>
          {onResetAll ? (
            <Button
              variant="destructive"
              size="sm"
              type="button"
              onClick={onResetAll}
            >
              <RotateCcw className="size-4" />
              Reset All
            </Button>
          ) : null}
        </div>
      </div>
    </CardHeader>
    <CardContent className="grid gap-3 md:grid-cols-2">
      <section className="space-y-3 rounded-2xl border border-border/70 bg-background/60 p-4">
        <div className="relative aspect-square overflow-hidden rounded-xl border border-border/70 bg-transparent [background-image:linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.05)_75%,rgba(255,255,255,0.05)),linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.05)_75%,rgba(255,255,255,0.05))] [background-position:0_0,8px_8px] [background-size:16px_16px]">
          <img
            src={image.url}
            alt=""
            className="h-full w-full object-contain object-center"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="size-4 text-muted-foreground" />
            <p className="truncate text-sm font-medium">{image.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{image.kind}</Badge>
            <Badge variant="outline">Image asset</Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">{image.url}</p>
        </div>
        <Button variant="outline" type="button" onClick={onReplaceImage}>
          <Upload className="size-4" />
          Replace Image
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-border/70 bg-background/60 p-4">
        <div className="flex aspect-square items-center justify-center rounded-xl border border-border/70 bg-muted p-3">
          <audio
            controls
            preload="metadata"
            className="w-full max-w-full"
            src={audio.url}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Music4 className="size-4 text-muted-foreground" />
            <p className="truncate text-sm font-medium">{audio.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{audio.kind}</Badge>
            <Badge variant="outline">{getAssetMeta(audio)}</Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">{audio.url}</p>
        </div>
        <Button variant="outline" type="button" onClick={onReplaceAudio}>
          <Upload className="size-4" />
          Replace Audio
        </Button>
      </section>
    </CardContent>
  </Card>
)
