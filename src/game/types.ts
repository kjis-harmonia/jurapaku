// Core data structures, kept separate from rendering so placeholder shapes
// can be swapped for pixel-art sprites later without touching game logic.

export type TimeOfDay = 'day' | 'night'
export type Weather = 'sunny' | 'rainy'
export type DinoState = 'walking' | 'sleeping' | 'happy'
export type VisitorType = 'boy' | 'girl' | 'office'
export type FacilityType = 'feeder' | 'shop' | 'toilet' | 'hatchery'
export type GameSpeed = 1 | 2 | 3
export type SpeciesId = 'mini-leaf' | 'starhorn'
export type VisitorCatalogKind = 'regular' | 'rare'

export interface SpeciesDef {
  id: string
  displayName: string
}

export interface DinosaurDef {
  id: string
  name: string
  species: SpeciesDef
}

export interface FacilityData {
  id: string
  type: FacilityType
  gridX: number
  gridY: number
}

export interface DinosaurSaveData {
  id: string
  name: string
  speciesId: SpeciesId
  generation: number
  protectionYears: number
  popularity: number
  x: number
  y: number
}

export interface EggSaveData {
  id: string
  speciesId: SpeciesId
  rarity: 'normal' | 'rare'
  generation: number
  remainingMs: number
}

export interface LegendData {
  id: string
  name: string
  speciesId: SpeciesId
  generation: number
  popularity: number
  graduatedDay: number
}

export interface VisitorCatalogEntry {
  id: string
  displayName: string
  kind: VisitorCatalogKind
  firstVisitDay: number
  visits: number
  level: number
}

export interface ContestSaveData {
  nextContestDay: number
  held: number
  wins: number
  lastTitle: string | null
  lastRank: number | null
}

export interface GameSaveState {
  money: number
  reputation: number
  day: number
  timeOfDay: TimeOfDay
  weather: Weather
  facilities: FacilityData[]
  dinosaurs: DinosaurSaveData[]
  egg: EggSaveData | null
  legends: LegendData[]
  nextGeneration: number
  visitorCatalog: VisitorCatalogEntry[]
  contest: ContestSaveData
  unlockedSpecies: SpeciesId[]
  rareEggs: number
  soundOn: boolean
  gameSpeed: GameSpeed
}

export interface FacilityDef {
  type: FacilityType
  displayName: string
  cost: number
}
