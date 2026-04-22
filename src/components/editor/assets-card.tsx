import { ImageIcon, Music4, RotateCcw, Upload } from 'lucide-react'

import { EditorCardHeader } from '@/components/editor/editor-card-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import type { AssetSource } from '@/lib/state/schema'

type AssetsCardProps = {
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

const getAssetSummary = (asset: AssetSource, label: string) =>
  asset.kind === 'uploaded' && asset.uploadedFile
    ? `Uploaded ${label.toLowerCase()} • ${getAssetMeta(asset)}`
    : `Bundled ${label.toLowerCase()}`

export const AssetsCardRows = ({
  image,
  audio,
  onReplaceImage,
  onReplaceAudio,
  onResetAll,
}: AssetsCardProps) => (
  <Card className="border-border/70 bg-background/70">
    <EditorCardHeader
      eyebrow="Project"
      title="Assets"
      action={
        <Button
          variant="destructive"
          size="sm"
          type="button"
          onClick={onResetAll}
        >
          <RotateCcw className="size-4" />
          Reset All
        </Button>
      }
    />
    <CardContent className="space-y-3">
      <div className="flex items-center gap-3 border border-border/70 bg-background/60 p-3">
        <div
          className="size-14 shrink-0 overflow-hidden border border-border/70 bg-muted"
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
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {getAssetSummary(image, 'Image')}
          </p>
        </div>
        <Button variant="outline" size="sm" type="button" onClick={onReplaceImage}>
          <Upload className="size-4" />
          Replace
        </Button>
      </div>

      <div className="flex items-center gap-3 border border-border/70 bg-background/60 p-3">
        <div className="flex size-14 shrink-0 items-center justify-center border border-border/70 bg-muted">
          <Music4 className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Music4 className="size-4 text-muted-foreground" />
            <p className="truncate text-sm font-medium">{audio.name}</p>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {getAssetSummary(audio, 'Audio')}
          </p>
        </div>
        <Button variant="outline" size="sm" type="button" onClick={onReplaceAudio}>
          <Upload className="size-4" />
          Replace
        </Button>
      </div>
    </CardContent>
  </Card>
)

export const AssetsCard = ({
  image,
  audio,
  onReplaceImage,
  onReplaceAudio,
  onResetAll,
}: AssetsCardProps) => (
  <Card className="border-border/70 bg-background/70">
    <EditorCardHeader
      eyebrow="Project"
      title="Assets"
      action={onResetAll ? (
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
    />
    <CardContent className="grid grid-cols-2 gap-3">
      <Card size="sm" className="space-y-3 border border-border/70 bg-background/60 !pt-0">
        <Card
          size="sm"
          className="group relative aspect-square overflow-hidden border border-border/70 bg-transparent p-0 [background-image:linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.05)_75%,rgba(255,255,255,0.05)),linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.05)_75%,rgba(255,255,255,0.05))] [background-position:0_0,8px_8px] [background-size:16px_16px]"
        >
          <img
            src={image.url}
            alt=""
            className="h-full w-full object-contain object-center"
          />
          <div className="absolute inset-x-3 bottom-3">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              className="w-full md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              onClick={onReplaceImage}
            >
              <Upload className="size-4" />
              Choose Image
            </Button>
          </div>
        </Card>
        <div className="px-2">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{image.name}</p>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {getAssetSummary(image, 'Image')}
          </p>
        </div>
      </Card>

      <Card size="sm" className="space-y-3 border border-border/70 bg-background/60 !pt-0">
        <Card
          size="sm"
          className="group relative flex aspect-square items-center justify-center overflow-hidden border border-border/70 bg-muted p-3"
        >
          <audio
            controls
            preload="metadata"
            className="w-full max-w-full"
            src={audio.url}
          />
          <div className="absolute inset-x-3 bottom-3">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              className="w-full md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              onClick={onReplaceAudio}
            >
              <Upload className="size-4" />
              Choose Audio
            </Button>
          </div>
        </Card>
        <div className="px-2">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{audio.name}</p>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {getAssetSummary(audio, 'Audio')}
          </p>
        </div>
      </Card>
    </CardContent>
  </Card>
)
