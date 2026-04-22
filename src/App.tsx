import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'

import { FrameControls } from '@/components/editor/frame-controls'
import { InspectorPanel } from '@/components/editor/inspector-panel'
import { PreviewSurface } from '@/components/editor/preview-surface'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'
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
  parseConfigToken,
  serializeConfigToken,
} from '@/lib/state/persistence'
import {
  clamp,
  PREVIEW_DURATION_INFINITE,
  createDefaultConfig,
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
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'editor' | 'preview'>('editor')
  const [previewCacheKey, setPreviewCacheKey] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)
  const [renderProgressMessage, setRenderProgressMessage] = useState('')
  const [renderTimings, setRenderTimings] = useState<RenderPhaseTimings | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const audioInputRef = useRef<HTMLInputElement | null>(null)
  const renderAbortControllerRef = useRef<AbortController | null>(null)
  const lastTimingToastRef = useRef<string | null>(null)

  useObjectUrlCleanup(previewUrl)

  useEffect(() => () => renderAbortControllerRef.current?.abort(), [])

  useEffect(() => {
    persistConfig(config)
  }, [config])

  const currentPreviewCacheKey = JSON.stringify(config)

  const setConfig: typeof setConfigState = (value) => {
    setPreviewMode('editor')
    setPreviewUrl(null)
    setPreviewCacheKey(null)

    setConfigState(value)
  }

  const showAnalysisError = (message: string) =>
    toast.error(message, { id: 'analysis-error' })

  const showRenderError = (message: string) =>
    toast.error(message, { id: 'render-error' })

  const showNotice = (message: string) =>
    toast.success(message, { id: 'app-notice' })

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
          showAnalysisError(
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
          showRenderError(error instanceof Error ? error.message : 'Preview failed.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [analysis, config])

  const stopPreview = () => {
    setPreviewMode('editor')
  }

  const cancelRender = () => {
    renderAbortControllerRef.current?.abort()
  }

  const runPreviewRender = async (fullDuration = false) => {
    if (!analysis) {
      return
    }

    if (
      !fullDuration
      && previewUrl
      && previewCacheKey === currentPreviewCacheKey
    ) {
      setPreviewMode('preview')
      return
    }

    if (fullDuration) {
      setPreviewMode('editor')
      setPreviewUrl(null)
      setPreviewCacheKey(null)
    }

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
        showNotice(`Saved ${result.fileName}`)
      } else {
        setPreviewUrl(result.url)
        setPreviewCacheKey(currentPreviewCacheKey)
        setPreviewMode('preview')
      }
    } catch (error) {
      if (error instanceof RenderCanceledError) {
        showNotice('Render canceled')
        return
      }

      showRenderError(
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
  const configToken = useMemo(() => serializeConfigToken(config), [config])

  const copyText = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value)
    showNotice(message)
  }

  const applyConfigToken = (value: string) => {
    const nextConfig = parseConfigToken(value)

    setConfig(nextConfig)
    setIsAnalyzing(true)
    showNotice('Config applied')
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
    }
    setPreviewMode('editor')
    setPreviewUrl(null)
  }

  const durationSec = analysis?.durationSec ?? 0
  const previewAspectRatio = config.render.width / config.render.height
  const renderTimingSummary =
    import.meta.env.DEV && renderTimings
      ? `Export timing: prep ${formatTimingMs(renderTimings.framePrepMs)}, encode ${formatTimingMs(
          renderTimings.ffmpegExecMs,
        )}, finalize ${formatTimingMs(renderTimings.finalizationMs)}, total ${formatTimingMs(
          renderTimings.totalMs,
        )}`
      : null

  useEffect(() => {
    if (!renderTimingSummary || lastTimingToastRef.current === renderTimingSummary) {
      return
    }

    lastTimingToastRef.current = renderTimingSummary
    toast(renderTimingSummary, {
      id: 'render-timing',
      duration: 6000,
    })
  }, [renderTimingSummary])

  return (
    <TooltipProvider>
      <div className="h-dvh overflow-hidden p-3 md:h-screen md:p-6 lg:p-8">
        <div className="flex h-full w-full">
          <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden md:flex-row md:gap-4">
            <div className="flex min-w-0 shrink-0 flex-col gap-3 md:min-h-0 md:flex-1 md:gap-4">
              <PreviewSurface
                canvasRef={canvasRef}
                aspectRatio={previewAspectRatio}
                mode={previewMode}
                previewUrl={previewUrl}
                isBusy={isRendering}
                progressRatio={renderProgress}
                progressMessage={renderProgressMessage}
              onCancel={cancelRender}
              onEnded={stopPreview}
            />

              <FrameControls
                durationSec={durationSec}
                frameTimeSec={config.frame.timeSec}
                previewDurationSec={config.render.previewDurationSec}
                isPlaying={previewMode === 'preview'}
                isBusy={isRendering || isAnalyzing}
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
                onPlay={() => void runPreviewRender(false)}
                onStop={stopPreview}
                onDownloadFullVideo={() => void runPreviewRender(true)}
              />
            </div>

            <InspectorPanel
              config={config}
              configToken={configToken}
              durationSec={durationSec}
              setConfig={setConfig}
              command={command}
              onResetAll={() => setResetOpen(true)}
              onUploadAudio={() => audioInputRef.current?.click()}
              onUploadImage={() => imageInputRef.current?.click()}
              onApplyConfigToken={(value) => {
                try {
                  applyConfigToken(value)
                } catch (error) {
                  showRenderError(
                    error instanceof Error ? error.message : 'Config token is invalid.',
                  )
                }
              }}
              onCopyConfigToken={() =>
                void copyText(configToken, 'Config token copied to clipboard')
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
        <Toaster />

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
