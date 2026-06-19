import { SAVE_KEY, createDefaultSaveState } from './constants'
import type {
  ContestSaveData,
  DinosaurSaveData,
  EggSaveData,
  FacilityData,
  FacilityType,
  GameSaveState,
  LegendData,
  SpeciesId,
  VisitorCatalogEntry,
} from './types'

const FACILITY_TYPES = new Set<FacilityType>([
  'feeder',
  'shop',
  'toilet',
  'hatchery',
  'reinforced-pen',
  'large-feeder',
])
const SPECIES = new Set<SpeciesId>(['mini-leaf', 'starhorn', 'triceratops'])

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

function validDinosaur(value: unknown): value is DinosaurSaveData {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<DinosaurSaveData>
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.speciesId === 'string' &&
    SPECIES.has(item.speciesId as SpeciesId) &&
    Number.isInteger(item.generation) &&
    Number.isFinite(item.protectionYears) &&
    Number.isFinite(item.popularity) &&
    Number.isFinite(item.x) &&
    Number.isFinite(item.y)
  )
}

function loadDinosaurs(parsed: Record<string, unknown>, fallback: DinosaurSaveData[]): DinosaurSaveData[] {
  if (Array.isArray(parsed.dinosaurs)) {
    const valid = parsed.dinosaurs.filter(validDinosaur)
    if (valid.length > 0) return valid
  }

  const legacy = parsed.dinosaur
  if (legacy && typeof legacy === 'object') {
    const position = legacy as { x?: unknown; y?: unknown }
    return [{
      ...fallback[0],
      x: Number.isFinite(position.x) ? Number(position.x) : fallback[0].x,
      y: Number.isFinite(position.y) ? Number(position.y) : fallback[0].y,
    }]
  }
  return fallback
}

function validEgg(value: unknown): EggSaveData | null {
  if (!value || typeof value !== 'object') return null
  const egg = value as Partial<EggSaveData>
  if (
    typeof egg.id !== 'string' ||
    typeof egg.speciesId !== 'string' ||
    !SPECIES.has(egg.speciesId as SpeciesId) ||
    !Number.isInteger(egg.generation) ||
    !Number.isFinite(egg.remainingMs)
  ) return null
  return {
    id: egg.id,
    speciesId: egg.speciesId as SpeciesId,
    rarity: egg.rarity === 'rare' ? 'rare' : 'normal',
    generation: Number(egg.generation),
    remainingMs: Math.max(0, Number(egg.remainingMs)),
  }
}

function validLegends(value: unknown): LegendData[] {
  if (!Array.isArray(value)) return []
  return value.filter((legend): legend is LegendData => {
    if (!legend || typeof legend !== 'object') return false
    const item = legend as Partial<LegendData>
    return (
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.speciesId === 'string' &&
      SPECIES.has(item.speciesId as SpeciesId) &&
      Number.isInteger(item.generation) &&
      Number.isFinite(item.popularity) &&
      Number.isFinite(item.graduatedDay)
    )
  })
}

function validVisitorCatalog(value: unknown): VisitorCatalogEntry[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is VisitorCatalogEntry => {
    if (!entry || typeof entry !== 'object') return false
    const item = entry as Partial<VisitorCatalogEntry>
    return (
      typeof item.id === 'string' &&
      typeof item.displayName === 'string' &&
      (item.kind === 'regular' || item.kind === 'rare') &&
      Number.isFinite(item.firstVisitDay) &&
      Number.isFinite(item.visits) &&
      Number.isFinite(item.level)
    )
  })
}

function validContest(value: unknown, fallback: ContestSaveData): ContestSaveData {
  if (!value || typeof value !== 'object') return fallback
  const contest = value as Partial<ContestSaveData>
  return {
    nextContestDay: Number.isFinite(contest.nextContestDay)
      ? Math.max(1, Number(contest.nextContestDay))
      : fallback.nextContestDay,
    held: Number.isFinite(contest.held) ? Math.max(0, Number(contest.held)) : 0,
    wins: Number.isFinite(contest.wins) ? Math.max(0, Number(contest.wins)) : 0,
    lastTitle: typeof contest.lastTitle === 'string' ? contest.lastTitle : null,
    lastRank: Number.isFinite(contest.lastRank) ? Number(contest.lastRank) : null,
  }
}

function validUnlockedSpecies(value: unknown): SpeciesId[] {
  if (!Array.isArray(value)) return ['mini-leaf']
  const valid = value.filter((species): species is SpeciesId => typeof species === 'string' && SPECIES.has(species as SpeciesId))
  return Array.from(new Set<SpeciesId>(['mini-leaf', ...valid]))
}

export const SaveManager = {
  load(): GameSaveState {
    const fallback = createDefaultSaveState()
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return fallback
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const dinosaurs = loadDinosaurs(parsed, fallback.dinosaurs)
      const highestGeneration = Math.max(...dinosaurs.map((dinosaur) => dinosaur.generation), 1)
      return {
        money: Number.isFinite(parsed.money) ? Number(parsed.money) : fallback.money,
        reputation: Number.isFinite(parsed.reputation) ? Math.max(0, Number(parsed.reputation)) : fallback.reputation,
        day: Number.isFinite(parsed.day) ? Math.max(1, Number(parsed.day)) : fallback.day,
        timeOfDay: parsed.timeOfDay === 'night' ? 'night' : 'day',
        weather: parsed.weather === 'rainy' ? 'rainy' : 'sunny',
        facilities: validFacilities(parsed.facilities, fallback.facilities),
        dinosaurs,
        egg: validEgg(parsed.egg),
        legends: validLegends(parsed.legends),
        nextGeneration: Number.isInteger(parsed.nextGeneration)
          ? Math.max(highestGeneration + 1, Number(parsed.nextGeneration))
          : highestGeneration + 1,
        visitorCatalog: validVisitorCatalog(parsed.visitorCatalog),
        contest: validContest(parsed.contest, fallback.contest),
        unlockedSpecies: validUnlockedSpecies(parsed.unlockedSpecies),
        rareEggs: Number.isFinite(parsed.rareEggs) ? Math.max(0, Math.floor(Number(parsed.rareEggs))) : 0,
        triceratopsEggs: Number.isFinite(parsed.triceratopsEggs)
          ? Math.max(0, Math.floor(Number(parsed.triceratopsEggs)))
          : 0,
        soundOn: typeof parsed.soundOn === 'boolean' ? parsed.soundOn : fallback.soundOn,
        gameSpeed: parsed.gameSpeed === 2 || parsed.gameSpeed === 3 ? parsed.gameSpeed : 1,
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
