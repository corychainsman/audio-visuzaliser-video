import {
  createDefaultConfig,
  normalizePersistedConfig,
  type EditorConfig,
} from '@/lib/state/schema'

const STORAGE_KEY = 'audio-visualizer-editor/v1'

export const loadPersistedConfig = (): EditorConfig => {
  if (typeof window === 'undefined') {
    return createDefaultConfig()
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return createDefaultConfig()
  }

  try {
    return normalizePersistedConfig(JSON.parse(raw) as Partial<EditorConfig>)
  } catch {
    return createDefaultConfig()
  }
}

export const persistConfig = (config: EditorConfig) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export const clearPersistedConfig = () => {
  window.localStorage.removeItem(STORAGE_KEY)
}
