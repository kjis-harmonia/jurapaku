import type { FacilityDef, GameSaveState, SpeciesId } from './types'

export const GAME_WIDTH = 320
export const GAME_HEIGHT = 480

export const TILE_SIZE = 40

export const PEN_COLS = 4
export const PEN_ROWS = 4
export const PEN_X = 80
export const PEN_Y = 250
export const PEN_WIDTH = PEN_COLS * TILE_SIZE
export const PEN_HEIGHT = PEN_ROWS * TILE_SIZE

export const TRICERA_PEN_COLS = 4
export const TRICERA_PEN_ROWS = 4
export const TRICERA_PEN_X = 150
export const TRICERA_PEN_Y = 45
export const TRICERA_PEN_WIDTH = TRICERA_PEN_COLS * TILE_SIZE
export const TRICERA_PEN_HEIGHT = TRICERA_PEN_ROWS * TILE_SIZE

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
  hatchery: { type: 'hatchery', displayName: 'いのちの芽吹き舎', cost: 25_000 },
  'reinforced-pen': { type: 'reinforced-pen', displayName: 'トリケラ強化柵', cost: 40_000 },
  'large-feeder': { type: 'large-feeder', displayName: '大型草餌場', cost: 12_000 },
}

export const EGG_HATCH_DURATION_MS = 30_000
export const MINI_LEAF_PROTECTION_YEARS = 6
export const STARHORN_PROTECTION_YEARS = 10
export const TRICERATOPS_PROTECTION_YEARS = 12
export const MINI_LEAF_NAMES = ['コモ', 'リーフィ', 'ハル', 'ポポ', 'ミント', 'コハク'] as const
export const STARHORN_NAMES = ['ステラ', 'ルーチェ', 'キララ', 'スピカ'] as const
export const TRICERATOPS_NAMES = ['ツノマル', 'トリノ', 'ガク', 'ミドリノ'] as const
export const CONTEST_INTERVAL_DAYS = 3
export const CONTEST_RARE_UNLOCK_SCORE = 8
export const TRICERATOPS_UNLOCK_REPUTATION = 40
export const TRICERATOPS_UNLOCK_CONTEST_WINS = 2
export const TRICERATOPS_FEED_COST_PER_YEAR = 500

export const DAY_DURATION_MS = 60_000
export const NIGHT_DURATION_MS = 30_000
export const WEATHER_CHECK_INTERVAL_MS = 45_000
export const RAIN_CHANCE = 0.35

export const VISITOR_BASE_INTERVAL_MS = [4000, 8000] as const
export const NIGHT_INTERVAL_MULTIPLIER = 2.5
export const RAIN_INTERVAL_MULTIPLIER = 1.6

export const VISITOR_MONEY_RANGE = [10, 50] as const
export const VISITOR_MAX_CONCURRENT = 6
export const REPUTATION_VISITOR_CAP = 80
export const REPUTATION_MAX_VISITOR_BOOST = 0.25

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
    dinosaurs: [
      {
        id: 'dino-moko-1',
        name: 'モコ',
        speciesId: 'mini-leaf',
        generation: 1,
        protectionYears: 0,
        popularity: 0,
        x: PEN_X + PEN_WIDTH / 2,
        y: PEN_Y + PEN_HEIGHT / 2,
      },
    ],
    egg: null,
    legends: [],
    nextGeneration: 2,
    visitorCatalog: [],
    contest: {
      nextContestDay: 3,
      held: 0,
      wins: 0,
      lastTitle: null,
      lastRank: null,
    },
    unlockedSpecies: ['mini-leaf'],
    rareEggs: 0,
    triceratopsEggs: 0,
    soundOn: true,
    gameSpeed: 1,
  }
}

export function formatGeneration(generation: number): string {
  return generation === 1 ? '初代' : `${generation}代目`
}

export function protectionYearsForSpecies(speciesId: SpeciesId): number {
  if (speciesId === 'triceratops') return TRICERATOPS_PROTECTION_YEARS
  return speciesId === 'starhorn' ? STARHORN_PROTECTION_YEARS : MINI_LEAF_PROTECTION_YEARS
}

export function speciesDisplayName(speciesId: SpeciesId): string {
  if (speciesId === 'triceratops') return 'トリケラ'
  return speciesId === 'starhorn' ? 'ホシツノ幼体' : 'ミニリーフ'
}
