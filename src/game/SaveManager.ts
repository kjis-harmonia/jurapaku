import { SAVE_KEY, createDefaultSaveState } from './constants'
import type { GameSaveState } from './types'

export const SaveManager = {
  load(): GameSaveState {
    const fallback = createDefaultSaveState()
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return fallback
      const parsed = JSON.parse(raw)
      // merge over defaults so older saves missing newer fields still work
      return {
        ...fallback,
        ...parsed,
        dinosaur: { ...fallback.dinosaur, ...parsed.dinosaur },
        facilities: Array.isArray(parsed.facilities) ? parsed.facilities : fallback.facilities,
      }
    } catch {
      return fallback
    }
  },

  save(state: GameSaveState): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    } catch {
      // localStorage may be unavailable (e.g. private mode quota) - ignore
    }
  },

  reset(): GameSaveState {
    const fallback = createDefaultSaveState()
    try {
      localStorage.removeItem(SAVE_KEY)
    } catch {
      // ignore
    }
    return fallback
  },
}
