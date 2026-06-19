import { SAVE_KEY, createDefaultSaveState } from './constants'
import type { FacilityData, FacilityType, GameSaveState } from './types'

const FACILITY_TYPES = new Set<FacilityType>(['feeder', 'shop', 'toilet'])

function validFacilities(value: unknown, fallback: FacilityData[]): FacilityData[] {
  if (!Array.isArray(value)) return fallback
  return value.filter((facility): facility is FacilityData => {
    if (!facility || typeof facility !== 'object') return false
    const item = facility as Partial<FacilityData>
    return (
      typeof item.id === 'string' &&
      typeof item.type === 'string' &&
      FACILITY_TYPES.has(item.type as FacilityType) &&
      Number.isInteger(item.gridX) &&
      Number.isInteger(item.gridY)
    )
  })
}

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
        reputation: Number.isFinite(parsed.reputation) ? Math.max(0, parsed.reputation) : fallback.reputation,
        facilities: validFacilities(parsed.facilities, fallback.facilities),
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
