import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const singleThreadSourceDir = path.join(
  rootDir,
  'node_modules',
  '@ffmpeg',
  'core',
  'dist',
  'esm',
)
const multithreadSourceDir = path.join(
  rootDir,
  'node_modules',
  '@ffmpeg',
  'core-mt',
  'dist',
  'esm',
)
const singleThreadTargetDir = path.join(rootDir, 'public', 'ffmpeg')
const multithreadTargetDir = path.join(rootDir, 'public', 'ffmpeg-mt')

await mkdir(singleThreadTargetDir, { recursive: true })
await mkdir(multithreadTargetDir, { recursive: true })

await copyFile(
  path.join(singleThreadSourceDir, 'ffmpeg-core.js'),
  path.join(singleThreadTargetDir, 'ffmpeg-core.js'),
)
await copyFile(
  path.join(singleThreadSourceDir, 'ffmpeg-core.wasm'),
  path.join(singleThreadTargetDir, 'ffmpeg-core.wasm'),
)

await copyFile(
  path.join(multithreadSourceDir, 'ffmpeg-core.js'),
  path.join(multithreadTargetDir, 'ffmpeg-core.js'),
)
await copyFile(
  path.join(multithreadSourceDir, 'ffmpeg-core.wasm'),
  path.join(multithreadTargetDir, 'ffmpeg-core.wasm'),
)
await copyFile(
  path.join(multithreadSourceDir, 'ffmpeg-core.worker.js'),
  path.join(multithreadTargetDir, 'ffmpeg-core.worker.js'),
)
