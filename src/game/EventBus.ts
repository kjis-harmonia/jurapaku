import Phaser from 'phaser'
import type {
  ContestSaveData,
  DinosaurSaveData,
  FacilityData,
  LegendData,
  SpeciesId,
  VisitorCatalogEntry,
} from './types'

// Shared event channel between the Phaser game (which owns simulation state)
// and the React UI (which only renders/dispatches user intent). Avoids prop
// drilling a Phaser.Game instance through React component state.
class EventBus extends Phaser.Events.EventEmitter {}

export const eventBus = new EventBus()

export interface UiStatePayload {
  money: number
  reputation: number
  day: number
  timeOfDay: 'day' | 'night'
  weather: 'sunny' | 'rainy'
  soundOn: boolean
  gameSpeed: 1 | 2 | 3
  dinosaurs: DinosaurSaveData[]
  legends: LegendData[]
  eggRemainingMs: number | null
  visitorCatalog: VisitorCatalogEntry[]
  contest: ContestSaveData
  unlockedSpecies: SpeciesId[]
  rareEggs: number
  triceratopsEggs: number
  facilities: FacilityData[]
}

export interface BuildResultPayload {
  success: boolean
  message: string
}

export interface ReputationGainPayload {
  amount: number
  total: number
}
