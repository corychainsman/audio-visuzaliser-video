import { useRef, type Dispatch, type SetStateAction } from 'react'
import { Check, Copy, RotateCcw } from 'lucide-react'
import { Crosshair, Maximize2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  onApplyConfigToken: (value: string) => void
  onCopyConfigToken: () => void
  onCopyCommand: () => void
}

const sectionTitleClassName =
  'text-xs uppercase tracking-[0.3em] text-muted-foreground'

export const InspectorPanel = ({
  config,
  configToken,
  durationSec,
  setConfig,
  command,
  onResetAll,
  onApplyConfigToken,
  onCopyConfigToken,
  onCopyCommand,
}: InspectorPanelProps) => {
  const updateConfig = (updater: (current: EditorConfig) => EditorConfig) =>
    setConfig((current) => updater(current))
  const configTokenApplyInputRef = useRef<HTMLTextAreaElement | null>(null)
  const defaultConfig = createDefaultConfig()
  const inferredBarCount = inferBarCount(
    config.geometry.width,
    config.bars.barSpacingPx,
  )
  const previewDurationMax = Math.max(1, Math.min(8, durationSec || 8))
  const previewDurationValue = Number.isFinite(config.render.previewDurationSec)
    && config.render.previewDurationSec > 0
    ? config.render.previewDurationSec
    : previewDurationMax

  return (
    <aside className="h-full min-h-0 rounded-2xl border border-white/70 bg-card/75 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.5)] backdrop-blur-md">
      <div className="h-[calc(100vh-8rem)] min-h-[32rem] overflow-y-auto">
        <div className="space-y-4 p-4">
          <Card className="border-border/70 bg-background/70">
            <CardHeader>
              <div>
                <p className={sectionTitleClassName}>Geometry</p>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="font-heading text-2xl">Placement</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      updateConfig((current) => ({
                        ...current,
                        geometry: {
                          ...createDefaultConfig().geometry,
                        },
                      }))
                    }
                  >
                    <RotateCcw className="size-4" />
                    <span className="sr-only">Reset geometry</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <NumericControl
                label="Width"
                value={config.geometry.width}
                min={20}
                max={config.render.width}
                actions={[
                  {
                    label: 'Maximize width',
                    icon: <Maximize2 className="size-3.5" />,
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
                    icon: <Maximize2 className="size-3.5" />,
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
                    icon: <Crosshair className="size-3.5" />,
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
                    icon: <Crosshair className="size-3.5" />,
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
            <CardHeader>
              <div>
                <p className={sectionTitleClassName}>Bars</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-heading text-2xl">Spectrum Styling</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    updateConfig((current) => ({
                      ...current,
                      bars: {
                        ...defaultConfig.bars,
                      },
                    }))
                  }
                >
                  <RotateCcw className="size-4" />
                  <span className="sr-only">Reset spectrum styling</span>
                </Button>
              </div>
              <NumericControl
                label="Bar Spacing"
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
              <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                <div>
                  <Label className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Inferred Bars
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Derived from width and spacing.
                  </p>
                </div>
                <Badge variant="outline">{inferredBarCount}</Badge>
              </div>
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
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  Bar Color
                </Label>
                <Input
                  type="color"
                  className="h-12 w-full bg-background/70"
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
              </div>
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
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <div className="flex justify-between">
                  <Label
                    htmlFor="bars-mirror"
                    className="text-xs uppercase tracking-[0.28em] text-muted-foreground"
                  >
                    Mirror
                  </Label>
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
                </div>
              </div>
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
                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div>
                    <CardTitle className="font-heading text-2xl">Shadow</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.shadow.enabled ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          updateConfig((current) => ({
                            ...current,
                            shadow: {
                              ...defaultConfig.shadow,
                            },
                          }))
                        }
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
                </div>
                <CollapsibleContent className="border-t border-border/70 px-4 py-4">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                        Shadow Color
                      </Label>
                      <Input
                        type="color"
                        className="h-12 w-full bg-background/70"
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
                    </div>
                    <NumericControl
                      label="Shadow Blur"
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
                      label="Shadow Offset X"
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
                      label="Shadow Offset Y"
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
                      label="Shadow Opacity"
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
            <CardHeader>
              <div>
                <div>
                  <p className={sectionTitleClassName}>Render</p>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="font-heading text-2xl">Video output</CardTitle>
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
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <NumericControl
                label="Preview Duration"
                value={previewDurationValue}
                min={1}
                max={previewDurationMax}
                step={0.25}
                hint={
                  config.render.previewDurationSec === PREVIEW_DURATION_INFINITE
                    ? '∞ uses the full remaining audio from the selected frame'
                    : '∞ uses the full remaining audio from the selected frame'
                }
                actions={[
                  {
                    label: 'Use full preview',
                    icon: <span className="text-[0.7rem] font-semibold">∞</span>,
                    onClick: () =>
                      updateConfig((current) => ({
                        ...current,
                        render: {
                          ...current.render,
                          previewDurationSec: PREVIEW_DURATION_INFINITE,
                        },
                      })),
                  },
                ]}
                onChange={(value) =>
                      updateConfig((current) => ({
                        ...current,
                        render: {
                          ...current.render,
                          previewDurationSec: clamp(value, 1, previewDurationMax),
                        },
                      }))
                  }
              />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                      FPS
                    </Label>
                  </div>
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
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-background/70">
            <details>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className={sectionTitleClassName}>Project</p>
                <p className="font-heading text-2xl">Assets</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  onResetAll()
                }}
              >
                <RotateCcw className="size-4" />
                Reset All
              </Button>
            </summary>
            <div className="space-y-3 border-t border-border/70 px-4 py-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{config.assets.image.name}</Badge>
                <Badge variant="outline">{config.assets.audio.name}</Badge>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Image: {config.assets.image.url}</p>
                <p>Audio: {config.assets.audio.url}</p>
              </div>
            </div>
            </details>
          </Card>

          <Card className="border-border/70 bg-background/70">
            <details>
            <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div>
                <p className={sectionTitleClassName}>Config Token</p>
                <p className="font-heading text-2xl">Share token</p>
              </div>
            </summary>
            <div className="space-y-4 border-t border-border/70 px-4 py-4">
              <div className="space-y-2 rounded-2xl border border-border/70 bg-background/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <Label className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Current token
                  </Label>
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
                </div>
                <textarea
                  key={configToken}
                  readOnly
                  rows={1}
                  className="resize-none w-full rounded-2xl border border-border/70 bg-background px-3 py-2 font-mono text-xs text-foreground outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={configToken}
                  spellCheck={false}
                />
              </div>
              <div className="space-y-2 rounded-2xl border border-border/70 bg-background/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <Label className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Apply token
                  </Label>
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
                </div>
                <textarea
                  ref={configTokenApplyInputRef}
                  rows={1}
                  className="resize-none w-full rounded-2xl border border-border/70 bg-background px-3 py-2 font-mono text-xs text-foreground outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  placeholder="Paste a token to restore a saved config"
                  spellCheck={false}
                />
              </div>
            </div>
            </details>
          </Card>

          <Card className="border-border/70 bg-background/70">
            <details>
            <summary className="cursor-pointer list-none px-4 py-3">
              <div>
                <p className={sectionTitleClassName}>Desktop ffmpeg command</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-heading text-2xl">Copyable shell command</p>
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
                </div>
              </div>
            </summary>
            <div className="border-t border-border/70 px-4 py-4">
              <pre className="max-h-64 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                {command}
              </pre>
            </div>
            </details>
          </Card>
        </div>
      </div>
    </aside>
  )
}
