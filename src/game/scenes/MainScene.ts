import Phaser from 'phaser'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TILE_SIZE,
  PEN_COLS,
  PEN_ROWS,
  PEN_X,
  PEN_Y,
  PEN_WIDTH,
  PEN_HEIGHT,
  HUT_X,
  HUT_Y,
  HUT_WIDTH,
  HUT_HEIGHT,
  FACILITIES,
  DAY_DURATION_MS,
  NIGHT_DURATION_MS,
  WEATHER_CHECK_INTERVAL_MS,
  RAIN_CHANCE,
  VISITOR_BASE_INTERVAL_MS,
  NIGHT_INTERVAL_MULTIPLIER,
  RAIN_INTERVAL_MULTIPLIER,
  REPUTATION_VISITOR_CAP,
  REPUTATION_MAX_VISITOR_BOOST,
  VISITOR_MAX_CONCURRENT,
  AUTOSAVE_INTERVAL_MS,
  EGG_HATCH_DURATION_MS,
  MINI_LEAF_NAMES,
  STARHORN_NAMES,
  CONTEST_INTERVAL_DAYS,
  CONTEST_RARE_UNLOCK_SCORE,
  formatGeneration,
  protectionYearsForSpecies,
  speciesDisplayName,
} from '../constants'
import { SaveManager } from '../SaveManager'
import { eventBus } from '../EventBus'
import { soundManager } from '../SoundManager'
import type { DinosaurSaveData, FacilityData, FacilityType, GameSaveState, GameSpeed, VisitorType } from '../types'
import { Dinosaur } from '../entities/Dinosaur'
import { Visitor } from '../entities/Visitor'
import {
  RARE_VISITORS,
  REGULAR_VISITORS,
  type SpecialVisitorProfile,
} from '../visitorProfiles'

const ENTRY_Y = PEN_Y + PEN_HEIGHT + 50
const CONTEST_TITLES = ['人気恐竜大会', '可愛い恐竜大会', '保護区ランキング'] as const
const AMENITY_GRID_SLOTS = [
  { gridX: 0, gridY: 10 }, { gridX: 1, gridY: 10 },
  { gridX: 2, gridY: 10 }, { gridX: 3, gridY: 10 },
  { gridX: 4, gridY: 10 }, { gridX: 5, gridY: 10 },
  { gridX: 6, gridY: 10 }, { gridX: 7, gridY: 10 },
] as const

interface FacilitySpriteRecord {
  data: FacilityData
  sprite: Phaser.GameObjects.Sprite
}

export class MainScene extends Phaser.Scene {
  private saveState!: GameSaveState
  private dinosaurs: Dinosaur[] = []
  private visitors: Visitor[] = []
  private facilitySprites: FacilitySpriteRecord[] = []
  private eggSprite: Phaser.GameObjects.Sprite | null = null
  private eggLabel: Phaser.GameObjects.Text | null = null
  private hatching = false
  private lastEggSecond = -1

  private buildType: FacilityType | null = null
  private buildHighlight!: Phaser.GameObjects.Graphics

  private nightOverlay!: Phaser.GameObjects.Rectangle
  private rainOverlay!: Phaser.GameObjects.Rectangle
  private rainEmitter!: Phaser.GameObjects.Particles.ParticleEmitter

  private dayPhaseTimer = 0
  private weatherTimer = 0
  private visitorSpawnTimer = 0
  private visitorSpawnNext = 4000
  private autosaveTimer = 0
  private idleInfoTimer = 0
  private gameSpeed: GameSpeed = 1

  constructor() {
    super('MainScene')
  }

  preload() {
    const g = this.make.graphics({ x: 0, y: 0 }, false)

    // Mocco the mini-leaf: round body, stubby legs, a little head crest and
    // a friendly round eye. Placeholder shapes only - swap this texture for
    // pixel-art frames later without touching Dinosaur's state machine.
    g.fillStyle(0x4a8f4f, 1) // belly shadow
    g.fillEllipse(18, 21, 26, 8)
    g.fillStyle(0x7cc36a, 1) // legs
    g.fillRoundedRect(8, 17, 6, 8, 2)
    g.fillRoundedRect(22, 17, 6, 8, 2)
    g.fillStyle(0x8bd672, 1) // body
    g.fillEllipse(17, 15, 30, 19)
    g.fillStyle(0x6fb858, 1) // back spikes / leaf crest
    g.fillTriangle(10, 6, 14, 6, 12, 0)
    g.fillTriangle(16, 5, 20, 5, 18, -1)
    g.fillTriangle(22, 6, 26, 6, 24, 0)
    g.fillStyle(0x8bd672, 1) // head
    g.fillCircle(32, 10, 9)
    g.fillStyle(0xffffff, 1) // eye white
    g.fillCircle(35, 8, 3.2)
    g.fillStyle(0x2e3b1f, 1) // eye pupil
    g.fillCircle(36, 8, 1.6)
    g.fillStyle(0xffb74d, 1) // little cheek blush
    g.fillCircle(31, 13, 2)
    g.generateTexture('tex_dino', 46, 30)
    g.clear()

    // Hoshitsuno juvenile: a gentle rare herbivore with a star-shaped frill.
    g.fillStyle(0x5b789c, 1)
    g.fillEllipse(19, 23, 29, 8)
    g.fillStyle(0x89aee0, 1)
    g.fillRoundedRect(9, 19, 6, 8, 2)
    g.fillRoundedRect(24, 19, 6, 8, 2)
    g.fillStyle(0x9fc2ee, 1)
    g.fillEllipse(20, 16, 32, 19)
    g.fillStyle(0x6f8fc0, 1)
    g.fillCircle(35, 11, 11)
    g.fillTriangle(29, 5, 33, 4, 31, -1)
    g.fillTriangle(36, 3, 40, 5, 40, -1)
    g.fillTriangle(41, 7, 45, 10, 47, 4)
    g.fillStyle(0xfff176, 1)
    g.fillCircle(34, 10, 2)
    g.fillCircle(40, 15, 1.5)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(38, 9, 3)
    g.fillStyle(0x263238, 1)
    g.fillCircle(39, 9, 1.4)
    g.generateTexture('tex_dino_starhorn', 49, 32)
    g.clear()

    // visitors share a body silhouette; accessories tell them apart
    g.fillStyle(0x4e342e, 1) // shoes
    g.fillRoundedRect(1, 24, 6, 3, 1)
    g.fillRoundedRect(9, 24, 6, 3, 1)
    g.fillStyle(0xffccaa, 1) // head
    g.fillCircle(8, 7, 6.5)
    g.fillStyle(0x3f51b5, 1) // body - boy blue
    g.fillRoundedRect(2, 12, 12, 13, 3)
    g.fillStyle(0x1a237e, 1) // cap
    g.fillEllipse(8, 2.5, 13, 5)
    g.fillRect(2, 1, 12, 3)
    g.generateTexture('tex_visitor_boy', 16, 27)
    g.clear()

    g.fillStyle(0x4e342e, 1)
    g.fillRoundedRect(1, 24, 6, 3, 1)
    g.fillRoundedRect(9, 24, 6, 3, 1)
    g.fillStyle(0xffccaa, 1)
    g.fillCircle(8, 7, 6.5)
    g.fillStyle(0xe91e63, 1) // body - girl pink dress (flared)
    g.fillTriangle(1, 25, 15, 25, 8, 12)
    g.fillRoundedRect(3, 11, 10, 6, 3)
    g.fillStyle(0x880e4f, 1) // ribbon
    g.fillTriangle(8, 1, 13, 4, 8, 4)
    g.fillTriangle(8, 1, 3, 4, 8, 4)
    g.fillStyle(0x6a1b3a, 1)
    g.fillCircle(8, 3, 1.6)
    g.generateTexture('tex_visitor_girl', 16, 27)
    g.clear()

    g.fillStyle(0x37474f, 1) // shoes
    g.fillRoundedRect(1, 24, 6, 3, 1)
    g.fillRoundedRect(9, 24, 6, 3, 1)
    g.fillStyle(0xffccaa, 1)
    g.fillCircle(8, 7, 6.5)
    g.fillStyle(0x607d8b, 1) // body - office suit
    g.fillRoundedRect(2, 12, 12, 13, 3)
    g.fillStyle(0xeceff1, 1) // shirt collar
    g.fillTriangle(6, 12, 10, 12, 8, 16)
    g.fillStyle(0xc62828, 1) // tie
    g.fillTriangle(7, 13, 9, 13, 8, 21)
    g.fillStyle(0x263238, 1) // hair
    g.fillEllipse(8, 2.5, 11, 4)
    g.generateTexture('tex_visitor_office', 16, 27)
    g.clear()

    // wooden feeding trough with a pile of leafy greens
    g.fillStyle(0x6d4c41, 1)
    g.fillRoundedRect(0, 6, 32, 11, 3)
    g.fillStyle(0x8d6e63, 1)
    g.fillRoundedRect(2, 7, 28, 6, 2)
    g.fillStyle(0x4caf50, 1)
    g.fillEllipse(9, 6, 9, 6)
    g.fillEllipse(17, 4, 10, 6)
    g.fillEllipse(25, 6, 9, 6)
    g.fillStyle(0x66bb6a, 1)
    g.fillEllipse(17, 5, 6, 4)
    g.generateTexture('tex_feeder', 32, 19)
    g.clear()

    // A tiny leaf-cookie wagon with scalloped awning, jars and cookie sign.
    g.fillStyle(0x000000, 0.12)
    g.fillEllipse(20, 36, 36, 6)
    g.fillStyle(0x8d5a3b, 1)
    g.fillRoundedRect(3, 12, 34, 23, 4)
    g.fillStyle(0xfff4d6, 1)
    g.fillRoundedRect(7, 18, 26, 12, 2)
    g.fillStyle(0x8bc34a, 1)
    g.fillRect(3, 10, 34, 7)
    g.fillCircle(7, 17, 4)
    g.fillCircle(19, 17, 4)
    g.fillCircle(31, 17, 4)
    g.fillStyle(0xffd166, 1)
    g.fillRect(9, 10, 7, 7)
    g.fillRect(23, 10, 7, 7)
    g.fillCircle(13, 17, 4)
    g.fillCircle(25, 17, 4)
    g.fillStyle(0xd99a45, 1)
    g.fillCircle(14, 24, 4)
    g.fillCircle(26, 24, 4)
    g.fillStyle(0x6d4423, 1)
    g.fillCircle(13, 23, 0.8)
    g.fillCircle(15, 25, 0.8)
    g.fillCircle(25, 23, 0.8)
    g.fillCircle(27, 25, 0.8)
    g.fillStyle(0x5d4037, 1)
    g.fillRect(19, 3, 2, 8)
    g.fillStyle(0x66bb6a, 1)
    g.fillEllipse(20, 4, 15, 8)
    g.fillStyle(0xa5d66a, 1)
    g.fillEllipse(17, 3, 6, 3)
    g.generateTexture('tex_shop', 40, 38)
    g.clear()

    // Reserve-style timber toilet with a living roof and leaf emblem.
    g.fillStyle(0x000000, 0.12)
    g.fillEllipse(20, 38, 34, 5)
    g.fillStyle(0x795548, 1)
    g.fillRoundedRect(5, 10, 30, 28, 3)
    g.fillStyle(0x9b7653, 1)
    g.fillRect(8, 12, 4, 24)
    g.fillRect(16, 12, 4, 24)
    g.fillRect(28, 12, 4, 24)
    g.fillStyle(0x4f7138, 1)
    g.fillTriangle(2, 12, 38, 12, 20, 2)
    g.fillStyle(0x7cb342, 1)
    g.fillEllipse(12, 7, 14, 6)
    g.fillEllipse(25, 6, 18, 7)
    g.fillStyle(0x4e342e, 1)
    g.fillRoundedRect(14, 17, 12, 21, 2)
    g.fillStyle(0xe8f5e9, 1)
    g.fillCircle(20, 14, 4)
    g.fillStyle(0x66bb6a, 1)
    g.fillEllipse(20, 14, 5, 8)
    g.fillStyle(0xd7ccc8, 1)
    g.fillCircle(23, 27, 1.2)
    g.generateTexture('tex_toilet', 40, 40)
    g.clear()

    // Timber-and-glass hatchery: the central home for each new generation.
    g.fillStyle(0x000000, 0.12)
    g.fillEllipse(20, 38, 38, 6)
    g.fillStyle(0x6d4c41, 1)
    g.fillRoundedRect(2, 13, 36, 25, 4)
    g.fillStyle(0xb2dfdb, 0.9)
    g.fillRoundedRect(7, 17, 26, 17, 5)
    g.lineStyle(2, 0x4f776f, 1)
    g.strokeRoundedRect(7, 17, 26, 17, 5)
    g.fillStyle(0x4f7138, 1)
    g.fillTriangle(0, 15, 40, 15, 20, 2)
    g.fillStyle(0x8bc34a, 1)
    g.fillEllipse(11, 8, 17, 7)
    g.fillEllipse(27, 8, 19, 8)
    g.fillStyle(0xfff4d6, 1)
    g.fillCircle(20, 25, 7)
    g.generateTexture('tex_hatchery', 40, 40)
    g.clear()

    g.fillStyle(0x000000, 0.1)
    g.fillEllipse(10, 19, 17, 4)
    g.fillStyle(0xfff3cd, 1)
    g.fillEllipse(10, 10, 15, 19)
    g.fillStyle(0xffffff, 0.75)
    g.fillEllipse(7, 6, 4, 7)
    g.fillStyle(0x8bc34a, 1)
    g.fillCircle(13, 12, 2)
    g.generateTexture('tex_egg', 20, 21)
    g.clear()

    g.fillStyle(0x000000, 0.1)
    g.fillEllipse(10, 19, 17, 4)
    g.fillStyle(0xb7ccff, 1)
    g.fillEllipse(10, 10, 15, 19)
    g.fillStyle(0xe8eeff, 0.85)
    g.fillEllipse(7, 6, 4, 7)
    g.fillStyle(0xffe66d, 1)
    g.fillCircle(12, 10, 2.5)
    g.fillCircle(7, 14, 1.5)
    g.generateTexture('tex_rare_egg', 20, 21)
    g.clear()

    // raindrop
    g.fillStyle(0x90caf9, 0.8)
    g.fillRect(0, 0, 2, 10)
    g.generateTexture('tex_raindrop', 2, 10)
    g.clear()

    // tiny dust/leaf speck used for the build-placement particle puff
    g.fillStyle(0xa5d6a7, 1)
    g.fillCircle(3, 3, 3)
    g.generateTexture('tex_dust', 6, 6)
    g.clear()

    g.destroy()
  }

  create() {
    this.saveState = SaveManager.load()
    this.gameSpeed = this.saveState.gameSpeed
    soundManager.setEnabled(this.saveState.soundOn)

    this.cameras.main.setBackgroundColor(0x8bc34a)
    this.drawStaticScenery()
    this.createFacilitiesFromState()
    this.createDinosaursFromState()
    this.ensureEgg()
    this.createOverlays()

    this.buildHighlight = this.add.graphics().setDepth(50)

    this.input.on('pointerdown', this.handlePointerDown, this)

    eventBus.on('set-build-mode', this.handleSetBuildMode, this)
    eventBus.on('reset-game', this.handleResetGame, this)
    eventBus.on('set-speed', this.handleSetSpeed, this)
    eventBus.on('set-sound', this.handleSetSound, this)

    // Game.destroy() tears scenes down via the DESTROY event, not SHUTDOWN
    // (SHUTDOWN is only emitted when a scene is stopped while the game keeps
    // running) - listen for both so React's effect-cleanup teardown path
    // (and StrictMode's double-invoke in dev) doesn't leak listeners onto
    // the shared eventBus singleton.
    const cleanup = () => {
      eventBus.off('set-build-mode', this.handleSetBuildMode, this)
      eventBus.off('reset-game', this.handleResetGame, this)
      eventBus.off('set-speed', this.handleSetSpeed, this)
      eventBus.off('set-sound', this.handleSetSound, this)
      this.input.off('pointerdown', this.handlePointerDown, this)
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup)
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup)

    this.dayPhaseTimer = 0
    this.weatherTimer = 0
    this.visitorSpawnNext = this.computeNextVisitorInterval()

    this.applyWeatherVisuals()
    this.applyTimeOfDayVisuals()
    this.emitState()
    eventBus.emit('info', 'モコがぽてぽて歩いています')
  }

  private drawStaticScenery() {
    const g = this.add.graphics().setDepth(-5)
    g.fillStyle(0x7cb342, 1)
    for (let i = 0; i < 14; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH)
      const y = Phaser.Math.Between(0, GAME_HEIGHT)
      g.fillEllipse(x, y, Phaser.Math.Between(20, 40), Phaser.Math.Between(10, 18))
    }
    // a few tiny flowers dotted around for a "cared-for reserve" feel
    const flowerColors = [0xffd54f, 0xffffff, 0xf48fb1]
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH)
      const y = Phaser.Math.Between(0, GAME_HEIGHT)
      g.fillStyle(flowerColors[i % flowerColors.length], 1)
      g.fillCircle(x, y, 2)
    }

    // ranger hut - a cosy little cabin with a window and chimney puff
    const hut = this.add.graphics().setDepth(0)
    hut.fillStyle(0x000000, 0.12)
    hut.fillEllipse(HUT_X + HUT_WIDTH / 2, HUT_Y + HUT_HEIGHT + 4, HUT_WIDTH * 1.1, 8)
    hut.fillStyle(0xd7ccc8, 1) // base wall
    hut.fillRoundedRect(HUT_X, HUT_Y + HUT_HEIGHT * 0.4, HUT_WIDTH, HUT_HEIGHT * 0.6, 4)
    hut.fillStyle(0xc62828, 1) // roof
    hut.fillTriangle(
      HUT_X - 6,
      HUT_Y + HUT_HEIGHT * 0.42,
      HUT_X + HUT_WIDTH + 6,
      HUT_Y + HUT_HEIGHT * 0.42,
      HUT_X + HUT_WIDTH / 2,
      HUT_Y,
    )
    hut.fillStyle(0x8d4444, 1) // roof ridge highlight
    hut.fillTriangle(
      HUT_X + HUT_WIDTH / 2 - 4,
      HUT_Y + HUT_HEIGHT * 0.42,
      HUT_X + HUT_WIDTH / 2 + 4,
      HUT_Y + HUT_HEIGHT * 0.42,
      HUT_X + HUT_WIDTH / 2,
      HUT_Y,
    )
    hut.fillStyle(0x5d4037, 1) // door
    hut.fillRoundedRect(HUT_X + HUT_WIDTH / 2 - 8, HUT_Y + HUT_HEIGHT - 18, 16, 18, 3)
    hut.fillStyle(0xa1887f, 1) // window frame
    hut.fillRoundedRect(HUT_X + 8, HUT_Y + HUT_HEIGHT * 0.55, 14, 14, 2)
    hut.fillStyle(0xbbdefb, 1) // window glass
    hut.fillRect(HUT_X + 10, HUT_Y + HUT_HEIGHT * 0.55 + 2, 10, 10)

    // fence around the pen, with sturdy rounded posts
    const fence = this.add.graphics().setDepth(1)
    fence.fillStyle(0x000000, 0.1)
    fence.fillEllipse(PEN_X + PEN_WIDTH / 2, PEN_Y + PEN_HEIGHT + 5, PEN_WIDTH * 0.95, 10)
    fence.lineStyle(4, 0x8d6748, 1)
    fence.strokeRoundedRect(PEN_X, PEN_Y, PEN_WIDTH, PEN_HEIGHT, 6)
    fence.lineStyle(3, 0x6d4c41, 1)
    for (let i = 1; i < PEN_COLS; i++) {
      fence.lineBetween(PEN_X + i * TILE_SIZE, PEN_Y, PEN_X + i * TILE_SIZE, PEN_Y + 7)
      fence.lineBetween(PEN_X + i * TILE_SIZE, PEN_Y + PEN_HEIGHT - 7, PEN_X + i * TILE_SIZE, PEN_Y + PEN_HEIGHT)
    }
    for (let i = 1; i < PEN_ROWS; i++) {
      fence.lineBetween(PEN_X, PEN_Y + i * TILE_SIZE, PEN_X + 7, PEN_Y + i * TILE_SIZE)
      fence.lineBetween(PEN_X + PEN_WIDTH - 7, PEN_Y + i * TILE_SIZE, PEN_X + PEN_WIDTH, PEN_Y + i * TILE_SIZE)
    }
    fence.fillStyle(0x6d4c41, 1)
    for (let gx = 0; gx <= PEN_COLS; gx++) {
      for (let gy = 0; gy <= PEN_ROWS; gy++) {
        fence.fillCircle(PEN_X + gx * TILE_SIZE, PEN_Y + gy * TILE_SIZE, 4)
      }
    }

    // small welcome sign beside the pen entrance
    const sign = this.add.graphics().setDepth(1)
    const signX = PEN_X - 18
    const signY = PEN_Y + PEN_HEIGHT - 18
    sign.fillStyle(0x6d4c41, 1)
    sign.fillRect(signX + 6, signY + 6, 4, 16)
    sign.fillStyle(0xefebe0, 1)
    sign.fillRoundedRect(signX - 6, signY - 10, 22, 16, 3)
    sign.lineStyle(2, 0x8d6748, 1)
    sign.strokeRoundedRect(signX - 6, signY - 10, 22, 16, 3)
  }

  private createOverlays() {
    this.rainOverlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x3b6fa0, 0)
      .setOrigin(0, 0)
      .setDepth(900)

    this.rainEmitter = this.add.particles(0, 0, 'tex_raindrop', {
      x: { min: 0, max: GAME_WIDTH },
      y: -10,
      lifespan: 1200,
      speedY: { min: 180, max: 260 },
      speedX: { min: -10, max: 10 },
      quantity: 2,
      frequency: 40,
      emitting: false,
    })
    this.rainEmitter.setDepth(950)

    this.nightOverlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0a2a, 0)
      .setOrigin(0, 0)
      .setDepth(1000)
  }

  private createDinosaur(data: DinosaurSaveData): Dinosaur {
    const dinosaur = new Dinosaur(this, data, {
      x: PEN_X,
      y: PEN_Y,
      width: PEN_WIDTH,
      height: PEN_HEIGHT,
    })
    dinosaur.setDepth(5)
    if (data.generation > 1 && data.speciesId === 'mini-leaf') dinosaur.setTint(0xe8ffd9)
    this.dinosaurs.push(dinosaur)
    return dinosaur
  }

  private createDinosaursFromState() {
    this.dinosaurs.forEach((dinosaur) => dinosaur.destroy())
    this.dinosaurs = []
    this.saveState.dinosaurs.forEach((data) => this.createDinosaur(data))
  }

  private createFacilitiesFromState() {
    this.facilitySprites.forEach((facility) => facility.sprite.destroy())
    this.facilitySprites = []
    for (const facility of this.saveState.facilities) {
      this.addFacilitySprite(facility)
    }
  }

  private facilityWorldPosition(facility: FacilityData): Phaser.Math.Vector2 {
    if (facility.type === 'feeder' || facility.type === 'hatchery') {
      return new Phaser.Math.Vector2(
        PEN_X + facility.gridX * TILE_SIZE + TILE_SIZE / 2,
        PEN_Y + facility.gridY * TILE_SIZE + TILE_SIZE / 2,
      )
    }
    return new Phaser.Math.Vector2(
      facility.gridX * TILE_SIZE + TILE_SIZE / 2,
      facility.gridY * TILE_SIZE + TILE_SIZE / 2,
    )
  }

  private addFacilitySprite(facility: FacilityData): Phaser.GameObjects.Sprite {
    const position = this.facilityWorldPosition(facility)
    const sprite = this.add.sprite(position.x, position.y, `tex_${facility.type}`).setDepth(4)
    this.facilitySprites.push({ data: facility, sprite })
    return sprite
  }

  private feederWorldPositions(): Phaser.Math.Vector2[] {
    return this.facilitySprites
      .filter((facility) => facility.data.type === 'feeder')
      .map((facility) => new Phaser.Math.Vector2(facility.sprite.x, facility.sprite.y))
  }

  private hatcheryPosition(): Phaser.Math.Vector2 | null {
    const hatchery = this.facilitySprites.find((facility) => facility.data.type === 'hatchery')
    return hatchery ? new Phaser.Math.Vector2(hatchery.sprite.x, hatchery.sprite.y) : null
  }

  private destroyEggVisual() {
    this.eggSprite?.destroy()
    this.eggLabel?.destroy()
    this.eggSprite = null
    this.eggLabel = null
  }

  private createEggVisual() {
    this.destroyEggVisual()
    const position = this.hatcheryPosition()
    if (!this.saveState.egg || !position) return
    const texture = this.saveState.egg.rarity === 'rare' ? 'tex_rare_egg' : 'tex_egg'
    this.eggSprite = this.add.sprite(position.x, position.y + 3, texture).setDepth(8)
    this.eggLabel = this.add
      .text(position.x, position.y - 22, '', {
        fontSize: '10px',
        color: '#5d4037',
        fontStyle: 'bold',
        backgroundColor: '#fff8e1dd',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(9)
    this.updateEggLabel()
  }

  private updateEggLabel() {
    if (!this.eggLabel || !this.saveState.egg) return
    const seconds = Math.max(0, Math.ceil(this.saveState.egg.remainingMs / 1000))
    this.eggLabel.setText(seconds > 0 ? `孵化まで ${seconds}秒` : 'もうすぐ誕生！')
  }

  private ensureEgg() {
    if (this.saveState.egg || this.hatching || this.dinosaurs.length >= 2 || !this.hatcheryPosition()) {
      if (this.saveState.egg && !this.eggSprite) this.createEggVisual()
      return
    }
    const useRareEgg = this.saveState.rareEggs > 0 && this.saveState.unlockedSpecies.includes('starhorn')
    if (useRareEgg) this.saveState.rareEggs -= 1
    this.saveState.egg = {
      id: `egg-${Date.now()}`,
      speciesId: useRareEgg ? 'starhorn' : 'mini-leaf',
      rarity: useRareEgg ? 'rare' : 'normal',
      generation: this.saveState.nextGeneration,
      remainingMs: EGG_HATCH_DURATION_MS,
    }
    this.createEggVisual()
    this.persist()
    this.emitState()
    const eggName = useRareEgg ? 'レアなホシツノの卵' : `${formatGeneration(this.saveState.nextGeneration)}ミニリーフの卵`
    eventBus.emit('info', `${eggName}を迎えました`)
  }

  private updateEgg(delta: number) {
    const egg = this.saveState.egg
    if (!egg || this.hatching) return
    egg.remainingMs = Math.max(0, egg.remainingMs - delta)
    this.updateEggLabel()
    const seconds = Math.ceil(egg.remainingMs / 1000)
    if (seconds !== this.lastEggSecond) {
      this.lastEggSecond = seconds
      this.emitState()
    }
    if (egg.remainingMs <= 0) this.startHatching()
  }

  private startHatching() {
    const egg = this.saveState.egg
    const position = this.hatcheryPosition()
    if (!egg || !position || this.hatching) return
    this.hatching = true
    soundManager.playHatch()
    eventBus.emit('info', '卵がきらきら光りはじめました')

    if (this.eggSprite) {
      this.tweens.add({
        targets: this.eggSprite,
        angle: { from: -8, to: 8 },
        scale: { from: 1, to: 1.16 },
        duration: 90,
        yoyo: true,
        repeat: 6,
      })
    }
    const glow = this.add.circle(position.x, position.y, 9, 0xfff59d, 0.8).setDepth(7)
    this.tweens.add({
      targets: glow,
      scale: 4,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => glow.destroy(),
    })
    for (let i = 0; i < 8; i++) {
      const sparkle = this.add
        .text(position.x, position.y, i % 2 === 0 ? '★' : '✦', { fontSize: '11px', color: '#fff176' })
        .setOrigin(0.5)
        .setDepth(10)
      const angle = (Math.PI * 2 * i) / 8
      this.tweens.add({
        targets: sparkle,
        x: position.x + Math.cos(angle) * 34,
        y: position.y + Math.sin(angle) * 30,
        alpha: 0,
        duration: 850,
        delay: i * 35,
        onComplete: () => sparkle.destroy(),
      })
    }
    this.time.delayedCall(1050, () => this.completeHatch())
  }

  private completeHatch() {
    const egg = this.saveState.egg
    if (!egg) {
      this.hatching = false
      return
    }
    const namePool = egg.speciesId === 'starhorn' ? STARHORN_NAMES : MINI_LEAF_NAMES
    const name = namePool[(egg.generation - 2) % namePool.length]
    const data: DinosaurSaveData = {
      id: `dino-${egg.generation}-${Date.now()}`,
      name,
      speciesId: egg.speciesId,
      generation: egg.generation,
      protectionYears: 0,
      popularity: 0,
      x: Phaser.Math.Between(PEN_X + 30, PEN_X + PEN_WIDTH - 30),
      y: Phaser.Math.Between(PEN_Y + 30, PEN_Y + PEN_HEIGHT - 30),
    }
    this.saveState.egg = null
    this.lastEggSecond = -1
    this.saveState.nextGeneration = Math.max(this.saveState.nextGeneration, egg.generation + 1)
    this.destroyEggVisual()
    const dinosaur = this.createDinosaur(data).setScale(0.2).setAlpha(0)
    this.tweens.add({ targets: dinosaur, scale: 1, alpha: 1, duration: 500, ease: 'Back.easeOut' })
    this.hatching = false
    this.emitState()
    this.persist()
    eventBus.emit(
      'info',
      `${formatGeneration(data.generation)}の${speciesDisplayName(data.speciesId)}「${name}」が元気に孵化しました！`,
    )
  }

  // ---------- build mode ----------

  private handleSetBuildMode(type: FacilityType | null) {
    this.buildType = type
    if (type) {
      eventBus.emit('info', '設置する場所をタップしてください')
    }
    this.drawBuildHighlight()
  }

  private drawBuildHighlight() {
    this.buildHighlight.clear()
    if (!this.buildType) return
    const isPenFacility = this.buildType === 'feeder' || this.buildType === 'hatchery'
    if (isPenFacility) {
      for (let gx = 0; gx < PEN_COLS; gx++) {
        for (let gy = 0; gy < PEN_ROWS; gy++) {
          const occupied = this.saveState.facilities.some(
            (facility) =>
              (facility.type === 'feeder' || facility.type === 'hatchery') &&
              facility.gridX === gx &&
              facility.gridY === gy,
          )
          const x = PEN_X + gx * TILE_SIZE
          const y = PEN_Y + gy * TILE_SIZE
          this.buildHighlight.fillStyle(occupied ? 0xef5350 : 0xffee58, 0.35)
          this.buildHighlight.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4)
        }
      }
      return
    }

    for (const slot of AMENITY_GRID_SLOTS) {
      const occupied = this.saveState.facilities.some(
        (facility) =>
          facility.type !== 'feeder' &&
          facility.type !== 'hatchery' &&
          facility.gridX === slot.gridX &&
          facility.gridY === slot.gridY,
      )
      const x = slot.gridX * TILE_SIZE
      const y = slot.gridY * TILE_SIZE
      this.buildHighlight.fillStyle(occupied ? 0xef5350 : 0xffee58, 0.35)
      this.buildHighlight.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4)
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    soundManager.unlock()
    if (!this.buildType) return

    const isPenFacility = this.buildType === 'feeder' || this.buildType === 'hatchery'
    const gridX = Math.floor((pointer.worldX - (isPenFacility ? PEN_X : 0)) / TILE_SIZE)
    const gridY = Math.floor((pointer.worldY - (isPenFacility ? PEN_Y : 0)) / TILE_SIZE)
    const inBounds = isPenFacility
      ? gridX >= 0 && gridX < PEN_COLS && gridY >= 0 && gridY < PEN_ROWS
      : AMENITY_GRID_SLOTS.some((slot) => slot.gridX === gridX && slot.gridY === gridY)
    if (!inBounds) {
      const message = isPenFacility ? '柵の中をタップしてください' : '黄色い柵外グリッドをタップしてください'
      eventBus.emit('build-result', { success: false, message })
      return
    }

    const occupied = this.saveState.facilities.some((facility) =>
      isPenFacility
        ? (facility.type === 'feeder' || facility.type === 'hatchery') &&
          facility.gridX === gridX && facility.gridY === gridY
        : facility.type !== 'feeder' && facility.type !== 'hatchery' &&
          facility.gridX === gridX && facility.gridY === gridY,
    )
    if (occupied) {
      eventBus.emit('build-result', { success: false, message: 'すでに何か置かれています' })
      return
    }

    if (this.buildType === 'hatchery' && this.saveState.facilities.some((facility) => facility.type === 'hatchery')) {
      eventBus.emit('build-result', { success: false, message: '孵化施設は1棟だけ建築できます' })
      return
    }

    const facilityDef = FACILITIES[this.buildType]
    const cost = facilityDef.cost
    if (this.saveState.money < cost) {
      eventBus.emit('build-result', { success: false, message: '資金が足りません' })
      return
    }

    this.saveState.money -= cost
    const type = this.buildType
    const facility: FacilityData = { id: `${type}-${Date.now()}`, type, gridX, gridY }
    this.saveState.facilities.push(facility)
    const sprite = this.addFacilitySprite(facility)
    this.playBuildFeedback(sprite)

    this.buildType = null
    this.drawBuildHighlight()
    this.emitState()
    this.persist()
    eventBus.emit('build-result', { success: true, message: `${facilityDef.displayName}を設置しました` })
    if (type === 'hatchery') this.ensureEgg()
  }

  /** "ぽふん": a quick scale-punch plus a soft puff ring and a scatter of dust specks. */
  private playBuildFeedback(sprite: Phaser.GameObjects.Sprite) {
    sprite.setScale(0)
    this.tweens.add({
      targets: sprite,
      scale: 1.2,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: sprite, scale: 1, duration: 120, ease: 'Sine.easeInOut' })
      },
    })

    const puff = this.add.circle(sprite.x, sprite.y, 10, 0xffffff, 0.55).setDepth(3).setScale(0.3)
    this.tweens.add({
      targets: puff,
      scale: 2.4,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => puff.destroy(),
    })

    const emitter = this.add.particles(sprite.x, sprite.y, 'tex_dust', {
      speed: { min: 40, max: 90 },
      angle: { min: 0, max: 360 },
      lifespan: 350,
      scale: { start: 1, end: 0 },
      emitting: false,
    })
    emitter.setDepth(3)
    emitter.explode(10)
    this.time.delayedCall(450, () => emitter.destroy())
  }

  // ---------- visitors ----------

  private computeNextVisitorInterval(): number {
    const [min, max] = VISITOR_BASE_INTERVAL_MS
    let multiplier = 1
    if (this.saveState.timeOfDay === 'night') multiplier *= NIGHT_INTERVAL_MULTIPLIER
    if (this.saveState.weather === 'rainy') multiplier *= RAIN_INTERVAL_MULTIPLIER
    const reputationRatio = Math.min(this.saveState.reputation, REPUTATION_VISITOR_CAP) / REPUTATION_VISITOR_CAP
    multiplier *= 1 - reputationRatio * REPUTATION_MAX_VISITOR_BOOST
    return Phaser.Math.Between(min, max) * multiplier
  }

  private pickVisitorType(): VisitorType {
    const officeWeight = this.saveState.timeOfDay === 'night' || this.saveState.weather === 'rainy' ? 0.25 : 1
    const roll = Math.random() * (2 + officeWeight)
    if (roll < 1) return 'boy'
    if (roll < 2) return 'girl'
    return 'office'
  }

  private pickSpecialVisitor(): SpecialVisitorProfile | null {
    const roll = Math.random()
    if (roll < 0.035) return Phaser.Utils.Array.GetRandom(RARE_VISITORS)
    if (roll >= 0.24) return null

    const knownIds = new Set(
      this.saveState.visitorCatalog
        .filter((entry) => entry.kind === 'regular')
        .map((entry) => entry.id),
    )
    const known = REGULAR_VISITORS.filter((profile) => knownIds.has(profile.id))
    if (known.length > 0 && Math.random() < 0.7) return Phaser.Utils.Array.GetRandom(known)
    return Phaser.Utils.Array.GetRandom(REGULAR_VISITORS)
  }

  private handleSpecialVisitor(profile: SpecialVisitorProfile, dinosaurId: string, visitor: Visitor) {
    let catalogEntry = this.saveState.visitorCatalog.find((entry) => entry.id === profile.id)
    if (!catalogEntry) {
      catalogEntry = {
        id: profile.id,
        displayName: profile.displayName,
        kind: profile.kind,
        firstVisitDay: this.saveState.day,
        visits: 0,
        level: 1,
      }
      this.saveState.visitorCatalog.push(catalogEntry)
    }
    catalogEntry.visits += 1
    catalogEntry.level = Math.min(10, 1 + Math.floor((catalogEntry.visits - 1) / 3))

    const dinosaur = this.dinosaurs.find((active) => active.id === dinosaurId)
    let message = `${profile.displayName}が保護区を訪れました`
    switch (profile.eventType) {
      case 'research':
        if (dinosaur) dinosaur.popularity += catalogEntry.level
        message = `${profile.displayName}の観察記録で人気度が上がりました`
        break
      case 'cheer':
        this.addReputation(1, visitor.x, visitor.y)
        message = `${profile.displayName}が友達に保護区を紹介しました`
        break
      case 'photo':
        if (dinosaur) dinosaur.popularity += 1 + catalogEntry.level
        message = `${profile.displayName}が素敵な写真を残しました`
        break
      case 'stream':
        this.addReputation(1 + Math.floor(catalogEntry.level / 3), visitor.x, visitor.y)
        message = `${profile.displayName}の配信で評判が上がりました`
        break
      case 'sponsor': {
        const support = 400 + catalogEntry.level * 100
        this.saveState.money += support
        soundManager.playCoin()
        this.showMoneyPopup(visitor.x, visitor.y, support)
        message = `${profile.displayName}から保護活動の支援を受けました`
        break
      }
      case 'famous':
        if (dinosaur) dinosaur.popularity += 4
        this.addReputation(2, visitor.x, visitor.y)
        message = `${profile.displayName}がミニリーフの魅力を発表しました`
        break
      case 'television':
        this.saveState.money += 1200
        soundManager.playCoin()
        this.showMoneyPopup(visitor.x, visitor.y, 1200)
        this.addReputation(3, visitor.x, visitor.y)
        message = 'テレビ取材でジュラパク！が紹介されました'
        break
      case 'viral':
        this.addReputation(4, visitor.x, visitor.y)
        message = `${profile.displayName}の配信が大きな話題になりました`
        break
    }
    if (profile.kind === 'rare') soundManager.playCelebration()
    this.emitState()
    this.persist()
    eventBus.emit('info', message)
  }

  private randomFacilityPosition(type: FacilityType): Phaser.Math.Vector2 | null {
    const matches = this.facilitySprites.filter((facility) => facility.data.type === type)
    if (matches.length === 0) return null
    const chosen = Phaser.Utils.Array.GetRandom(matches)
    return new Phaser.Math.Vector2(chosen.sprite.x, chosen.sprite.y + 20)
  }

  private addReputation(amount: number, x?: number, y?: number) {
    if (amount <= 0) return
    this.saveState.reputation += amount
    soundManager.playReputation()
    if (x !== undefined && y !== undefined) this.showReputationPopup(x, y, amount)
    this.emitState()
    this.persist()
    eventBus.emit('reputation-gained', { amount, total: this.saveState.reputation })
    eventBus.emit('info', '保護区の評判が少し上がりました')
  }

  private spawnVisitor() {
    if (this.visitors.length >= VISITOR_MAX_CONCURRENT || this.dinosaurs.length === 0) return
    const specialVisitor = this.pickSpecialVisitor()
    const type = specialVisitor?.visitorType ?? this.pickVisitorType()
    const watchedDinosaur = Phaser.Utils.Array.GetRandom(this.dinosaurs)
    const fromLeft = Math.random() < 0.5
    const exitLeft = Math.random() < 0.5

    const spawn = new Phaser.Math.Vector2(fromLeft ? -20 : GAME_WIDTH + 20, ENTRY_Y)
    const viewpoint = new Phaser.Math.Vector2(
      Phaser.Math.Between(PEN_X + 10, PEN_X + PEN_WIDTH - 10),
      ENTRY_Y,
    )
    const exit = new Phaser.Math.Vector2(exitLeft ? -20 : GAME_WIDTH + 20, ENTRY_Y)

    const toiletPosition = this.randomFacilityPosition('toilet')
    const visitor = new Visitor(
      this,
      spawn,
      viewpoint,
      exit,
      type,
      {
        dinosaurName: watchedDinosaur.name_,
        visitorDisplayName: specialVisitor?.displayName ?? null,
        specialKind: specialVisitor?.kind ?? null,
        specialBubble: specialVisitor?.bubble ?? null,
        feederNearby: this.facilitySprites.some((facility) => facility.data.type === 'feeder'),
        crowdPenalty: this.visitors.length >= 3 && !toiletPosition ? 5 : 0,
        shopPosition: this.randomFacilityPosition('shop'),
        toiletPosition,
        weather: this.saveState.weather,
      },
      {
        onMoneyEarned: (amount, x, y) => {
          this.saveState.money += amount
          const activeDinosaur = this.dinosaurs.find((dinosaur) => dinosaur.id === watchedDinosaur.id)
          if (activeDinosaur) activeDinosaur.popularity += 1
          soundManager.playCoin()
          this.showMoneyPopup(x, y, amount)
          this.emitState()
          this.persist()
        },
        onPurchase: (amount, x, y) => {
          this.saveState.money += amount
          soundManager.playCoin()
          this.showMoneyPopup(x, y, amount)
          this.addReputation(1, x, y)
          eventBus.emit('info', '来園者が葉っぱクッキーを買いました')
        },
        onInfo: (message) => eventBus.emit('info', message),
        onVisitStarted: (v) => {
          if (specialVisitor) this.handleSpecialVisitor(specialVisitor, watchedDinosaur.id, v)
        },
        onExit: (v) => {
          if (v.satisfaction >= 25) {
            const baseGain = v.satisfaction >= 40 ? 3 : v.satisfaction >= 32 ? 2 : 1
            const rainBonus = v.weather === 'rainy' ? 1 : 0
            this.addReputation(baseGain + rainBonus, v.x, v.y)
          }
          this.visitors = this.visitors.filter((existing) => existing !== v)
          v.destroy()
        },
      },
    )
    visitor.setDepth(6)
    this.visitors.push(visitor)
  }

  private showMoneyPopup(x: number, y: number, amount: number) {
    const label = `+¥${amount}`
    const text = this.add
      .text(0, 0, label, { fontSize: '13px', color: '#7a4a00', fontStyle: 'bold' })
      .setOrigin(0.5)
    const pillWidth = text.width + 18
    const pillHeight = text.height + 8
    const bg = this.add.graphics()
    bg.fillStyle(0xfff3cd, 1)
    bg.lineStyle(2, 0xf0b429, 1)
    bg.fillRoundedRect(-pillWidth / 2, -pillHeight / 2, pillWidth, pillHeight, pillHeight / 2)
    bg.strokeRoundedRect(-pillWidth / 2, -pillHeight / 2, pillWidth, pillHeight, pillHeight / 2)

    const popup = this.add.container(x, y - 22, [bg, text]).setDepth(20).setScale(0.5).setAlpha(0)
    this.tweens.add({ targets: popup, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' })
    this.tweens.add({
      targets: popup,
      y: popup.y - 24,
      alpha: 0,
      duration: 900,
      delay: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    })
  }

  private showReputationPopup(x: number, y: number, amount: number) {
    const label = this.add
      .text(0, 0, `★ 評判 +${amount}`, { fontSize: '13px', color: '#7a4d00', fontStyle: 'bold' })
      .setOrigin(0.5)
    const width = label.width + 22
    const bg = this.add.graphics()
    bg.fillStyle(0xfff8d6, 0.98)
    bg.lineStyle(2, 0xf0b429, 1)
    bg.fillRoundedRect(-width / 2, -13, width, 26, 9)
    bg.strokeRoundedRect(-width / 2, -13, width, 26, 9)
    const popup = this.add.container(x, y - 44, [bg, label]).setDepth(25).setScale(0.5).setAlpha(0)
    this.tweens.add({ targets: popup, scale: 1.08, alpha: 1, duration: 260, ease: 'Back.easeOut' })
    this.tweens.add({
      targets: popup,
      scale: 1,
      y: popup.y - 24,
      alpha: 0,
      duration: 750,
      delay: 750,
      onComplete: () => popup.destroy(),
    })
    for (let i = 0; i < 3; i++) {
      const star = this.add
        .text(x, y - 42, '★', { fontSize: '11px', color: '#ffd54f' })
        .setOrigin(0.5)
        .setDepth(24)
      this.tweens.add({
        targets: star,
        x: x + (i - 1) * 20,
        y: y - 72 - (i % 2) * 8,
        alpha: 0,
        scale: 1.5,
        duration: 700,
        delay: i * 70,
        ease: 'Cubic.easeOut',
        onComplete: () => star.destroy(),
      })
    }
  }

  // ---------- time / weather ----------

  private applyTimeOfDayVisuals() {
    const isNight = this.saveState.timeOfDay === 'night'
    this.tweens.add({ targets: this.nightOverlay, alpha: isNight ? 0.45 : 0, duration: 800 })
    soundManager.setNight(isNight)
  }

  private applyWeatherVisuals() {
    const isRain = this.saveState.weather === 'rainy'
    this.tweens.add({ targets: this.rainOverlay, alpha: isRain ? 0.18 : 0, duration: 800 })
    if (isRain) this.rainEmitter.start()
    else this.rainEmitter.stop()
    soundManager.setRain(isRain)
  }

  private updateDayNightCycle(delta: number) {
    this.dayPhaseTimer += delta
    const duration = this.saveState.timeOfDay === 'day' ? DAY_DURATION_MS : NIGHT_DURATION_MS
    if (this.dayPhaseTimer >= duration) {
      this.dayPhaseTimer = 0
      const wasNight = this.saveState.timeOfDay === 'night'
      this.saveState.timeOfDay = wasNight ? 'day' : 'night'
      if (wasNight) {
        this.saveState.day += 1
        this.advanceProtectionYears()
        this.runContestIfDue()
      }
      this.applyTimeOfDayVisuals()
      this.emitState()
      this.persist()
      if (!wasNight) {
        eventBus.emit('info', '保護区に静かな夜が来ました')
      }
    }
  }

  private runContestIfDue() {
    if (this.saveState.day < this.saveState.contest.nextContestDay) return
    const contest = this.saveState.contest
    const title = CONTEST_TITLES[contest.held % CONTEST_TITLES.length]
    const popularity = this.dinosaurs.reduce((sum, dinosaur) => sum + dinosaur.popularity, 0)
    const regularGrowth = this.saveState.visitorCatalog
      .filter((entry) => entry.kind === 'regular')
      .reduce((sum, entry) => sum + entry.level, 0)
    const score = Math.floor(this.saveState.reputation / 4) + popularity + regularGrowth + this.saveState.facilities.length
    const rank = score >= 18 ? 1 : score >= 9 ? 2 : 3
    const moneyReward = rank === 1 ? 5000 : rank === 2 ? 3000 : 1500
    const reputationReward = rank === 1 ? 6 : rank === 2 ? 4 : 2

    contest.held += 1
    if (rank === 1) contest.wins += 1
    contest.lastTitle = title
    contest.lastRank = rank
    do contest.nextContestDay += CONTEST_INTERVAL_DAYS
    while (contest.nextContestDay <= this.saveState.day)

    this.saveState.money += moneyReward
    let rareAwarded = false
    if (score >= CONTEST_RARE_UNLOCK_SCORE && !this.saveState.unlockedSpecies.includes('starhorn')) {
      this.saveState.unlockedSpecies.push('starhorn')
      this.saveState.rareEggs += 1
      rareAwarded = true
    } else if (rank === 1 && contest.wins % 3 === 0) {
      this.saveState.rareEggs += 1
      rareAwarded = true
    }

    soundManager.playCelebration()
    this.addReputation(reputationReward)
    this.showContestBanner(title, rank, moneyReward, rareAwarded)
    this.ensureEgg()
    this.emitState()
    this.persist()
    const rareMessage = rareAwarded ? ' ホシツノのレア卵を獲得！' : ''
    eventBus.emit('info', `${title}で${rank}位！ 評判と活動資金を獲得しました。${rareMessage}`)
  }

  private showContestBanner(title: string, rank: number, moneyReward: number, rareAwarded: boolean) {
    const subtitle = `${rank}位  +¥${moneyReward.toLocaleString()}${rareAwarded ? '  レア卵獲得！' : ''}`
    const panel = this.add.container(GAME_WIDTH / 2, 178).setDepth(40).setScale(0.6).setAlpha(0)
    const bg = this.add.graphics()
    bg.fillStyle(0xfff8d6, 0.98)
    bg.lineStyle(3, rank === 1 ? 0xf0b429 : 0x8bc34a, 1)
    bg.fillRoundedRect(-112, -33, 224, 66, 8)
    bg.strokeRoundedRect(-112, -33, 224, 66, 8)
    const heading = this.add
      .text(0, -12, `🏆 ${title}`, { fontSize: '16px', color: '#6d4423', fontStyle: 'bold' })
      .setOrigin(0.5)
    const result = this.add
      .text(0, 13, subtitle, { fontSize: '12px', color: '#2f6b38', fontStyle: 'bold' })
      .setOrigin(0.5)
    panel.add([bg, heading, result])
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' })
    this.tweens.add({
      targets: panel,
      y: panel.y - 15,
      alpha: 0,
      duration: 750,
      delay: 2600,
      onComplete: () => panel.destroy(),
    })
  }

  private advanceProtectionYears() {
    this.dinosaurs.forEach((dinosaur) => {
      dinosaur.protectionYears += 1
    })
    const graduate = [...this.dinosaurs]
      .filter((dinosaur) => dinosaur.protectionYears >= protectionYearsForSpecies(dinosaur.speciesId))
      .sort((a, b) => a.generation - b.generation)[0]
    if (graduate && this.dinosaurs.length > 1) this.graduateDinosaur(graduate)
  }

  private graduateDinosaur(dinosaur: Dinosaur) {
    this.saveState.legends.push({
      id: dinosaur.id,
      name: dinosaur.name_,
      speciesId: dinosaur.speciesId,
      generation: dinosaur.generation,
      popularity: dinosaur.popularity,
      graduatedDay: this.saveState.day,
    })
    this.dinosaurs = this.dinosaurs.filter((active) => active !== dinosaur)
    soundManager.playCelebration()

    const x = dinosaur.logicalX
    const y = dinosaur.logicalY
    const banner = this.add
      .text(GAME_WIDTH / 2, 205, `祝！ ${dinosaur.name_} 卒業`, {
        fontSize: '17px',
        color: '#6d4423',
        fontStyle: 'bold',
        backgroundColor: '#fff8d6ee',
        padding: { x: 12, y: 7 },
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setScale(0.5)
      .setAlpha(0)
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' })
    this.tweens.add({
      targets: banner,
      y: banner.y - 12,
      alpha: 0,
      duration: 700,
      delay: 2100,
      onComplete: () => banner.destroy(),
    })
    for (let i = 0; i < 12; i++) {
      const colors = ['#ffd54f', '#81c784', '#64b5f6', '#f48fb1']
      const confetti = this.add
        .text(x, y - 18, i % 3 === 0 ? '★' : '●', { fontSize: '10px', color: colors[i % colors.length] })
        .setOrigin(0.5)
        .setDepth(29)
      const angle = (Math.PI * 2 * i) / 12
      this.tweens.add({
        targets: confetti,
        x: x + Math.cos(angle) * Phaser.Math.Between(35, 60),
        y: y - 25 + Math.sin(angle) * Phaser.Math.Between(25, 45),
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: 1100,
        onComplete: () => confetti.destroy(),
      })
    }
    this.tweens.add({
      targets: dinosaur,
      y: y - 24,
      alpha: 0,
      scale: 1.2,
      duration: 1200,
      delay: 500,
      ease: 'Cubic.easeIn',
      onComplete: () => dinosaur.destroy(),
    })

    this.ensureEgg()
    this.emitState()
    this.persist()
    eventBus.emit(
      'info',
      `${formatGeneration(dinosaur.generation)}の${dinosaur.name_}が古代楽園へ元気に旅立ちました！`,
    )
  }

  private updateWeatherCycle(delta: number) {
    this.weatherTimer += delta
    if (this.weatherTimer >= WEATHER_CHECK_INTERVAL_MS) {
      this.weatherTimer = 0
      this.saveState.weather = Math.random() < RAIN_CHANCE ? 'rainy' : 'sunny'
      this.applyWeatherVisuals()
      this.emitState()
      this.persist()
    }
  }

  private updateVisitorSpawning(delta: number) {
    this.visitorSpawnTimer += delta
    if (this.visitorSpawnTimer >= this.visitorSpawnNext) {
      this.visitorSpawnTimer = 0
      this.visitorSpawnNext = this.computeNextVisitorInterval()
      this.spawnVisitor()
    }
  }

  private nearestFeederDistanceFromDino(): number {
    let min = Infinity
    for (const facility of this.facilitySprites) {
      if (facility.data.type !== 'feeder') continue
      for (const dinosaur of this.dinosaurs) {
        const distance = Phaser.Math.Distance.Between(
          dinosaur.logicalX,
          dinosaur.logicalY,
          facility.sprite.x,
          facility.sprite.y,
        )
        if (distance < min) min = distance
      }
    }
    return min
  }

  private updateIdleInfo(delta: number) {
    this.idleInfoTimer += delta
    if (this.idleInfoTimer < 6000) return
    this.idleInfoTimer = 0

    const featuredDinosaur = Phaser.Utils.Array.GetRandom(this.dinosaurs)
    if (!featuredDinosaur) return

    if (featuredDinosaur.state === 'sleeping') {
      eventBus.emit('info', `${featuredDinosaur.name_}がすやすや眠っています`)
      return
    }

    if (featuredDinosaur.state === 'happy') {
      eventBus.emit('info', `${featuredDinosaur.name_}が嬉しそうです`)
      return
    }

    const isRain = this.saveState.weather === 'rainy'
    const pool = [`${featuredDinosaur.name_}がぽてぽて歩いています`, '小さな保護区に平和な時間が流れています']
    if (this.nearestFeederDistanceFromDino() < 60) pool.push('ミニリーフたちが餌場に近づいています')
    if (this.visitors.length > 0) pool.push('来園者が少しずつ増えてきました')
    if (this.saveState.reputation >= 5) pool.push('小さな保護区が少しずつ賑わってきました')
    if (isRain) pool.push('雨の匂いがします', '雨が草木を潤しています')

    eventBus.emit('info', Phaser.Utils.Array.GetRandom(pool))
  }

  private emitState() {
    eventBus.emit('state-update', {
      money: this.saveState.money,
      reputation: this.saveState.reputation,
      day: this.saveState.day,
      timeOfDay: this.saveState.timeOfDay,
      weather: this.saveState.weather,
      soundOn: this.saveState.soundOn,
      gameSpeed: this.saveState.gameSpeed,
      dinosaurs: this.dinosaurs.map((dinosaur) => dinosaur.toSaveData()),
      legends: this.saveState.legends,
      eggRemainingMs: this.saveState.egg?.remainingMs ?? null,
      visitorCatalog: this.saveState.visitorCatalog,
      contest: this.saveState.contest,
      unlockedSpecies: this.saveState.unlockedSpecies,
      rareEggs: this.saveState.rareEggs,
    })
  }

  private persist() {
    this.saveState.dinosaurs = this.dinosaurs.map((dinosaur) => dinosaur.toSaveData())
    SaveManager.save(this.saveState)
  }

  // ---------- settings ----------

  private handleSetSpeed(speed: GameSpeed) {
    this.gameSpeed = speed
    this.saveState.gameSpeed = speed
    this.persist()
    this.emitState()
  }

  private handleSetSound(active: boolean) {
    this.saveState.soundOn = active
    soundManager.setEnabled(active)
    if (active) {
      soundManager.setRain(this.saveState.weather === 'rainy')
      soundManager.setNight(this.saveState.timeOfDay === 'night')
    }
    this.persist()
    this.emitState()
  }

  // ---------- reset ----------

  private handleResetGame() {
    this.saveState = SaveManager.reset()
    this.gameSpeed = this.saveState.gameSpeed
    soundManager.setEnabled(this.saveState.soundOn)

    this.visitors.forEach((v) => v.destroy())
    this.visitors = []

    this.facilitySprites.forEach((facility) => facility.sprite.destroy())
    this.facilitySprites = []
    this.createFacilitiesFromState()

    this.dinosaurs.forEach((dinosaur) => dinosaur.destroy())
    this.dinosaurs = []
    this.destroyEggVisual()
    this.hatching = false
    this.lastEggSecond = -1
    this.createDinosaursFromState()
    this.ensureEgg()

    this.buildType = null
    this.drawBuildHighlight()

    this.dayPhaseTimer = 0
    this.weatherTimer = 0
    this.visitorSpawnTimer = 0
    this.visitorSpawnNext = this.computeNextVisitorInterval()

    this.applyWeatherVisuals()
    this.applyTimeOfDayVisuals()
    this.emitState()
    eventBus.emit('info', 'モコがぽてぽて歩いています')
  }

  update(_time: number, delta: number) {
    // Speed only scales simulation pace (movement / time progression) -
    // autosave cadence stays on the wall clock so saves remain frequent.
    const scaledDelta = delta * this.gameSpeed

    this.updateDayNightCycle(scaledDelta)
    this.updateWeatherCycle(scaledDelta)
    this.updateVisitorSpawning(scaledDelta)
    this.updateIdleInfo(scaledDelta)

    this.updateEgg(scaledDelta)
    const feederPositions = this.feederWorldPositions()
    this.dinosaurs.forEach((dinosaur) => {
      dinosaur.update(scaledDelta, {
        timeOfDay: this.saveState.timeOfDay,
        feederPositions,
      })
    })
    this.visitors.forEach((v) => v.update(scaledDelta))

    this.autosaveTimer += delta
    if (this.autosaveTimer >= AUTOSAVE_INTERVAL_MS) {
      this.autosaveTimer = 0
      this.persist()
    }
  }
}
