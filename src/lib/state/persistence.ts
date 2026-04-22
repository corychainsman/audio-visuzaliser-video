import {
  createDefaultConfig,
  normalizePersistedConfig,
  type EditorConfig,
} from '@/lib/state/schema'

const CONFIG_QUERY_PARAM = 'config'
const BASE64_URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const TOKEN_LENGTH = 26
const TOKEN_FIELDS = [
  { key: 'frame', bits: 10 },
  { key: 'geometryWidth', bits: 11 },
  { key: 'geometryMaxHeight', bits: 10 },
  { key: 'geometryXCenter', bits: 11 },
  { key: 'geometryYCenter', bits: 10 },
  { key: 'barSpacing', bits: 6 },
  { key: 'cornerRadius', bits: 5 },
  { key: 'barColor', bits: 24 },
  { key: 'barOpacity', bits: 7 },
  { key: 'mirror', bits: 1 },
  { key: 'shadowEnabled', bits: 1 },
  { key: 'shadowColor', bits: 24 },
  { key: 'shadowBlur', bits: 6 },
  { key: 'shadowOffsetX', bits: 7 },
  { key: 'shadowOffsetY', bits: 7 },
  { key: 'shadowOpacity', bits: 7 },
  { key: 'fps', bits: 2 },
  { key: 'preferredFormat', bits: 1 },
  { key: 'previewDuration', bits: 6 },
] as const

const getUrl = () => new URL(window.location.href)

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const colorToInt = (value: string) => Number.parseInt(value.replace('#', ''), 16)

const intToColor = (value: number) => `#${value.toString(16).padStart(6, '0')}`

const encodeFps = (value: number) => {
  switch (value) {
    case 24:
      return 0
    case 30:
      return 1
    case 60:
      return 2
    default:
      return 0
  }
}

const decodeFps = (value: number) => {
  switch (value) {
    case 1:
      return 30
    case 2:
      return 60
    default:
      return 24
  }
}

const encodePreviewDuration = (value: number) =>
  value === 0 ? 0 : clamp(Math.round(value * 4), 1, 32)

const decodePreviewDuration = (value: number) => (value === 0 ? 0 : value / 4)

const encodeFrame = (value: number) => clamp(Math.round(value * 24), 0, 1023)

const decodeFrame = (value: number) => value / 24

const normalizePersistableConfig = (config: EditorConfig) =>
  normalizePersistedConfig(config)

const encodeConfigValues = (config: EditorConfig) => {
  const normalized = normalizePersistableConfig(config)

  return {
    frame: encodeFrame(normalized.frame.timeSec),
    geometryWidth: normalized.geometry.width - 20,
    geometryMaxHeight: normalized.geometry.maxHeight - 10,
    geometryXCenter: normalized.geometry.xCenter,
    geometryYCenter: normalized.geometry.yCenter,
    barSpacing: normalized.bars.barSpacingPx,
    cornerRadius: normalized.bars.cornerRadiusPx,
    barColor: colorToInt(normalized.bars.barColor),
    barOpacity: clamp(Math.round(normalized.bars.opacity * 100), 0, 100),
    mirror: normalized.bars.mirror ? 1 : 0,
    shadowEnabled: normalized.shadow.enabled ? 1 : 0,
    shadowColor: colorToInt(normalized.shadow.color),
    shadowBlur: normalized.shadow.blurPx,
    shadowOffsetX: normalized.shadow.offsetXPx + 60,
    shadowOffsetY: normalized.shadow.offsetYPx + 60,
    shadowOpacity: clamp(Math.round(normalized.shadow.opacity * 100), 0, 100),
    fps: encodeFps(normalized.render.fps),
    preferredFormat: normalized.render.preferredFormat === 'webm' ? 1 : 0,
    previewDuration: encodePreviewDuration(normalized.render.previewDurationSec),
  }
}

const packToken = (values: ReturnType<typeof encodeConfigValues>) => {
  let packed = 0n

  for (const field of TOKEN_FIELDS) {
    packed =
      (packed << BigInt(field.bits)) | BigInt(values[field.key] ?? 0)
  }

  let token = ''

  for (let index = TOKEN_LENGTH - 1; index >= 0; index -= 1) {
    const value = Number((packed >> BigInt(index * 6)) & 63n)
    token += BASE64_URL_ALPHABET[value]
  }

  return token
}

const unpackToken = (token: string) => {
  if (token.length !== TOKEN_LENGTH) {
    throw new Error('Config token must be exactly 26 characters.')
  }

  let packed = 0n

  for (const character of token) {
    const value = BASE64_URL_ALPHABET.indexOf(character)

    if (value < 0) {
      throw new Error('Config token contains invalid characters.')
    }

    packed = (packed << 6n) | BigInt(value)
  }

  let remainingBits = TOKEN_FIELDS.reduce((sum, field) => sum + field.bits, 0)

  return Object.fromEntries(
    TOKEN_FIELDS.map((field) => {
      remainingBits -= field.bits
      const mask = (1n << BigInt(field.bits)) - 1n
      const value = Number((packed >> BigInt(remainingBits)) & mask)

      return [field.key, value]
    }),
  ) as Record<(typeof TOKEN_FIELDS)[number]['key'], number>
}

export const serializeConfigToken = (config: EditorConfig) =>
  packToken(encodeConfigValues(config))

export const parseConfigToken = (token: string): EditorConfig => {
  const values = unpackToken(token.trim())
  const defaults = createDefaultConfig()

  return normalizePersistedConfig({
    version: 1,
    assets: defaults.assets,
    frame: {
      timeSec: decodeFrame(values.frame),
    },
    geometry: {
      width: values.geometryWidth + 20,
      maxHeight: values.geometryMaxHeight + 10,
      xCenter: values.geometryXCenter,
      yCenter: values.geometryYCenter,
    },
    bars: {
      barSpacingPx: values.barSpacing,
      cornerRadiusPx: values.cornerRadius,
      barColor: intToColor(values.barColor),
      opacity: values.barOpacity / 100,
      mirror: values.mirror === 1,
    },
    shadow: {
      enabled: values.shadowEnabled === 1,
      color: intToColor(values.shadowColor),
      blurPx: values.shadowBlur,
      offsetXPx: values.shadowOffsetX - 60,
      offsetYPx: values.shadowOffsetY - 60,
      opacity: values.shadowOpacity / 100,
    },
    render: {
      ...defaults.render,
      fps: decodeFps(values.fps),
      previewDurationSec: decodePreviewDuration(values.previewDuration),
      preferredFormat: values.preferredFormat === 1 ? 'webm' : 'mp4',
    },
  })
}

export const loadPersistedConfig = (): EditorConfig => {
  if (typeof window === 'undefined') {
    return createDefaultConfig()
  }

  const raw = getUrl().searchParams.get(CONFIG_QUERY_PARAM)

  if (!raw) {
    return createDefaultConfig()
  }

  try {
    return parseConfigToken(raw)
  } catch {
    return createDefaultConfig()
  }
}

export const persistConfig = (config: EditorConfig) => {
  const url = getUrl()
  url.searchParams.set(CONFIG_QUERY_PARAM, serializeConfigToken(config))

  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

export const clearPersistedConfig = () => {
  const url = getUrl()
  url.searchParams.set(
    CONFIG_QUERY_PARAM,
    serializeConfigToken(createDefaultConfig()),
  )
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}
