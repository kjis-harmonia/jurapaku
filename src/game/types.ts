// Core data structures, kept separate from rendering so placeholder shapes
// can be swapped for pixel-art sprites later without touching game logic.

export type TimeOfDay = 'day' | 'night'
export type Weather = 'sunny' | 'rainy'
export type DinoState = 'walking' | 'sleeping' | 'happy'
export type VisitorType = 'boy' | 'girl' | 'office'
export type FacilityType = 'feeder'
export type GameSpeed = 1 | 2 | 3

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
  x: number
  y: number
}

export interface GameSaveState {
  money: number
  day: number
  timeOfDay: TimeOfDay
  weather: Weather
  facilities: FacilityData[]
  dinosaur: DinosaurSaveData
  soundOn: boolean
  gameSpeed: GameSpeed
}

export interface FacilityDef {
  type: FacilityType
  displayName: string
  cost: number
}
