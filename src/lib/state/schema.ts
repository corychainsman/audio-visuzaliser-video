const resolvePublicAssetUrl = (assetPath: string) =>
  `${import.meta.env.BASE_URL}${assetPath.replace(/^\/+/, '')}`

export const DEFAULT_IMAGE_URL = resolvePublicAssetUrl(
  'assets/default-image/porsche.jpeg',
)
export const DEFAULT_AUDIO_URL = resolvePublicAssetUrl(
  'assets/default-audio/911-turbo-s-enginesound.wav',
)

export type AssetSource = {
  kind: 'bundled' | 'uploaded'
  name: string
  url: string
  mimeType?: string
  uploadedFile?: {
    name: string
    sizeBytes: number
    lastModifiedMs: number
  }
}

export type EditorConfig = {
  version: 1
  assets: {
    image: AssetSource
    audio: AssetSource
  }
  frame: {
    timeSec: number
  }
  geometry: {
    width: number
    maxHeight: number
    xCenter: number
    yCenter: number
  }
  bars: {
    barCount: number
    cornerRadiusPx: number
    barColor: string
    opacity: number
    mirror: boolean
  }
  shadow: {
    enabled: boolean
    color: string
    blurPx: number
    offsetXPx: number
    offsetYPx: number
    opacity: number
  }
  render: {
    width: number
    height: number
    fps: number
    previewDurationSec: number
    preferredFormat: 'mp4' | 'webm'
  }
}

export type NormalizableEditorConfig = Partial<Omit<EditorConfig, 'bars'>> & {
  bars?: Partial<EditorConfig['bars']> & {
    barSpacingPx?: number
  }
}

export const PREVIEW_DURATION_INFINITE = 0

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const getMaxBarSpacing = (renderWidth: number) =>
  Math.max(0, Math.floor(renderWidth / 15))

export const createDefaultConfig = (): EditorConfig => {
  const renderWidth = 1280
  const renderHeight = 720

  return {
    version: 1,
    assets: {
      image: {
        kind: 'bundled',
        name: 'porsche.jpeg',
        url: DEFAULT_IMAGE_URL,
      },
      audio: {
        kind: 'bundled',
        name: '911-turbo-s-enginesound.wav',
        url: DEFAULT_AUDIO_URL,
      },
    },
    frame: {
      timeSec: 6.458333333333329,
    },
    geometry: {
      width: 1280,
      maxHeight: 720,
      xCenter: 640,
      yCenter: 360,
    },
    bars: {
      barCount: 214,
      cornerRadiusPx: 20,
      barColor: '#ffffff',
      opacity: 0.67,
      mirror: true,
    },
    shadow: {
      enabled: false,
      color: '#000000',
      blurPx: 16,
      offsetXPx: 0,
      offsetYPx: 6,
      opacity: 0.32,
    },
    render: {
      width: renderWidth,
      height: renderHeight,
      fps: 24,
      previewDurationSec: 2,
      preferredFormat: 'mp4',
    },
  }
}

export const inferBarCount = (
  width: number,
  barSpacingPx: number,
) => {
  const safeWidth = Math.max(1, Math.round(width))
  const safeSpacing = clamp(Math.round(barSpacingPx), 0, safeWidth - 1)

  return Math.max(1, Math.floor((safeWidth + safeSpacing) / (1 + safeSpacing)))
}

export const inferBarSpacing = (
  width: number,
  barCount: number,
  maxSpacingPx = Number.POSITIVE_INFINITY,
) => {
  const safeWidth = Math.max(1, Math.round(width))
  const safeCount = clamp(Math.round(barCount), 1, safeWidth)

  if (safeCount <= 1) {
    return clamp(safeWidth - 1, 0, maxSpacingPx)
  }

  const rawSpacing = (safeWidth - safeCount) / (safeCount - 1)

  return clamp(Math.round(rawSpacing), 0, maxSpacingPx)
}

export const normalizeBarCount = (
  width: number,
  renderWidth: number,
  barCount: number,
) => {
  const safeWidth = Math.max(1, Math.round(width))
  const maxSpacing = getMaxBarSpacing(renderWidth)
  const minBarCount = inferBarCount(safeWidth, maxSpacing)

  return clamp(Math.round(barCount), minBarCount, safeWidth)
}

export const normalizeConfig = (
  candidate: NormalizableEditorConfig | null | undefined,
): EditorConfig => {
  const defaults = createDefaultConfig()
  const candidateGeometryWidth =
    candidate?.geometry?.width ?? defaults.geometry.width
  const legacyBarCount =
    candidate?.bars?.barCount
    ?? (
      candidate?.bars?.barSpacingPx !== undefined
        ? inferBarCount(candidateGeometryWidth, candidate.bars.barSpacingPx)
        : undefined
    )

  const config: EditorConfig = {
    ...defaults,
    ...candidate,
    assets: {
      image: {
        ...defaults.assets.image,
        ...candidate?.assets?.image,
      },
      audio: {
        ...defaults.assets.audio,
        ...candidate?.assets?.audio,
      },
    },
    frame: {
      ...defaults.frame,
      ...candidate?.frame,
    },
    geometry: {
      ...defaults.geometry,
      ...candidate?.geometry,
    },
    bars: {
      barCount: legacyBarCount ?? defaults.bars.barCount,
      cornerRadiusPx:
        candidate?.bars?.cornerRadiusPx ?? defaults.bars.cornerRadiusPx,
      barColor: candidate?.bars?.barColor ?? defaults.bars.barColor,
      opacity: candidate?.bars?.opacity ?? defaults.bars.opacity,
      mirror: candidate?.bars?.mirror ?? defaults.bars.mirror,
    },
    shadow: {
      ...defaults.shadow,
      ...candidate?.shadow,
    },
    render: {
      ...defaults.render,
      ...candidate?.render,
    },
  }

  config.frame.timeSec = Math.max(0, config.frame.timeSec)
  config.geometry.width = clamp(
    Math.round(config.geometry.width),
    20,
    config.render.width,
  )
  config.geometry.maxHeight = clamp(
    Math.round(config.geometry.maxHeight),
    10,
    config.render.height,
  )
  config.geometry.xCenter = clamp(
    Math.round(config.geometry.xCenter),
    0,
    config.render.width,
  )
  config.geometry.yCenter = clamp(
    Math.round(config.geometry.yCenter),
    0,
    config.render.height,
  )
  config.bars.barCount = normalizeBarCount(
    config.geometry.width,
    config.render.width,
    config.bars.barCount,
  )
  config.bars.cornerRadiusPx = clamp(
    Math.round(config.bars.cornerRadiusPx),
    0,
    20,
  )
  config.bars.opacity = clamp(config.bars.opacity, 0, 1)
  config.shadow.blurPx = clamp(Math.round(config.shadow.blurPx), 0, 50)
  config.shadow.offsetXPx = clamp(Math.round(config.shadow.offsetXPx), -60, 60)
  config.shadow.offsetYPx = clamp(Math.round(config.shadow.offsetYPx), -60, 60)
  config.shadow.opacity = clamp(config.shadow.opacity, 0, 1)
  config.render.fps = clamp(Math.round(config.render.fps), 12, 60)
  config.render.previewDurationSec =
    config.render.previewDurationSec === PREVIEW_DURATION_INFINITE
      ? PREVIEW_DURATION_INFINITE
      : clamp(config.render.previewDurationSec, 0, 8)

  return config
}

export const normalizePersistedConfig = (
  candidate: NormalizableEditorConfig | null | undefined,
) => {
  const normalized = normalizeConfig(candidate)

  return {
    ...normalized,
    assets: {
      image:
        normalized.assets.image.kind === 'uploaded'
          ? createDefaultConfig().assets.image
          : normalized.assets.image,
      audio:
        normalized.assets.audio.kind === 'uploaded'
          ? createDefaultConfig().assets.audio
          : normalized.assets.audio,
    },
  }
}
