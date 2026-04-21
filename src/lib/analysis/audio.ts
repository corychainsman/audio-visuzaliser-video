import FFT from 'fft.js'

import { clamp, type AssetSource } from '@/lib/state/schema'

const BASE_BIN_COUNT = 128
const ANALYSIS_FPS = 24
const FFT_SIZE = 2048
const MIN_FREQUENCY = 30
const MAX_FREQUENCY = 16_000

export type AudioAnalysisFrame = {
  index: number
  timeSec: number
  bins: number[]
  score: number
}

export type AudioAnalysis = {
  durationSec: number
  analysisFps: number
  baseBinCount: number
  richestFrameIndex: number
  richestFrameTimeSec: number
  frames: AudioAnalysisFrame[]
}

const byteCache = new Map<string, Promise<Uint8Array>>()
const analysisCache = new Map<string, Promise<AudioAnalysis>>()
const remappedBinsCache = new WeakMap<number[], Map<number, number[]>>()

export const getSourceBytes = async (source: AssetSource) => {
  const cacheKey = `${source.kind}:${source.url}`

  if (!byteCache.has(cacheKey)) {
    byteCache.set(
      cacheKey,
      fetch(source.url).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${source.name}.`)
        }

        return new Uint8Array(await response.arrayBuffer())
      }),
    )
  }

  return byteCache.get(cacheKey)!
}

const getMonoChannelData = (audioBuffer: AudioBuffer) => {
  const mono = new Float32Array(audioBuffer.length)
  const channelCount = audioBuffer.numberOfChannels

  for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
    const channel = audioBuffer.getChannelData(channelIndex)

    for (let index = 0; index < audioBuffer.length; index += 1) {
      mono[index] += channel[index] / channelCount
    }
  }

  return mono
}

const createHannWindow = (size: number) => {
  const window = new Float32Array(size)

  for (let index = 0; index < size; index += 1) {
    window[index] = 0.5 * (1 - Math.cos((2 * Math.PI * index) / (size - 1)))
  }

  return window
}

const createFrequencyBands = (sampleRate: number) => {
  const nyquist = sampleRate / 2
  const usableMax = Math.min(MAX_FREQUENCY, nyquist)
  const bands: Array<[number, number]> = []

  for (let index = 0; index < BASE_BIN_COUNT; index += 1) {
    const startRatio = index / BASE_BIN_COUNT
    const endRatio = (index + 1) / BASE_BIN_COUNT
    const start = MIN_FREQUENCY * (usableMax / MIN_FREQUENCY) ** startRatio
    const end = MIN_FREQUENCY * (usableMax / MIN_FREQUENCY) ** endRatio
    bands.push([start, end])
  }

  return bands
}

const averageBands = (
  magnitudes: Float32Array,
  sampleRate: number,
  bands: Array<[number, number]>,
) => {
  const frequencyStep = sampleRate / FFT_SIZE

  return bands.map(([start, end]) => {
    const startIndex = clamp(Math.floor(start / frequencyStep), 0, magnitudes.length - 1)
    const endIndex = clamp(Math.ceil(end / frequencyStep), startIndex + 1, magnitudes.length)
    let total = 0

    for (let index = startIndex; index < endIndex; index += 1) {
      total += magnitudes[index]
    }

    return total / Math.max(1, endIndex - startIndex)
  })
}

const scoreFrame = (bins: number[]) => {
  const average = bins.reduce((total, value) => total + value, 0) / bins.length
  const populated = bins.filter((value) => value > average * 0.6).length / bins.length
  const peak = Math.max(...bins)

  return average * 0.65 + populated * 0.25 + peak * 0.1
}

const analyzeDecodedBuffer = (audioBuffer: AudioBuffer): AudioAnalysis => {
  const mono = getMonoChannelData(audioBuffer)
  const fft = new FFT(FFT_SIZE)
  const spectrum = fft.createComplexArray()
  const input = new Float32Array(FFT_SIZE)
  const magnitudes = new Float32Array(FFT_SIZE / 2)
  const window = createHannWindow(FFT_SIZE)
  const bands = createFrequencyBands(audioBuffer.sampleRate)
  const hopSize = Math.max(1, Math.floor(audioBuffer.sampleRate / ANALYSIS_FPS))
  const frameCount = Math.max(1, Math.ceil(audioBuffer.length / hopSize))
  const rawFrames: AudioAnalysisFrame[] = []
  let globalMax = Number.EPSILON

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const center = frameIndex * hopSize
    const windowStart = center - Math.floor(FFT_SIZE / 2)

    for (let sampleIndex = 0; sampleIndex < FFT_SIZE; sampleIndex += 1) {
      const sourceIndex = windowStart + sampleIndex
      const sample =
        sourceIndex >= 0 && sourceIndex < mono.length ? mono[sourceIndex] : 0
      input[sampleIndex] = sample * window[sampleIndex]
    }

    fft.realTransform(spectrum, input)
    fft.completeSpectrum(spectrum)

    for (let index = 0; index < FFT_SIZE / 2; index += 1) {
      const real = spectrum[index * 2]
      const imaginary = spectrum[index * 2 + 1]
      magnitudes[index] = Math.sqrt(real * real + imaginary * imaginary)
    }

    const bins = averageBands(magnitudes, audioBuffer.sampleRate, bands)
    globalMax = Math.max(globalMax, ...bins)

    rawFrames.push({
      index: frameIndex,
      timeSec: frameIndex / ANALYSIS_FPS,
      bins,
      score: 0,
    })
  }

  const frames = rawFrames.map((frame) => {
    const normalizedBins = frame.bins.map((value) =>
      clamp((value / globalMax) ** 0.72, 0, 1),
    )

    return {
      ...frame,
      bins: normalizedBins,
      score: scoreFrame(normalizedBins),
    }
  })

  const richestFrame = frames.reduce((best, frame) =>
    frame.score > best.score ? frame : best,
  )

  return {
    durationSec: audioBuffer.duration,
    analysisFps: ANALYSIS_FPS,
    baseBinCount: BASE_BIN_COUNT,
    richestFrameIndex: richestFrame.index,
    richestFrameTimeSec: richestFrame.timeSec,
    frames,
  }
}

export const analyzeAudioSource = async (source: AssetSource) => {
  const cacheKey = `${source.kind}:${source.url}`

  if (!analysisCache.has(cacheKey)) {
    analysisCache.set(
      cacheKey,
      (async () => {
        const bytes = await getSourceBytes(source)
        const context = new AudioContext()

        try {
          const audioCopy = new Uint8Array(bytes)
          const audioBuffer = await context.decodeAudioData(audioCopy.buffer)
          return analyzeDecodedBuffer(audioBuffer)
        } finally {
          await context.close()
        }
      })(),
    )
  }

  return analysisCache.get(cacheKey)!
}

export const remapBins = (bins: number[], targetCount: number) => {
  if (targetCount === bins.length) {
    return bins
  }

  let cachedTargets = remappedBinsCache.get(bins)

  if (cachedTargets?.has(targetCount)) {
    return cachedTargets.get(targetCount)!
  }

  const result = new Array<number>(targetCount).fill(0)

  for (let targetIndex = 0; targetIndex < targetCount; targetIndex += 1) {
    const start = (targetIndex * bins.length) / targetCount
    const end = ((targetIndex + 1) * bins.length) / targetCount
    const startIndex = Math.floor(start)
    const endIndex = Math.min(bins.length, Math.ceil(end))
    let total = 0
    let count = 0

    for (let sourceIndex = startIndex; sourceIndex < endIndex; sourceIndex += 1) {
      total += bins[sourceIndex]
      count += 1
    }

    result[targetIndex] = total / Math.max(1, count)
  }

  if (!cachedTargets) {
    cachedTargets = new Map<number, number[]>()
    remappedBinsCache.set(bins, cachedTargets)
  }

  cachedTargets.set(targetCount, result)

  return result
}

export const getFrameIndexAtTime = (analysis: AudioAnalysis, timeSec: number) =>
  clamp(
    Math.round(timeSec * analysis.analysisFps),
    0,
    analysis.frames.length - 1,
  )

export const getBinsAtTime = (
  analysis: AudioAnalysis,
  timeSec: number,
  barCount: number,
) => {
  const frameIndex = getFrameIndexAtTime(analysis, timeSec)
  return remapBins(analysis.frames[frameIndex].bins, barCount)
}
