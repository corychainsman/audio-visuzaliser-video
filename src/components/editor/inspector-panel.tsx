import { useRef, type Dispatch, type SetStateAction } from 'react'
import { AlignCenterHorizontal, AlignCenterVertical, Check, Copy, RotateCcw, StretchHorizontal, StretchVertical } from 'lucide-react'

import { AssetsCard } from '@/components/editor/assets-card'
import { EditorCardHeader } from '@/components/editor/editor-card-header'
import { InspectorFieldGroup } from '@/components/editor/inspector-field-group'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { NumericControl } from '@/components/editor/numeric-control'
import {
  PREVIEW_DURATION_INFINITE,
  clamp,
  createDefaultConfig,
  inferBarCount,
  type EditorConfig,
} from '@/lib/state/schema'

type InspectorPanelProps = {
  config: EditorConfig
  configToken: string
  durationSec: number
  setConfig: Dispatch<SetStateAction<EditorConfig>>
  command: string
  onResetAll: () => void
  onUploadAudio: () => void
  onUploadImage: () => void
  onApplyConfigToken: (value: string) => void
  onCopyConfigToken: () => void
  onCopyCommand: () => void
}

export const InspectorPanel = ({
  config,
  configToken,
  durationSec,
  setConfig,
  command,
  onResetAll,
  onUploadAudio,
  onUploadImage,
  onApplyConfigToken,
  onCopyConfigToken,
  onCopyCommand,
}: InspectorPanelProps) => {
  const updateConfig = (updater: (current: EditorConfig) => EditorConfig) =>
    setConfig((current) => updater(current))
  const configTokenApplyInputRef = useRef<HTMLTextAreaElement | null>(null)
  const defaultConfig = createDefaultConfig()
  const resetPlacement = () =>
    updateConfig((current) => ({
      ...current,
      geometry: {
        ...defaultConfig.geometry,
      },
    }))
  const resetSpectrumStyling = () =>
    updateConfig((current) => ({
      ...current,
      bars: {
        ...defaultConfig.bars,
      },
    }))
  const resetShadow = () =>
    updateConfig((current) => ({
      ...current,
      shadow: {
        ...defaultConfig.shadow,
      },
    }))
  const inferredBarCount = inferBarCount(
    config.geometry.width,
    config.bars.barSpacingPx,
  )
  const bundledAssets = defaultConfig.assets
  const assetsChanged =
    config.assets.image.kind !== bundledAssets.image.kind
    || config.assets.image.name !== bundledAssets.image.name
    || config.assets.image.url !== bundledAssets.image.url
    || config.assets.audio.kind !== bundledAssets.audio.kind
    || config.assets.audio.name !== bundledAssets.audio.name
    || config.assets.audio.url !== bundledAssets.audio.url
  const remainingPreviewDurationSec = Math.max(0, durationSec - config.frame.timeSec)
  const previewDurationMax = Math.max(remainingPreviewDurationSec, 0.01)
  const previewDurationValue =
    Number.isFinite(config.render.previewDurationSec)
      && config.render.previewDurationSec > 0
      ? Math.min(config.render.previewDurationSec, previewDurationMax)
      : previewDurationMax

  return (
    <Card className="h-full w-full min-w-0 border border-border/70 bg-card/80 shadow-lg shadow-black/20 backdrop-blur-md md:sticky md:top-0 md:w-[420px] md:min-w-[420px] md:max-w-[420px]">
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <AssetsCard
            image={config.assets.image}
            audio={config.assets.audio}
            onReplaceImage={onUploadImage}
            onReplaceAudio={onUploadAudio}
            onResetAll={assetsChanged ? onResetAll : undefined}
          />

          <Card className="border-border/70 bg-background/70">
            <EditorCardHeader
              eyebrow="Geometry"
              title="Placement"
              action={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={resetPlacement}
                >
                  <RotateCcw className="size-4" />
                  <span className="sr-only">Reset geometry</span>
                </Button>
              }
            />
            <CardContent className="space-y-5">
              <NumericControl
                label="Width"
                value={config.geometry.width}
                min={20}
                max={config.render.width}
                actions={[
                  {
                    label: 'Maximize width',
                    icon: <StretchHorizontal className="size-3.5" />,
                    onClick: () =>
                      updateConfig((current) => ({
                        ...current,
                        geometry: {
                          ...current.geometry,
                          width: current.render.width,
                        },
                      })),
                  },
                ]}
                onChange={(value) =>
                  updateConfig((current) => ({
                    ...current,
                    geometry: {
                      ...current.geometry,
                      width: clamp(Math.round(value), 20, current.render.width),
                    },
                  }))
                }
              />
              <NumericControl
                label="Height"
                value={config.geometry.maxHeight}
                min={10}
                max={config.render.height}
                actions={[
                  {
                    label: 'Maximize height',
                    icon: <StretchVertical className="size-3.5" />,
                    onClick: () =>
                      updateConfig((current) => ({
                        ...current,
                        geometry: {
                          ...current.geometry,
                          maxHeight: current.render.height,
                        },
                      })),
                  },
                ]}
                onChange={(value) =>
                  updateConfig((current) => ({
                    ...current,
                    geometry: {
                      ...current.geometry,
                      maxHeight: clamp(Math.round(value), 10, current.render.height),
                    },
                  }))
                }
              />
              <NumericControl
                label="X Center"
                value={config.geometry.xCenter}
                min={0}
                max={config.render.width}
                actions={[
                  {
                    label: 'Center horizontally',
                    icon: <AlignCenterHorizontal className="size-3.5" />,
                    onClick: () =>
                      updateConfig((current) => ({
                        ...current,
                        geometry: {
                          ...current.geometry,
                          xCenter: Math.round(current.render.width / 2),
                        },
                      })),
                  },
                ]}
                onChange={(value) =>
                  updateConfig((current) => ({
                    ...current,
                    geometry: {
                      ...current.geometry,
                      xCenter: clamp(Math.round(value), 0, current.render.width),
                    },
                  }))
                }
              />
              <NumericControl
                label="Y Center"
                value={config.geometry.yCenter}
                min={0}
                max={config.render.height}
                actions={[
                  {
                    label: 'Center vertically',
                    icon: <AlignCenterVertical className="size-3.5" />,
                    onClick: () =>
                      updateConfig((current) => ({
                        ...current,
                        geometry: {
                          ...current.geometry,
                          yCenter: Math.round(current.render.height / 2),
                        },
                      })),
                  },
                ]}
                onChange={(value) =>
                  updateConfig((current) => ({
                    ...current,
                    geometry: {
                      ...current.geometry,
                      yCenter: clamp(Math.round(value), 0, current.render.height),
                    },
                  }))
                }
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-background/70">
            <EditorCardHeader
              eyebrow="Spectrum"
              title="Bar Styling"
              action={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={resetSpectrumStyling}
                >
                  <RotateCcw className="size-4" />
                  <span className="sr-only">Reset spectrum styling</span>
                </Button>
              }
            />
            <CardContent className="space-y-5">
              <NumericControl
                label="Spacing"
                value={config.bars.barSpacingPx}
                min={0}
                max={config.render.width/15}
                onChange={(value) =>
                  updateConfig((current) => ({
                    ...current,
                    bars: {
                      ...current.bars,
                      barSpacingPx: clamp(Math.round(value), 0, config.render.width/15),
                    },
                  }))
                }
              />
              <InspectorFieldGroup
                label={
                  <Label className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Inferred Bar Count
                  </Label>
                }
                action={<Badge variant="outline">{inferredBarCount}</Badge>}
                compact
              />
              <NumericControl
                label="Corner Radius"
                value={config.bars.cornerRadiusPx}
                min={0}
                max={20}
                onChange={(value) =>
                  updateConfig((current) => ({
                    ...current,
                    bars: {
                      ...current.bars,
                      cornerRadiusPx: clamp(Math.round(value), 0, 20),
                    },
                  }))
                }
              />
              <InspectorFieldGroup
                label={
                  <Label className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Color
                  </Label>
                }
                action={
                  <Input
                    type="color"
                    className="size-8 p-0"
                    value={config.bars.barColor}
                    onChange={(event) =>
                      updateConfig((current) => ({
                        ...current,
                        bars: {
                          ...current.bars,
                          barColor: event.target.value,
                        },
                      }))
                    }
                  />
                }
                compact
              />
              <NumericControl
                label="Opacity"
                value={config.bars.opacity}
                min={0}
                max={1}
                step={0.01}
                onChange={(value) =>
                  updateConfig((current) => ({
                    ...current,
                    bars: {
                      ...current.bars,
                      opacity: clamp(value, 0, 1),
                    },
                  }))
                }
              />
              <InspectorFieldGroup
                label={
                  <Label
                    htmlFor="bars-mirror"
                    className="text-xs uppercase tracking-[0.28em] text-muted-foreground"
                  >
                    Mirror
                  </Label>
                }
                action={
                  <Checkbox
                    id="bars-mirror"
                    checked={config.bars.mirror}
                    onCheckedChange={(checked) =>
                      updateConfig((current) => ({
                        ...current,
                        bars: {
                          ...current.bars,
                          mirror: checked === true,
                        },
                      }))
                    }
                  />
                }
                compact
              />
              <Collapsible
                open={config.shadow.enabled}
                onOpenChange={(open) =>
                  updateConfig((current) => ({
                    ...current,
                    shadow: {
                      ...current.shadow,
                      enabled: open,
                    },
                  }))
                }
                className="rounded-xl border border-border/70 bg-background/70"
              >
                <InspectorFieldGroup
                  compact
                  className="rounded-none border-0 bg-transparent ring-0"
                  contentClassName="px-4"
                  label={
                    <Label className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                      Shadow
                    </Label>
                  }
                  action={
                    <div className="flex items-center gap-2">
                      {config.shadow.enabled ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={resetShadow}
                        >
                          <RotateCcw className="size-4" />
                          <span className="sr-only">Reset shadow</span>
                        </Button>
                      ) : null}
                      <Switch
                        checked={config.shadow.enabled}
                        onCheckedChange={(checked) =>
                          updateConfig((current) => ({
                            ...current,
                            shadow: {
                              ...current.shadow,
                              enabled: checked,
                            },
                          }))
                        }
                        aria-label="Shadow"
                      />
                    </div>
                  }
                />
                <CollapsibleContent className="border-t border-border/70 px-4 py-4">
                  <div className="space-y-5">
                    <InspectorFieldGroup
                      label={
                        <Label className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                          Color
                        </Label>
                      }
                      action={
                        <Input
                          type="color"
                          className="size-8 p-0"
                          value={config.shadow.color}
                          onChange={(event) =>
                            updateConfig((current) => ({
                              ...current,
                              shadow: {
                                ...current.shadow,
                                color: event.target.value,
                              },
                            }))
                          }
                        />
                      }
                      compact
                    />
                    <NumericControl
                      label="Blur"
                      value={config.shadow.blurPx}
                      min={0}
                      max={50}
                      onChange={(value) =>
                        updateConfig((current) => ({
                          ...current,
                          shadow: {
                            ...current.shadow,
                            blurPx: clamp(Math.round(value), 0, 50),
                          },
                        }))
                      }
                    />
                    <NumericControl
                      label="Offset X"
                      value={config.shadow.offsetXPx}
                      min={-60}
                      max={60}
                      onChange={(value) =>
                        updateConfig((current) => ({
                          ...current,
                          shadow: {
                            ...current.shadow,
                            offsetXPx: clamp(Math.round(value), -60, 60),
                          },
                        }))
                      }
                    />
                    <NumericControl
                      label="Offset Y"
                      value={config.shadow.offsetYPx}
                      min={-60}
                      max={60}
                      onChange={(value) =>
                        updateConfig((current) => ({
                          ...current,
                          shadow: {
                            ...current.shadow,
                            offsetYPx: clamp(Math.round(value), -60, 60),
                          },
                        }))
                      }
                    />
                    <NumericControl
                      label="Opacity"
                      value={config.shadow.opacity}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(value) =>
                        updateConfig((current) => ({
                          ...current,
                          shadow: {
                            ...current.shadow,
                            opacity: clamp(value, 0, 1),
                          },
                        }))
                      }
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-background/70">
            <EditorCardHeader
              eyebrow="Render"
              title="Video Output"
              action={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    updateConfig((current) => ({
                      ...current,
                      render: {
                        ...current.render,
                        ...createDefaultConfig().render,
                      },
                    }))
                  }
                >
                  <RotateCcw className="size-4" />
                  <span className="sr-only">Reset render settings</span>
                </Button>
              }
            />
            <CardContent className="space-y-5">
              <NumericControl
                label="Preview Duration"
                value={previewDurationValue}
                min={0}
                max={previewDurationMax}
                step={0.25}
                inputDisplayValue={String(Math.round(previewDurationValue))}
                onInputDisplayChange={(rawValue: string) => {
                  const nextValue = Number(rawValue)

                  return Number.isFinite(nextValue) ? nextValue : null
                }}
                onChange={(value) =>
                      updateConfig((current) => ({
                        ...current,
                        render: {
                          ...current.render,
                          previewDurationSec:
                            value >= previewDurationMax
                              ? PREVIEW_DURATION_INFINITE
                              : clamp(value, 0, previewDurationMax),
                        },
                      }))
                  }
              />
              <InspectorFieldGroup
                label={
                  <Label className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    Format
                  </Label>
                }
                action={
                  <ToggleGroup
                    type="single"
                    value={config.render.preferredFormat}
                    onValueChange={(value) => {
                      if (value !== 'mp4' && value !== 'webm') {
                        return
                      }

                      updateConfig((current) => ({
                        ...current,
                        render: {
                          ...current.render,
                          preferredFormat: value,
                        },
                      }))
                    }}
                  >
                    <ToggleGroupItem value="mp4">MP4</ToggleGroupItem>
                    <ToggleGroupItem value="webm">WebM</ToggleGroupItem>
                  </ToggleGroup>
                }
                compact
              />
              <InspectorFieldGroup
                label={
                  <Label className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    FPS
                  </Label>
                }
                action={
                  <ToggleGroup
                    type="single"
                    value={String(config.render.fps)}
                    onValueChange={(value) => {
                      if (!value) {
                        return
                      }

                      updateConfig((current) => ({
                        ...current,
                        render: {
                          ...current.render,
                          fps: clamp(Number(value), 12, 60),
                        },
                      }))
                    }}
                  >
                    <ToggleGroupItem value="24">24</ToggleGroupItem>
                    <ToggleGroupItem value="30">30</ToggleGroupItem>
                    <ToggleGroupItem value="60">60</ToggleGroupItem>
                  </ToggleGroup>
                }
                compact
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-background/70">
            <details open>
            <summary className="list-none">
              <EditorCardHeader
                eyebrow="Share"
                title="Config Token"
                withDivider={false}
                className="cursor-pointer"
              />
            </summary>
            <div className="space-y-4 border-t border-border/70 px-4 py-4">
              <InspectorFieldGroup
                label={
                  <Label className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Current token
                  </Label>
                }
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      onCopyConfigToken()
                    }}
                  >
                    <Copy className="size-4" />
                    Copy
                  </Button>
                }
              >
                <textarea
                  key={configToken}
                  readOnly
                  rows={1}
                  className="resize-none w-full rounded-2xl border border-border/70 bg-background px-3 py-2 font-mono text-xs text-foreground outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={configToken}
                  spellCheck={false}
                />
              </InspectorFieldGroup>
              <InspectorFieldGroup
                label={
                  <Label className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Apply token
                  </Label>
                }
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      onApplyConfigToken(
                        configTokenApplyInputRef.current?.value ?? '',
                      )
                    }}
                  >
                    <Check className="size-4" />
                    Apply
                  </Button>
                }
              >
                <textarea
                  ref={configTokenApplyInputRef}
                  rows={1}
                  className="resize-none w-full rounded-2xl border border-border/70 bg-background px-3 py-2 font-mono text-xs text-foreground outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  placeholder="Paste a token to restore a saved config"
                  spellCheck={false}
                />
              </InspectorFieldGroup>
            </div>
            </details>
          </Card>

          <Card className="border-border/70 bg-background/70">
            <details open>
            <summary className="list-none">
              <EditorCardHeader
                eyebrow="Desktop"
                title="FFmpeg Command"
                withDivider={false}
                className="cursor-pointer"
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      onCopyCommand()
                    }}
                  >
                    <Copy className="size-4" />
                    Copy
                  </Button>
                }
              />
            </summary>
            <div className="border-t border-border/70 px-4 py-4">
              <pre className="max-h-64 overflow-auto rounded-2xl bg-background p-4 text-xs text-foreground">
                {command}
              </pre>
            </div>
            </details>
          </Card>
      </CardContent>
    </Card>
  )
}
