import { getBinsAtTime, type AudioAnalysis } from '@/lib/analysis/audio'
import {
  clamp,
  getMaxBarSpacing,
  inferBarSpacing,
  type AssetSource,
  type EditorConfig,
} from '@/lib/state/schema'

type DrawFrameOptions = {
  canvas: HTMLCanvasElement
  image: HTMLImageElement
  config: EditorConfig
  analysis: AudioAnalysis
  timeSec: number
}

type RenderSession = {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  staticCanvas: HTMLCanvasElement
  staticContext: CanvasRenderingContext2D
  width: number
  height: number
  image: HTMLImageElement | null
  staticLayerReady: boolean
}

const applyShadow = (
  context: CanvasRenderingContext2D,
  config: EditorConfig,
) => {
  if (!config.shadow.enabled) {
    context.shadowColor = 'transparent'
    context.shadowBlur = 0
    context.shadowOffsetX = 0
    context.shadowOffsetY = 0
    return
  }

  const alpha = clamp(config.shadow.opacity, 0, 1)
  const color = config.shadow.color
  const expanded = color.startsWith('#') && color.length === 7 ? `${color}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}` : color

  context.shadowColor = expanded
  context.shadowBlur = config.shadow.blurPx
  context.shadowOffsetX = config.shadow.offsetXPx
  context.shadowOffsetY = config.shadow.offsetYPx
}

const withAlpha = (hexColor: string, alpha: number) => {
  const normalizedAlpha = clamp(alpha, 0, 1)

  if (hexColor.startsWith('#') && hexColor.length === 7) {
    return `${hexColor}${Math.round(normalizedAlpha * 255)
      .toString(16)
      .padStart(2, '0')}`
  }

  return hexColor
}

const renderSessions = new WeakMap<HTMLCanvasElement, RenderSession>()

const createRenderSession = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas 2D context unavailable.')
  }

  const staticCanvas = document.createElement('canvas')
  const staticContext = staticCanvas.getContext('2d')

  if (!staticContext) {
    throw new Error('Canvas 2D context unavailable.')
  }

  return {
    canvas,
    context,
    staticCanvas,
    staticContext,
    width: 0,
    height: 0,
    image: null,
    staticLayerReady: false,
  } satisfies RenderSession
}

const getRenderSession = (canvas: HTMLCanvasElement) => {
  const cachedSession = renderSessions.get(canvas)

  if (cachedSession) {
    return cachedSession
  }

  const session = createRenderSession(canvas)
  renderSessions.set(canvas, session)
  return session
}

const ensureCanvasSize = (
  session: RenderSession,
  width: number,
  height: number,
) => {
  if (session.width === width && session.height === height) {
    return
  }

  session.width = width
  session.height = height
  session.canvas.width = width
  session.canvas.height = height
  session.staticCanvas.width = width
  session.staticCanvas.height = height
  session.staticLayerReady = false
}

const prepareStaticLayer = (
  session: RenderSession,
  image: HTMLImageElement,
) => {
  if (session.staticLayerReady && session.image === image) {
    return
  }

  const { width, height, staticContext } = session
  const imageWidth = image.naturalWidth || width
  const imageHeight = image.naturalHeight || height
  const scale = Math.max(width / imageWidth, height / imageHeight)
  const drawWidth = imageWidth * scale
  const drawHeight = imageHeight * scale
  const offsetX = (width - drawWidth) / 2
  const offsetY = (height - drawHeight) / 2

  session.image = image

  staticContext.clearRect(0, 0, width, height)
  staticContext.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)
  staticContext.fillStyle = 'rgba(3, 7, 18, 0.16)'
  staticContext.fillRect(0, 0, width, height)

  session.staticLayerReady = true
}

export const drawFrame = ({
  canvas,
  image,
  config,
  analysis,
  timeSec,
}: DrawFrameOptions) => {
  const session = getRenderSession(canvas)
  const { width, height } = config.render
  ensureCanvasSize(session, width, height)
  prepareStaticLayer(session, image)
  const { context } = session

  context.drawImage(session.staticCanvas, 0, 0)

  const barCount = config.bars.barCount
  const barSpacingPx = inferBarSpacing(
    config.geometry.width,
    barCount,
    getMaxBarSpacing(config.render.width),
  )
  const bins = getBinsAtTime(analysis, timeSec, barCount)
  const totalGap = barSpacingPx * (barCount - 1)
  const barWidth = Math.max(
    1,
    (config.geometry.width - totalGap) / barCount,
  )
  const blockStart = config.geometry.xCenter - config.geometry.width / 2
  const baselineY = config.geometry.yCenter

  context.save()
  context.fillStyle = withAlpha(config.bars.barColor, config.bars.opacity)
  applyShadow(context, config)

  bins.forEach((value, index) => {
    const x = blockStart + index * (barWidth + barSpacingPx)
    const visibleHeight = Math.max(2, value * config.geometry.maxHeight)
    const heightAbove = config.bars.mirror ? visibleHeight / 2 : visibleHeight
    const topY = baselineY - heightAbove
    const mirroredHeight = config.bars.mirror ? visibleHeight : heightAbove

    context.beginPath()
    context.roundRect(
      x,
      topY,
      barWidth,
      mirroredHeight,
      config.bars.cornerRadiusPx,
    )
    context.fill()
  })

  context.restore()
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()

export const loadImage = async (source: AssetSource) => {
  const cacheKey = `${source.kind}:${source.url}`

  if (!imageCache.has(cacheKey)) {
    imageCache.set(
      cacheKey,
      new Promise((resolve, reject) => {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.onload = () => resolve(image)
        image.onerror = () =>
          reject(new Error(`Failed to load image asset ${source.name}.`))
        image.src = source.url
      }),
    )
  }

  return imageCache.get(cacheKey)!
}
