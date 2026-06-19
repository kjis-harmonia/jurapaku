import type { FacilityDef, GameSaveState } from './types'

export const GAME_WIDTH = 320
export const GAME_HEIGHT = 480

export const TILE_SIZE = 40

export const PEN_COLS = 4
export const PEN_ROWS = 4
export const PEN_X = 80
export const PEN_Y = 250
export const PEN_WIDTH = PEN_COLS * TILE_SIZE
export const PEN_HEIGHT = PEN_ROWS * TILE_SIZE

export const HUT_X = 30
export const HUT_Y = 40
export const HUT_WIDTH = 70
export const HUT_HEIGHT = 60

// default feeder sits inside the pen, one tile in from the corner
export const DEFAULT_FEEDER_GRID = { gridX: 1, gridY: 2 }

export const SAVE_KEY = 'jurapaku-save-v1'

export const FACILITIES: Record<string, FacilityDef> = {
  feeder: { type: 'feeder', displayName: '木の餌場', cost: 5000 },
  shop: { type: 'shop', displayName: 'モコの葉っぱクッキー屋', cost: 8000 },
  toilet: { type: 'toilet', displayName: '休憩トイレ', cost: 6000 },
}

export const DAY_DURATION_MS = 60_000
export const NIGHT_DURATION_MS = 30_000
export const WEATHER_CHECK_INTERVAL_MS = 45_000
export const RAIN_CHANCE = 0.35

export const VISITOR_BASE_INTERVAL_MS = [4000, 8000] as const
export const NIGHT_INTERVAL_MULTIPLIER = 2.5
export const RAIN_INTERVAL_MULTIPLIER = 1.6

export const VISITOR_MONEY_RANGE = [10, 50] as const
export const VISITOR_MAX_CONCURRENT = 8
export const REPUTATION_VISITOR_CAP = 100

export const AUTOSAVE_INTERVAL_MS = 3000

function defaultFacilities() {
  return [
    {
      id: 'feeder-default',
      type: 'feeder' as const,
      gridX: DEFAULT_FEEDER_GRID.gridX,
      gridY: DEFAULT_FEEDER_GRID.gridY,
    },
  ]
}

export function createDefaultSaveState(): GameSaveState {
  return {
    money: 10_000,
    reputation: 0,
    day: 1,
    timeOfDay: 'day',
    weather: 'sunny',
    facilities: defaultFacilities(),
    dinosaur: {
      x: PEN_X + PEN_WIDTH / 2,
      y: PEN_Y + PEN_HEIGHT / 2,
    },
    soundOn: true,
    gameSpeed: 1,
  }
}
