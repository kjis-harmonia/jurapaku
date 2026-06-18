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
  AUTOSAVE_INTERVAL_MS,
} from '../constants'
import { SaveManager } from '../SaveManager'
import { eventBus } from '../EventBus'
import { soundManager } from '../SoundManager'
import type { FacilityData, GameSaveState, GameSpeed, VisitorType } from '../types'
import { Dinosaur } from '../entities/Dinosaur'
import { Visitor } from '../entities/Visitor'

const ENTRY_Y = PEN_Y + PEN_HEIGHT + 50

export class MainScene extends Phaser.Scene {
  private saveState!: GameSaveState
  private dino!: Dinosaur
  private visitors: Visitor[] = []
  private feederSprites: { id: string; gridX: number; gridY: number; sprite: Phaser.GameObjects.Sprite }[] = []

  private buildMode = false
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
    this.createFeedersFromState()
    this.createDino()
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

  private createDino() {
    const pos = this.saveState.dinosaur
    this.dino = new Dinosaur(this, pos.x, pos.y, 'モコ', {
      x: PEN_X,
      y: PEN_Y,
      width: PEN_WIDTH,
      height: PEN_HEIGHT,
    })
    this.dino.setDepth(5)
  }

  private createFeedersFromState() {
    this.feederSprites.forEach((f) => f.sprite.destroy())
    this.feederSprites = []
    for (const facility of this.saveState.facilities) {
      this.addFeederSprite(facility)
    }
  }

  private addFeederSprite(facility: FacilityData): Phaser.GameObjects.Sprite {
    const worldX = PEN_X + facility.gridX * TILE_SIZE + TILE_SIZE / 2
    const worldY = PEN_Y + facility.gridY * TILE_SIZE + TILE_SIZE / 2
    const sprite = this.add.sprite(worldX, worldY, 'tex_feeder').setDepth(4)
    this.feederSprites.push({ id: facility.id, gridX: facility.gridX, gridY: facility.gridY, sprite })
    return sprite
  }

  private feederWorldPositions(): Phaser.Math.Vector2[] {
    return this.feederSprites.map((f) => new Phaser.Math.Vector2(f.sprite.x, f.sprite.y))
  }

  // ---------- build mode ----------

  private handleSetBuildMode(active: boolean) {
    this.buildMode = active
    if (active) {
      eventBus.emit('info', '設置する場所をタップしてください')
    }
    this.drawBuildHighlight()
  }

  private drawBuildHighlight() {
    this.buildHighlight.clear()
    if (!this.buildMode) return
    for (let gx = 0; gx < PEN_COLS; gx++) {
      for (let gy = 0; gy < PEN_ROWS; gy++) {
        const occupied = this.saveState.facilities.some((f) => f.gridX === gx && f.gridY === gy)
        const x = PEN_X + gx * TILE_SIZE
        const y = PEN_Y + gy * TILE_SIZE
        this.buildHighlight.fillStyle(occupied ? 0xef5350 : 0xffee58, 0.35)
        this.buildHighlight.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4)
      }
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    soundManager.unlock()
    if (!this.buildMode) return

    const relX = pointer.worldX - PEN_X
    const relY = pointer.worldY - PEN_Y
    const gridX = Math.floor(relX / TILE_SIZE)
    const gridY = Math.floor(relY / TILE_SIZE)

    const inBounds = gridX >= 0 && gridX < PEN_COLS && gridY >= 0 && gridY < PEN_ROWS
    if (!inBounds) {
      eventBus.emit('build-result', { success: false, message: '柵の中をタップしてください' })
      return
    }

    const occupied = this.saveState.facilities.some((f) => f.gridX === gridX && f.gridY === gridY)
    if (occupied) {
      eventBus.emit('build-result', { success: false, message: 'すでに何か置かれています' })
      return
    }

    const cost = FACILITIES.feeder.cost
    if (this.saveState.money < cost) {
      eventBus.emit('build-result', { success: false, message: '資金が足りません' })
      return
    }

    this.saveState.money -= cost
    const facility: FacilityData = { id: `feeder-${Date.now()}`, type: 'feeder', gridX, gridY }
    this.saveState.facilities.push(facility)
    const sprite = this.addFeederSprite(facility)
    this.playBuildFeedback(sprite)

    this.buildMode = false
    this.drawBuildHighlight()
    this.emitState()
    this.persist()
    eventBus.emit('build-result', { success: true, message: '木の餌場を設置しました' })
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
    let [min, max] = VISITOR_BASE_INTERVAL_MS
    let multiplier = 1
    if (this.saveState.timeOfDay === 'night') multiplier *= NIGHT_INTERVAL_MULTIPLIER
    if (this.saveState.weather === 'rainy') multiplier *= RAIN_INTERVAL_MULTIPLIER
    return Phaser.Math.Between(min, max) * multiplier
  }

  private spawnVisitor() {
    const types: VisitorType[] = ['boy', 'girl', 'office']
    const type = types[Phaser.Math.Between(0, types.length - 1)]
    const fromLeft = Math.random() < 0.5
    const exitLeft = Math.random() < 0.5

    const spawn = new Phaser.Math.Vector2(fromLeft ? -20 : GAME_WIDTH + 20, ENTRY_Y)
    const viewpoint = new Phaser.Math.Vector2(
      Phaser.Math.Between(PEN_X + 10, PEN_X + PEN_WIDTH - 10),
      ENTRY_Y,
    )
    const exit = new Phaser.Math.Vector2(exitLeft ? -20 : GAME_WIDTH + 20, ENTRY_Y)

    const visitor = new Visitor(this, spawn, viewpoint, exit, type, {
      onMoneyEarned: (amount, x, y) => {
        this.saveState.money += amount
        soundManager.playCoin()
        this.showMoneyPopup(x, y, amount)
        this.emitState()
        this.persist()
      },
      onInfo: (message) => eventBus.emit('info', message),
      onDespawn: (v) => {
        this.visitors = this.visitors.filter((existing) => existing !== v)
        v.destroy()
      },
    })
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
      if (wasNight) this.saveState.day += 1
      this.applyTimeOfDayVisuals()
      this.emitState()
      this.persist()
      if (!wasNight) {
        eventBus.emit('info', '保護区に静かな夜が来ました')
      }
    }
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
    for (const f of this.feederSprites) {
      const d = Phaser.Math.Distance.Between(this.dino.x, this.dino.y, f.sprite.x, f.sprite.y)
      if (d < min) min = d
    }
    return min
  }

  private updateIdleInfo(delta: number) {
    this.idleInfoTimer += delta
    if (this.idleInfoTimer < 6000) return
    this.idleInfoTimer = 0

    if (this.dino.state === 'sleeping') {
      eventBus.emit('info', 'モコがすやすや眠っています')
      return
    }

    if (this.dino.state === 'happy') {
      eventBus.emit('info', Phaser.Utils.Array.GetRandom(['モコが嬉しそうです', 'モコは気持ちよさそうです']))
      return
    }

    const isRain = this.saveState.weather === 'rainy'
    const pool = ['モコがぽてぽて歩いています', '小さな保護区に平和な時間が流れています']
    if (this.nearestFeederDistanceFromDino() < 60) pool.push('モコが餌場に近づいています')
    if (this.visitors.length > 0) pool.push('来園者が少しずつ増えてきました')
    if (isRain) pool.push('雨の匂いがします', '雨が草木を潤しています')

    eventBus.emit('info', Phaser.Utils.Array.GetRandom(pool))
  }

  private emitState() {
    eventBus.emit('state-update', {
      money: this.saveState.money,
      day: this.saveState.day,
      timeOfDay: this.saveState.timeOfDay,
      weather: this.saveState.weather,
      soundOn: this.saveState.soundOn,
      gameSpeed: this.saveState.gameSpeed,
    })
  }

  private persist() {
    SaveManager.save({
      ...this.saveState,
      dinosaur: { x: this.dino.x, y: this.dino.y },
    })
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

    this.feederSprites.forEach((f) => f.sprite.destroy())
    this.feederSprites = []
    this.createFeedersFromState()

    this.dino.destroy()
    this.createDino()

    this.buildMode = false
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

    this.dino.update(scaledDelta, {
      timeOfDay: this.saveState.timeOfDay,
      feederPositions: this.feederWorldPositions(),
    })
    this.visitors.forEach((v) => v.update(scaledDelta))

    this.autosaveTimer += delta
    if (this.autosaveTimer >= AUTOSAVE_INTERVAL_MS) {
      this.autosaveTimer = 0
      this.persist()
    }
  }
}
