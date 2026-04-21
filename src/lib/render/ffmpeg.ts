import { FFmpeg, FFFSType } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

import { type AudioAnalysis } from '@/lib/analysis/audio'
import { drawFrame, loadImage } from '@/lib/render/preview'
import { type AssetSource, type EditorConfig } from '@/lib/state/schema'

const FFMPEG_BASE_URL = '/ffmpeg'
const FFMPEG_MT_BASE_URL = '/ffmpeg-mt'
const FFMPEG_CORE_FILE_NAME = 'ffmpeg-core.js'
const FFMPEG_WASM_FILE_NAME = 'ffmpeg-core.wasm'
const FFMPEG_WORKER_FILE_NAME = 'ffmpeg-core.worker.js'
const MULTITHREADED_FFMPEG_QUERY_PARAM = 'ffmpeg'
const MULTITHREADED_FFMPEG_QUERY_VALUE = 'mt'

let ffmpegInstance: FFmpeg | null = null
let ffmpegReady: Promise<FFmpeg> | null = null
let progressListener: ((progress: number) => void) | null = null

export class RenderCanceledError extends Error {
  constructor(message = 'Rendering canceled.') {
    super(message)
    this.name = 'RenderCanceledError'
  }
}

export type RenderProgressUpdate = {
  phase: 'preparing' | 'encoding' | 'finalizing'
  ratio: number
  message: string
}

export type RenderPhaseTimings = {
  framePrepMs: number
  ffmpegExecMs: number
  finalizationMs: number
  totalMs: number
}

const PROGRESS_UPDATE_INTERVAL_MS = 125
const AUDIO_INPUT_MOUNT_POINT = '/input-audio'
const AUDIO_INPUT_FILE_NAME = 'audio.wav'

const getMimeTypeForExtension = (extension: 'mp4' | 'webm') =>
  extension === 'mp4' ? 'video/mp4' : 'video/webm'

const toUint8Array = (value: Uint8Array | string) => {
  if (typeof value === 'string') {
    throw new Error('Unexpected text output from ffmpeg.')
  }

  return value instanceof Uint8Array ? value : new Uint8Array(value)
}

const canUseMultithreadedFfmpeg = () =>
  typeof SharedArrayBuffer !== 'undefined' &&
  Boolean(globalThis.crossOriginIsolated)

const shouldUseMultithreadedFfmpeg = () => {
  if (!canUseMultithreadedFfmpeg()) {
    return false
  }

  const searchParams = new URLSearchParams(globalThis.location?.search ?? '')
  return (
    searchParams.get(MULTITHREADED_FFMPEG_QUERY_PARAM) ===
    MULTITHREADED_FFMPEG_QUERY_VALUE
  )
}

const buildFfmpegAssetUrl = (baseUrl: string, fileName: string) =>
  `${baseUrl}/${fileName}`

const audioBlobCache = new Map<string, Promise<Blob>>()
let mountedAudioSourceKey: string | null = null

const getAudioSourceKey = (source: AssetSource) => `${source.kind}:${source.url}`

const getAudioBlob = async (source: AssetSource) => {
  const sourceKey = getAudioSourceKey(source)

  if (!audioBlobCache.has(sourceKey)) {
    audioBlobCache.set(
      sourceKey,
      fetch(source.url).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${source.name}.`)
        }

        return response.blob()
      }),
    )
  }

  return audioBlobCache.get(sourceKey)!
}

type PreparedAudioInput =
  | {
      mode: 'workerfs'
      inputPath: string
    }
  | {
      mode: 'memfs'
      inputPath: string
      bytes: Uint8Array
    }

const prepareAudioInput = async (
  ffmpeg: FFmpeg,
  source: AssetSource,
): Promise<PreparedAudioInput> => {
  const sourceKey = getAudioSourceKey(source)

  if (mountedAudioSourceKey === sourceKey) {
    return {
      mode: 'workerfs',
      inputPath: `${AUDIO_INPUT_MOUNT_POINT}/${AUDIO_INPUT_FILE_NAME}`,
    }
  }

  if (mountedAudioSourceKey) {
    try {
      await ffmpeg.unmount(AUDIO_INPUT_MOUNT_POINT)
    } catch {
      // Ignore unmount failures when switching inputs.
    }
    mountedAudioSourceKey = null
  }

  const blob = await getAudioBlob(source)

  try {
    try {
      await ffmpeg.createDir(AUDIO_INPUT_MOUNT_POINT)
    } catch {
      // The mount point may already exist from a previous render.
    }

    await ffmpeg.mount(
      FFFSType.WORKERFS,
      {
        blobs: [{ name: AUDIO_INPUT_FILE_NAME, data: blob }],
      },
      AUDIO_INPUT_MOUNT_POINT,
    )
    mountedAudioSourceKey = sourceKey
    return {
      mode: 'workerfs',
      inputPath: `${AUDIO_INPUT_MOUNT_POINT}/${AUDIO_INPUT_FILE_NAME}`,
    }
  } catch {
    const audioBytes = new Uint8Array(await blob.arrayBuffer())
    return {
      mode: 'memfs',
      inputPath: AUDIO_INPUT_FILE_NAME,
      bytes: audioBytes,
    }
  }
}

const createProgressReporter = (
  onProgress?: (update: RenderProgressUpdate) => void,
) => {
  let lastProgressAt = 0

  return (update: RenderProgressUpdate, force = false) => {
    if (!onProgress) {
      return
    }

    const now = performance.now()
    if (force || now - lastProgressAt >= PROGRESS_UPDATE_INTERVAL_MS) {
      lastProgressAt = now
      onProgress(update)
    }
  }
}

const loadFfmpegCore = async (
  baseUrl: string,
  useMultithreadedCore: boolean,
) => {
  const ffmpeg = new FFmpeg()
  ffmpeg.on('progress', ({ progress }) => {
    progressListener?.(progress)
  })

  const [coreURL, wasmURL, workerURL] = await Promise.all([
    toBlobURL(
      buildFfmpegAssetUrl(baseUrl, FFMPEG_CORE_FILE_NAME),
      'text/javascript',
    ),
    toBlobURL(
      buildFfmpegAssetUrl(baseUrl, FFMPEG_WASM_FILE_NAME),
      'application/wasm',
    ),
    useMultithreadedCore
      ? toBlobURL(
          buildFfmpegAssetUrl(baseUrl, FFMPEG_WORKER_FILE_NAME),
          'text/javascript',
        )
      : Promise.resolve(null),
  ])

  await ffmpeg.load(
    useMultithreadedCore && workerURL
      ? {
          coreURL,
          wasmURL,
          workerURL,
        }
      : {
          coreURL,
          wasmURL,
        },
  )

  return ffmpeg
}

const ensureFfmpeg = async () => {
  if (ffmpegInstance) {
    return ffmpegInstance
  }

  if (!ffmpegReady) {
    ffmpegReady = (async () => {
      if (shouldUseMultithreadedFfmpeg()) {
        try {
          return await loadFfmpegCore(FFMPEG_MT_BASE_URL, true)
        } catch {
          // Fall back to the single-threaded loader if the mt assets fail.
        }
      }

      return loadFfmpegCore(FFMPEG_BASE_URL, false)
    })()
      .then((ffmpeg) => {
        ffmpegInstance = ffmpeg
        return ffmpeg
      })
      .catch((error) => {
        ffmpegReady = null
        ffmpegInstance = null
        throw error
      })
  }

  return ffmpegReady
}

const renderFrameBlob = async (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality = 0.94,
) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to serialize preview frame.'))
          return
        }

        resolve(blob)
      },
      mimeType,
      quality,
    )
  })

type RenderVideoOptions = {
  config: EditorConfig
  analysis: AudioAnalysis
  startTimeSec: number
  durationSec: number
  onProgress?: (update: RenderProgressUpdate) => void
  onTiming?: (timings: RenderPhaseTimings) => void
  signal?: AbortSignal
}

type RenderVideoResult = {
  format: 'mp4' | 'webm'
  url: string
  fileName: string
}

const resetFfmpegState = () => {
  progressListener = null
  ffmpegInstance = null
  ffmpegReady = null
  mountedAudioSourceKey = null
}

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new RenderCanceledError()
  }
}

const attemptEncode = async (
  ffmpeg: FFmpeg,
  outputExtension: 'mp4' | 'webm',
  fps: number,
  durationSec: number,
  startTimeSec: number,
  audioInputPath: string,
  signal?: AbortSignal,
) => {
  const outputName = `output.${outputExtension}`
  const args =
    outputExtension === 'mp4'
      ? [
          '-framerate',
          `${fps}`,
          '-i',
          'frame-%05d.jpg',
          '-ss',
          `${startTimeSec}`,
          '-t',
          `${durationSec}`,
          '-i',
          audioInputPath,
          '-map',
          '0:v:0',
          '-map',
          '1:a:0',
          '-shortest',
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '20',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '256k',
          outputName,
        ]
      : [
          '-framerate',
          `${fps}`,
          '-i',
          'frame-%05d.jpg',
          '-ss',
          `${startTimeSec}`,
          '-t',
          `${durationSec}`,
          '-i',
          audioInputPath,
          '-map',
          '0:v:0',
          '-map',
          '1:a:0',
          '-shortest',
          '-c:v',
          'libvpx-vp9',
          '-b:v',
          '2M',
          '-c:a',
          'libopus',
          outputName,
        ]

  await ffmpeg.exec(args, undefined, { signal })
  throwIfAborted(signal)
  const output = toUint8Array(await ffmpeg.readFile(outputName, undefined, { signal }))
  await ffmpeg.deleteFile(outputName, { signal })
  return output
}

export const renderVideo = async ({
  config,
  analysis,
  startTimeSec,
  durationSec,
  onProgress,
  onTiming,
  signal,
}: RenderVideoOptions): Promise<RenderVideoResult> => {
  const ffmpeg = await ensureFfmpeg()
  const reportProgress = createProgressReporter(onProgress)
  const renderStartedAt = performance.now()
  let framePrepStartedAt = renderStartedAt
  let framePrepFinishedAt = renderStartedAt
  let ffmpegExecStartedAt = renderStartedAt
  let ffmpegExecFinishedAt = renderStartedAt
  let renderSucceeded = false
  const canvas = document.createElement('canvas')
  const totalFrames = Math.max(1, Math.ceil(durationSec * config.render.fps))
  const inputFiles: string[] = []
  const cancelRender = () => {
    try {
      ffmpeg.terminate()
    } catch {
      // Ignore termination failures while aborting.
    } finally {
      resetFfmpegState()
    }
  }

  try {
    signal?.addEventListener('abort', cancelRender, { once: true })
    throwIfAborted(signal)

    progressListener = (progress) => {
      const weightedRatio = 0.72 + progress * 0.26
      reportProgress({
        phase: 'encoding',
        ratio: Math.min(weightedRatio, 0.98),
        message: `Encoding video ${Math.round(progress * 100)}%`,
      })
    }

    reportProgress(
      {
        phase: 'preparing',
        ratio: 0.02,
        message: 'Preparing media inputs',
      },
      true,
    )

    framePrepStartedAt = performance.now()
    const [image, audioInput] = await Promise.all([
      loadImage(config.assets.image),
      prepareAudioInput(ffmpeg, config.assets.audio),
    ])
    throwIfAborted(signal)

    if (audioInput.mode === 'memfs') {
      await ffmpeg.writeFile(audioInput.inputPath, audioInput.bytes, { signal })
      inputFiles.push(audioInput.inputPath)
    }

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
      throwIfAborted(signal)
      const timeSec = startTimeSec + frameIndex / config.render.fps

      drawFrame({
        canvas,
        image,
        config,
        analysis,
        timeSec,
      })

      const blob = await renderFrameBlob(canvas, 'image/jpeg')
      throwIfAborted(signal)
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const name = `frame-${String(frameIndex).padStart(5, '0')}.jpg`
      await ffmpeg.writeFile(name, bytes, { signal })
      inputFiles.push(name)

      const frameRatio = (frameIndex + 1) / totalFrames
      reportProgress({
        phase: 'preparing',
        ratio: 0.04 + frameRatio * 0.66,
        message: `Preparing frames ${frameIndex + 1}/${totalFrames}`,
      })
    }
    framePrepFinishedAt = performance.now()

    const preferredFormats: Array<'mp4' | 'webm'> =
      config.render.preferredFormat === 'mp4' ? ['mp4', 'webm'] : ['webm', 'mp4']

    let outputFormat: 'mp4' | 'webm' | null = null
    let outputBytes: Uint8Array | null = null
    let lastError: Error | null = null

    for (const format of preferredFormats) {
      try {
        ffmpegExecStartedAt = performance.now()
        reportProgress(
          {
            phase: 'encoding',
            ratio: 0.72,
            message: 'Encoding video 0%',
          },
          true,
        )
        outputBytes = await attemptEncode(
          ffmpeg,
          format,
          config.render.fps,
          durationSec,
          startTimeSec,
          audioInput.inputPath,
          signal,
        )
        ffmpegExecFinishedAt = performance.now()
        outputFormat = format
        break
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Render failed.')
      }
    }

    if (!outputBytes || !outputFormat) {
      throw lastError ?? new Error('No supported video codec was available.')
    }

    reportProgress(
      {
        phase: 'finalizing',
        ratio: 1,
        message: 'Finalizing download',
      },
      true,
    )

    const blob = new Blob([new Uint8Array(outputBytes)], {
      type: getMimeTypeForExtension(outputFormat),
    })
    const url = URL.createObjectURL(blob)
    renderSucceeded = true

    return {
      format: outputFormat,
      url,
      fileName: `audio-visualizer-${Date.now()}.${outputFormat}`,
    }
  } catch (error) {
    if (
      error instanceof RenderCanceledError ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      throw new RenderCanceledError()
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error('Video rendering failed.')
  } finally {
    signal?.removeEventListener('abort', cancelRender)
    progressListener = null
    await Promise.all(
      inputFiles.map(async (fileName) => {
        try {
          await ffmpeg.deleteFile(fileName)
        } catch {
          // Ignore cleanup failures from partially written runs.
        }
      }),
    )

    if (renderSucceeded) {
      const renderFinishedAt = performance.now()
      onTiming?.({
        framePrepMs: framePrepFinishedAt - framePrepStartedAt,
        ffmpegExecMs: ffmpegExecFinishedAt - ffmpegExecStartedAt,
        finalizationMs: renderFinishedAt - ffmpegExecFinishedAt,
        totalMs: renderFinishedAt - renderStartedAt,
      })
    }
  }
}

export const createDesktopFfmpegCommand = (
  config: EditorConfig,
  analysis: AudioAnalysis | null,
) => {
  const richestTime =
    analysis?.richestFrameTimeSec ?? config.frame.timeSec

  return [
    'ffmpeg',
    '-loop 1',
    '-i ./input-image.jpg',
    '-i ./input-audio.wav',
    `-filter_complex "[1:a]showfreqs=s=${config.geometry.width}x${config.geometry.maxHeight}:mode=bar:fscale=log:colors=${config.bars.barColor.replace(
      '#',
      '0x',
    )}[viz];[0:v][viz]overlay=${Math.round(
      config.geometry.xCenter - config.geometry.width / 2,
    )}:${Math.round(config.geometry.yCenter - config.geometry.maxHeight / 2)}"`,
    `-t ${(analysis?.durationSec ?? richestTime + config.render.previewDurationSec).toFixed(2)}`,
    '-c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 256k',
    './audio-visualizer-output.mp4',
  ].join(' ')
}
