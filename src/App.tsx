import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AlertTriangle,
} from 'lucide-react'

import { ActionBar } from '@/components/editor/action-bar'
import { FrameControls } from '@/components/editor/frame-controls'
import { InspectorPanel } from '@/components/editor/inspector-panel'
import { PreviewSurface } from '@/components/editor/preview-surface'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TooltipProvider } from '@/components/ui/tooltip'
import { analyzeAudioSource, type AudioAnalysis } from '@/lib/analysis/audio'
import {
  createDesktopFfmpegCommand,
  RenderCanceledError,
  type RenderPhaseTimings,
  type RenderProgressUpdate,
  renderVideo,
} from '@/lib/render/ffmpeg'
import { drawFrame, loadImage } from '@/lib/render/preview'
import {
  clearPersistedConfig,
  loadPersistedConfig,
  persistConfig,
} from '@/lib/state/persistence'
import {
  clamp,
  PREVIEW_DURATION_INFINITE,
  createDefaultConfig,
  normalizeConfig,
  type AssetSource,
  type EditorConfig,
} from '@/lib/state/schema'

const createDownload = (url: string, fileName: string) => {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  if (url.startsWith('blob:')) {
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }
}

const serializeConfig = (config: EditorConfig) =>
  JSON.stringify(normalizeConfig(config), null, 2)

const formatTimingMs = (value: number) =>
  value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(2)}s`

const getPreviewDurationSec = (
  config: EditorConfig,
  analysis: AudioAnalysis,
) => {
  const previewDurationSec = config.render.previewDurationSec

  if (!Number.isFinite(previewDurationSec) || previewDurationSec <= 0) {
    return Math.max(0, analysis.durationSec - config.frame.timeSec)
  }

  return Math.min(
    previewDurationSec,
    Math.max(0, analysis.durationSec - config.frame.timeSec),
  )
}

const useObjectUrlCleanup = (value: string | null) => {
  const previousValueRef = useRef<string | null>(null)

  useEffect(() => {
    if (previousValueRef.current && previousValueRef.current !== value) {
      URL.revokeObjectURL(previousValueRef.current)
    }

    previousValueRef.current = value

    return () => {
      if (previousValueRef.current) {
        URL.revokeObjectURL(previousValueRef.current)
      }
    }
  }, [value])
}

function App() {
  const [config, setConfigState] = useState<EditorConfig>(() => loadPersistedConfig())
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'editor' | 'preview'>('editor')
  const [isRendering, setIsRendering] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)
  const [renderProgressMessage, setRenderProgressMessage] = useState('')
  const [renderTimings, setRenderTimings] = useState<RenderPhaseTimings | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const audioInputRef = useRef<HTMLInputElement | null>(null)
  const renderAbortControllerRef = useRef<AbortController | null>(null)

  useObjectUrlCleanup(previewUrl)

  useEffect(() => () => renderAbortControllerRef.current?.abort(), [])

  useEffect(() => {
    persistConfig(config)
  }, [config])

  const setConfig: typeof setConfigState = (value) => {
    if (previewMode === 'preview') {
      setPreviewMode('editor')
      setPreviewUrl(null)
    }

    setConfigState(value)
  }

  useEffect(() => {
    let cancelled = false

    analyzeAudioSource(config.assets.audio)
      .then((nextAnalysis) => {
        if (cancelled) {
          return
        }

        setAnalysis(nextAnalysis)
        setConfigState((current) => ({
          ...current,
          frame: {
            timeSec:
              current.assets.audio.url === config.assets.audio.url
                ? clamp(
                    current.frame.timeSec || nextAnalysis.richestFrameTimeSec,
                    0,
                    nextAnalysis.durationSec,
                  )
                : nextAnalysis.richestFrameTimeSec,
          },
        }))
      })
      .catch((error) => {
        if (!cancelled) {
          setAnalysisError(
            error instanceof Error ? error.message : 'Audio analysis failed.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsAnalyzing(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [config.assets.audio])

  useEffect(() => {
    if (!analysis || !canvasRef.current) {
      return
    }

    let cancelled = false

    loadImage(config.assets.image)
      .then((image) => {
        if (cancelled || !canvasRef.current) {
          return
        }

        drawFrame({
          canvas: canvasRef.current,
          image,
          config,
          analysis,
          timeSec: config.frame.timeSec,
        })
      })
      .catch((error) => {
        if (!cancelled) {
          setRenderError(error instanceof Error ? error.message : 'Preview failed.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [analysis, config])

  const stopPreview = () => {
    setPreviewMode('editor')
    setPreviewUrl(null)
  }

  const cancelRender = () => {
    renderAbortControllerRef.current?.abort()
  }

  const runPreviewRender = async (fullDuration = false) => {
    if (!analysis) {
      return
    }

    if (fullDuration) {
      setPreviewMode('editor')
      setPreviewUrl(null)
    }

    setRenderError(null)
    setIsRendering(true)
    setRenderProgress(0)
    setRenderProgressMessage(
      fullDuration ? 'Preparing full video render' : 'Preparing preview render',
    )
    setRenderTimings(null)
    const abortController = new AbortController()
    renderAbortControllerRef.current = abortController
    try {
      const durationSec = fullDuration
        ? analysis.durationSec
        : getPreviewDurationSec(config, analysis)
      const startTimeSec = fullDuration
        ? 0
        : config.render.previewDurationSec === PREVIEW_DURATION_INFINITE
          ? config.frame.timeSec
        : clamp(
            config.frame.timeSec - durationSec / 2,
            0,
            Math.max(0, analysis.durationSec - durationSec),
          )

      const handleProgress = (update: RenderProgressUpdate) => {
        setRenderProgress(update.ratio)
        setRenderProgressMessage(update.message)
      }

      const result = await renderVideo({
        config,
        analysis,
        durationSec,
        startTimeSec,
        onProgress: handleProgress,
        onTiming: setRenderTimings,
        signal: abortController.signal,
      })

      if (fullDuration) {
        createDownload(result.url, result.fileName)
        setNotice(`Saved ${result.fileName}`)
      } else {
        setPreviewUrl(result.url)
        setPreviewMode('preview')
      }
    } catch (error) {
      if (error instanceof RenderCanceledError) {
        setNotice('Render canceled')
        return
      }

      setRenderError(
        error instanceof Error
          ? error.message
          : 'Media generation failed due to codec or memory limits.',
      )
    } finally {
      if (renderAbortControllerRef.current === abortController) {
        renderAbortControllerRef.current = null
      }
      setIsRendering(false)
      setRenderProgress(0)
      setRenderProgressMessage('')
    }
  }

  const keyboardHandler = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null
    const isEditable =
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      target?.isContentEditable

    if (event.key === 'Escape' && isRendering) {
      event.preventDefault()
      cancelRender()
      return
    }

    if (event.key === 'Escape' && previewMode === 'preview') {
      event.preventDefault()
      stopPreview()
      return
    }

    if (event.code === 'Space' && !isEditable) {
      event.preventDefault()
      if (previewMode === 'preview') {
        stopPreview()
      } else if (!isRendering) {
        void runPreviewRender(false)
      }
      return
    }

    if (isEditable || !analysis) {
      return
    }

    if (event.ctrlKey && event.key === 'ArrowLeft') {
      event.preventDefault()
      setConfig((current) => ({
        ...current,
        frame: {
          timeSec: clamp(current.frame.timeSec - 1 / current.render.fps, 0, analysis.durationSec),
        },
      }))
    }

    if (event.ctrlKey && event.key === 'ArrowRight') {
      event.preventDefault()
      setConfig((current) => ({
        ...current,
        frame: {
          timeSec: clamp(current.frame.timeSec + 1 / current.render.fps, 0, analysis.durationSec),
        },
      }))
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', keyboardHandler)
    return () => window.removeEventListener('keydown', keyboardHandler)
  }, [])

  const command = useMemo(
    () => createDesktopFfmpegCommand(config, analysis),
    [analysis, config],
  )
  const serializedConfig = useMemo(() => serializeConfig(config), [config])

  const copyText = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value)
    setNotice(message)
  }

  const exportConfig = () => {
    const blob = new Blob([serializedConfig], { type: 'application/json' })
    createDownload(URL.createObjectURL(blob), 'audio-visualizer-config.json')
    setNotice('Config exported')
  }

  const updateAsset = (kind: 'image' | 'audio', file: File) => {
    const source: AssetSource = {
      kind: 'uploaded',
      name: file.name,
      url: URL.createObjectURL(file),
      mimeType: file.type || undefined,
      uploadedFile: {
        name: file.name,
        sizeBytes: file.size,
        lastModifiedMs: file.lastModified,
      },
    }

    setConfig((current) => ({
      ...current,
      assets: {
        ...current.assets,
        [kind]: source,
      },
      frame:
        kind === 'audio'
          ? {
              timeSec: 0,
            }
          : current.frame,
    }))
    if (kind === 'audio') {
      setIsAnalyzing(true)
      setAnalysisError(null)
    }
    setPreviewMode('editor')
    setPreviewUrl(null)
  }

  const durationSec = analysis?.durationSec ?? 0
  const renderTimingSummary =
    import.meta.env.DEV && renderTimings
      ? `Export timing: prep ${formatTimingMs(renderTimings.framePrepMs)}, encode ${formatTimingMs(
          renderTimings.ffmpegExecMs,
        )}, finalize ${formatTimingMs(renderTimings.finalizationMs)}, total ${formatTimingMs(
          renderTimings.totalMs,
        )}`
      : null

  return (
    <TooltipProvider>
      <div className="min-h-screen px-4 py-5 md:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
          <ActionBar
            isPlaying={previewMode === 'preview'}
            isBusy={isRendering || isAnalyzing}
            onPlay={() => void runPreviewRender(false)}
            onStop={stopPreview}
            onGenerateVideo={() => void runPreviewRender(true)}
            onUploadAudio={() => audioInputRef.current?.click()}
            onUploadImage={() => imageInputRef.current?.click()}
          />

          <main className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-4">
              <PreviewSurface
                canvasRef={canvasRef}
                mode={previewMode}
                previewUrl={previewUrl}
                isBusy={isRendering}
                progressRatio={renderProgress}
                progressMessage={renderProgressMessage}
                onCancel={cancelRender}
              />

              <FrameControls
                durationSec={durationSec}
                frameTimeSec={config.frame.timeSec}
                onChange={(value) =>
                  setConfig((current) => ({
                    ...current,
                    frame: {
                      timeSec: clamp(value, 0, durationSec || value),
                    },
                  }))
                }
                onNudge={(delta) =>
                  setConfig((current) => ({
                    ...current,
                    frame: {
                      timeSec: clamp(current.frame.timeSec + delta, 0, durationSec || 0),
                    },
                  }))
                }
                onAutoPick={() => {
                  if (!analysis) {
                    return
                  }

                  setConfig((current) => ({
                    ...current,
                    frame: {
                      timeSec: analysis.richestFrameTimeSec,
                    },
                  }))
                }}
              />

              {analysisError || renderError ? (
                <Card className="border-destructive/30 bg-destructive/10 text-destructive">
                  <CardContent className="flex items-start gap-3 p-4 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <p>{analysisError ?? renderError}</p>
                  </CardContent>
                </Card>
              ) : null}

              {notice ? (
                <Card className="border-border/70 bg-card/75">
                  <CardContent className="px-4 py-3 text-sm text-muted-foreground">
                    {notice}
                  </CardContent>
                </Card>
              ) : null}

              {renderTimingSummary ? (
                <Card className="border-border/70 bg-card/75">
                  <CardContent className="px-4 py-3 text-sm text-muted-foreground">
                    {renderTimingSummary}
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <InspectorPanel
              config={config}
              durationSec={durationSec}
              setConfig={setConfig}
              serializedConfig={serializedConfig}
              command={command}
              onResetAll={() => setResetOpen(true)}
              onExportConfig={exportConfig}
              onCopyConfig={() =>
                void copyText(serializedConfig, 'Config copied to clipboard')
              }
              onCopyCommand={() =>
                void copyText(command, 'Command copied to clipboard')
              }
            />
          </main>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              updateAsset('image', file)
            }
            event.currentTarget.value = ''
          }}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              updateAsset('audio', file)
            }
            event.currentTarget.value = ''
          }}
        />

        <Dialog open={resetOpen} onOpenChange={setResetOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset editor?</DialogTitle>
              <DialogDescription>
                This clears persisted settings and restores the bundled default assets.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => {
                  clearPersistedConfig()
                  setIsAnalyzing(true)
                  setAnalysisError(null)
                  setConfig(createDefaultConfig())
                  stopPreview()
                  setResetOpen(false)
                }}
              >
                Reset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

export default App
