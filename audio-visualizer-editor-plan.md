# Audio Visualizer Editor Plan

## Context
Build a Bun-managed Vite React + TypeScript app using shadcn preset `b8NWuUveja`. The product is a preview-first editor for a still-image-backed audio visualizer that can:

- edit a single representative frame quickly in-browser
- preview a short rendered clip
- generate a full downloadable video in-browser
- export a normalized config JSON
- display and copy a reproducible desktop `ffmpeg` command

The app must be self-contained. It cannot depend on machine-specific absolute asset paths after setup.

## Bundled Assets
Source files already present in this repo:

- `./911-turbo-s-enginesound.wav`
- `./porsche.jpeg`

Copy them into the app as bundled defaults:

- `public/assets/default-audio/911-turbo-s-enginesound.wav`
- `public/assets/default-image/porsche.jpeg`

Use only relative public URLs at runtime:

- `/assets/default-audio/911-turbo-s-enginesound.wav`
- `/assets/default-image/porsche.jpeg`

## Product Goals
The editor should optimize for fast visual iteration first, then rendering/export second.

Core requirements:

- large central preview surface
- inspector panel with synchronized sliders and numeric inputs
- frame selection controls for choosing the representative analysis moment
- browser-side audio analysis cached in memory
- short preview render on demand
- full video generation on demand
- persistent settings via `localStorage`
- explicit reset to defaults

## Modes
### 1. Static Editor Mode
Default on load.

- show the chosen image as the full preview background
- render one analyzed audio frame as visualizer bars over the image
- use this mode for all parameter editing
- keep interactions immediate and avoid `ffmpeg.wasm` for ordinary control changes

### 2. Playback Mode
Entered by `Play`.

- render a short preview clip from the current settings
- replace the static editor surface with a playable rendered preview
- `Stop` exits playback mode and returns to the static frame editor at the current selected frame

The app does not need a full timeline editor.

## UI Layout
Use a preview-first layout:

- center: large preview canvas/composition area
- right: inspector panel grouped by control section
- top or bottom: compact action row for asset selection, frame controls, play/stop, render, export, and reset

Use shadcn primitives throughout. For each numeric control:

- one slider
- one numeric input
- both bound to the same state
- arrow-key increment/decrement while focused

Keyboard expectations:

- `Space` while stopped: play preview
- `Space` while playing: stop preview
- `Escape` while playing: stop preview

Targeted control shortcuts:

- `width`: `Ctrl+Left` / `Ctrl+Right`
- `maxHeight`: `Ctrl+Down` / `Ctrl+Up`
- `xCenter`: `Left` / `Right`
- `yCenter`: `Down` / `Up`
- frame nudge: `Ctrl+Left` / `Ctrl+Right`

If shortcut overlap causes ambiguity, prioritize the focused control and keep frame nudging available through explicit buttons and scrubber interaction.

## Editor Controls
### Geometry
- `width`
  - width of the visualizer block in output pixels
  - default: `90`
- `maxHeight`
  - max bar height in output pixels
  - default: `160`
- `xCenter`
  - horizontal center of the visualizer in output pixels
  - default: `90%` of render width, rounded
- `yCenter`
  - vertical baseline/center of the visualizer in output pixels
  - default: `50%` of render height, rounded

### Bars
- `barCount`
  - integer visible bar count
  - default: `50`
- `barSpacingPx`
  - gap between bars in pixels
  - default: `2`
- `cornerRadiusPx`
  - rounded corner radius in pixels
  - default: `2`
- `barColor`
  - solid color
  - default: white
- `mirror`
  - boolean
  - mirrors the visualizer across a horizontal axis

### Shadow
- `shadowEnabled`
  - default: `true`
- `shadowColor`
- `shadowBlurPx`
- `shadowOffsetXPx`
- `shadowOffsetYPx`
- `shadowOpacity`

Use a light shadow by default.

### Frame
- `frameTimeSec`
  - selected timestamp for static editing
- actions:
  - auto-pick richest frame
  - nudge backward
  - nudge forward
  - scrub across full audio duration

## Default State
Initialize with:

- image: `/assets/default-image/porsche.jpeg`
- audio: `/assets/default-audio/911-turbo-s-enginesound.wav`
- static editor mode active
- richest frame auto-selected after analysis completes
- shadow enabled with a subtle visible default

## Audio Analysis
Implement browser-side analysis with Web Audio APIs or equivalent browser-native APIs.

Requirements:

- decode audio fully in-browser
- analyze the full track once per loaded audio asset
- derive time-sliced spectral data mapped into visualizer bins
- preserve low frequencies on the left and high frequencies on the right
- cache reusable analysis data in memory so style changes do not trigger full re-analysis

### Richest Frame Selection
Compute a score per analyzed time slice that favors:

- meaningful overall energy
- broad participation across many bins

Choose the highest-scoring timestamp as the default `frameTimeSec`.

### `barCount` Changes
When `barCount` changes:

- remap or regroup cached spectral data into the new bin count
- avoid re-decoding audio unless the source asset changed

## Static Preview Rendering
The static editor preview should render directly in the browser, not through `ffmpeg.wasm`.

Requirements:

- deterministic rendering of image + bars
- immediate updates as controls change
- accurate use of the currently selected `frameTimeSec`
- same config model used later by preview render and full render

Implementation can use `canvas`, SVG, or another deterministic browser renderer. `canvas` is the most direct fit.

## Render Pipeline
Use `ffmpeg.wasm` for media generation.

### Play
`Play` should:

- render a short preview clip from the current config
- use the current image, audio, selected frame context, and visual settings
- render only a short clip, not the full audio duration
- default preview window: `2` seconds starting at or around `frameTimeSec`
- prefer MP4 if the chosen wasm build supports it
- fall back to WebM for preview if MP4 is impractical in-browser
- show playback in the preview area
- release temporary preview artifacts when stopped or when playback finishes

### Stop
`Stop` should:

- stop preview playback
- hide or discard the rendered preview element
- return to static editor mode
- preserve all current settings

### Generate Video
`Generate Video` should:

- render the full audio duration with the still image as background
- output a downloadable video file
- show progress
- disable conflicting actions while rendering
- surface clear errors for codec support issues, memory pressure, or render failure

## Desktop Command Surface
Display a generated desktop `ffmpeg` command derived from current settings.

Requirements:

- visible in the UI
- copyable as one full command string
- updates whenever settings change
- uses export-friendly or placeholder asset paths rather than machine-specific development paths

This command is informational only. The app does not execute it.

## Config Export Surface
Support:

- `Export Config`
  - download normalized JSON
- `Copy Config`
  - copy normalized JSON to clipboard

One normalized config object must drive:

- static preview
- preview render
- full render
- desktop command generation

Recommended config sections:

- asset metadata
- frame selection
- geometry
- bar styling
- shadow styling
- render preferences

## Persistence
Persist editor state in `localStorage`.

Requirements:

- restore the previous session on refresh
- persist current config and selected frame
- do not persist raw uploaded file blobs
- if a previously uploaded asset is unavailable after refresh, fall back to bundled defaults while preserving the rest of the settings

Reset behavior:

- expose a `Reset` action
- confirm in a shadcn dialog
- buttons: `Cancel` and destructive `Reset`
- default focus on `Cancel`

## Proposed Module Structure
Keep responsibilities separated:

- `src/app` or main entry
- `src/components/editor`
  - preview surface
  - inspector sections
  - frame controls
  - action bar
- `src/lib/analysis`
  - audio decode
  - spectral analysis
  - bin remapping
  - richest-frame scoring
- `src/lib/render`
  - preview composition helpers
  - `ffmpeg.wasm` integration
  - desktop command generation
- `src/lib/state`
  - config schema
  - defaults
  - persistence
- `public/assets/...`
  - bundled media

## Implementation Sequence
### 1. Scaffold App Shell
Deliverable:

- Bun + Vite + React + TypeScript app initialized with shadcn preset `b8NWuUveja`
- preview-first shell visible
- Bun-only scripts and package management

### 2. Establish Base Theme
Deliverable:

- layout and base styling already intentional before feature work
- preview, inspector, and action row visually distinct

### 3. Bundle Default Assets
Deliverable:

- repo-local audio and image copied into `public/assets`
- app loads defaults by relative URL only

### 4. Build Config Model and Persistence
Deliverable:

- normalized config object
- defaults loader
- `localStorage` restore/save
- reset flow

### 5. Implement Audio Analysis
Deliverable:

- audio decoding
- full-track analysis
- cached per-frame spectral data
- richest-frame auto-pick

### 6. Build Static Preview Surface
Deliverable:

- browser-rendered image + bars preview
- selected frame displayed accurately
- fast updates under control changes

### 7. Add Inspector Controls
Deliverable:

- all geometry, bar, shadow, and frame controls wired
- slider/input sync
- keyboard interactions working

### 8. Add Asset Swapping
Deliverable:

- upload/replace image and audio assets
- re-analysis triggered only when audio changes
- graceful fallback behavior on refresh

### 9. Add Config and Command Outputs
Deliverable:

- export/copy config
- visible/copyable desktop `ffmpeg` command

### 10. Add Preview Rendering
Deliverable:

- `Play` renders a short preview clip
- `Stop` returns to static editor mode cleanly

### 11. Add Full Video Generation
Deliverable:

- full downloadable render
- progress and disabled-state handling
- clear error handling

### 12. Polish and Verify
Deliverable:

- responsive desktop/mobile layout
- refined spacing, hierarchy, and interaction states
- validated end-to-end workflow

## Milestones
### Milestone 1
Static editor is usable:

- app scaffolded
- defaults load
- audio analysis works
- richest frame auto-picks
- static preview responds to controls

### Milestone 2
Editor is durable and export-aware:

- persistence works
- asset swapping works
- config export/copy works
- desktop command output works

### Milestone 3
Renderer is complete:

- preview clip works
- full video render works
- loading, errors, and stop behavior are polished

## Acceptance Criteria
- app runs with Bun dev/build commands only
- no machine-specific absolute asset paths remain in runtime behavior
- default assets load successfully from `public/assets`
- a nontrivial richest frame is auto-selected after analysis
- all inspector controls update the static preview immediately
- numeric inputs and sliders stay synchronized
- image and audio asset replacement works
- settings restore from `localStorage`
- preview playback can start and stop without corrupting editor state
- full video generation yields a downloadable file
- config export/copy and command copy reflect the current settings
- failures from `ffmpeg.wasm` or codec limitations are surfaced clearly

## Risks and Decisions
- `ffmpeg.wasm` MP4 support may be constrained by the chosen build and browser environment
- full-length in-browser rendering may hit memory or performance limits on large inputs
- preview rendering should stay intentionally short to keep the UX responsive
- the static editor should remain the source of truth even if preview/final rendering pipelines differ internally

## Assumptions
- Bun is the package manager and task runner
- Vite is the frontend build tool
- version 1 is fully client-side
- `ffmpeg.wasm` is used only for preview/final media generation, not normal editing interactions
- fallback preview formats are acceptable if browser-side MP4 encoding is unreliable
