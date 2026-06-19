import Phaser from 'phaser'
import type { DinoState, DinosaurSaveData, SpeciesId } from '../types'
import { soundManager } from '../SoundManager'

export interface PenBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface DinosaurUpdateContext {
  timeOfDay: 'day' | 'night'
  feederPositions: Phaser.Math.Vector2[]
}

export interface DinosaurCallbacks {
  onStomp?: (dinosaur: Dinosaur) => void
}

const WALK_SPEED = 22 // px/sec
const FEEDER_HAPPY_RADIUS = 36
const SLEEP_CHANCE_PER_SEC_NIGHT = 0.12
const WAKE_CHANCE_PER_SEC = 0.05
const HAPPY_CHANCE_PER_SEC_NEAR_FEEDER = 0.08
const HAPPY_DURATION_MS = 2200
const SLEEP_MIN_DURATION_MS = 4000
const BOB_AMPLITUDE = 2.4
const BOB_SPEED = 9 // radians/sec while walking
const TRICERATOPS_STOMP_CHANCE_PER_SEC = 0.025
const STOMP_DURATION_MS = 1200

function textureForSpecies(speciesId: SpeciesId): string {
  if (speciesId === 'triceratops') return 'tex_dino_triceratops'
  if (speciesId === 'starhorn') return 'tex_dino_starhorn'
  return 'tex_dino'
}

/**
 * Placeholder body is a generated texture; swap `tex_dino` for a real
 * spritesheet later without touching this state machine. `baseX`/`baseY`
 * hold the authoritative position used for AI/distance math - `x`/`y`
 * additionally carry a small bob offset for the walking wiggle, so saves
 * and feeder-distance checks never drift from the bob animation.
 */
export class Dinosaur extends Phaser.GameObjects.Sprite {
  state: DinoState = 'walking'
  readonly id: string
  readonly speciesId: SpeciesId
  readonly generation: number
  name_: string
  protectionYears: number
  popularity: number
  private bounds: PenBounds
  private walkTarget: Phaser.Math.Vector2 | null = null
  private forcedStateTimer = 0
  private baseX: number
  private baseY: number
  private bobPhase = 0
  private zzzTimer = 0
  private callbacks: DinosaurCallbacks

  constructor(scene: Phaser.Scene, data: DinosaurSaveData, bounds: PenBounds, callbacks: DinosaurCallbacks = {}) {
    super(scene, data.x, data.y, textureForSpecies(data.speciesId))
    this.id = data.id
    this.name_ = data.name
    this.speciesId = data.speciesId
    this.generation = data.generation
    this.protectionYears = data.protectionYears
    this.popularity = data.popularity
    this.bounds = bounds
    this.baseX = data.x
    this.baseY = data.y
    this.callbacks = callbacks
    scene.add.existing(this)
    this.setOrigin(0.5, 0.78)
  }

  get logicalY() {
    return this.baseY
  }

  get logicalX() {
    return this.baseX
  }

  toSaveData(): DinosaurSaveData {
    return {
      id: this.id,
      name: this.name_,
      speciesId: this.speciesId,
      generation: this.generation,
      protectionYears: this.protectionYears,
      popularity: this.popularity,
      x: this.baseX,
      y: this.baseY,
    }
  }

  private pickWalkTarget() {
    const margin = 14
    const x = Phaser.Math.Between(this.bounds.x + margin, this.bounds.x + this.bounds.width - margin)
    const y = Phaser.Math.Between(this.bounds.y + margin, this.bounds.y + this.bounds.height - margin)
    this.walkTarget = new Phaser.Math.Vector2(x, y)
  }

  private nearestFeederDistance(feederPositions: Phaser.Math.Vector2[]): number {
    let min = Infinity
    for (const pos of feederPositions) {
      const d = Phaser.Math.Distance.Between(this.baseX, this.baseY, pos.x, pos.y)
      if (d < min) min = d
    }
    return min
  }

  private spawnHeart(delayMs = 0) {
    this.scene.time.delayedCall(delayMs, () => {
      const heart = this.scene.add.text(this.baseX + Phaser.Math.Between(-6, 6), this.baseY - 26, '♥', {
        fontSize: '18px',
        color: '#ff6b9d',
      })
      heart.setOrigin(0.5).setDepth(20).setScale(0.4)
      this.scene.tweens.add({
        targets: heart,
        scale: 1.1,
        duration: 220,
        ease: 'Back.easeOut',
      })
      this.scene.tweens.add({
        targets: heart,
        y: heart.y - 26,
        alpha: 0,
        duration: 1100,
        delay: 150,
        ease: 'Cubic.easeOut',
        onComplete: () => heart.destroy(),
      })
    })
  }

  private spawnZzz() {
    const zzz = this.scene.add.text(this.baseX + 14, this.baseY - 22, 'Zzz', {
      fontSize: '13px',
      color: '#5c6bc0',
      fontStyle: 'bold',
    })
    zzz.setOrigin(0.5).setDepth(20).setAlpha(0)
    this.scene.tweens.add({
      targets: zzz,
      alpha: 1,
      y: zzz.y - 10,
      duration: 600,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: zzz,
          alpha: 0,
          y: zzz.y - 8,
          duration: 900,
          delay: 600,
          onComplete: () => zzz.destroy(),
        })
      },
    })
  }

  private enterSleep() {
    this.state = 'sleeping'
    this.walkTarget = null
    this.forcedStateTimer = SLEEP_MIN_DURATION_MS
    this.zzzTimer = 0
    this.setTint(0x9aa3b2)
  }

  private enterHappy() {
    this.state = 'happy'
    this.walkTarget = null
    this.forcedStateTimer = HAPPY_DURATION_MS
    this.clearTint()
    soundManager.playHappy()
    this.spawnHeart(0)
    this.spawnHeart(450)
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.15,
      scaleY: 0.88,
      duration: 160,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    })
  }

  private enterStomp() {
    this.state = 'stomping'
    this.walkTarget = null
    this.forcedStateTimer = STOMP_DURATION_MS
    soundManager.playStomp()
    this.callbacks.onStomp?.(this)
    this.scene.cameras.main.shake(180, 0.004)
    for (let i = 0; i < 7; i++) {
      const dust = this.scene.add
        .circle(this.baseX + Phaser.Math.Between(-18, 18), this.baseY + 4, Phaser.Math.Between(2, 4), 0xc8b58b, 0.75)
        .setDepth(4)
      this.scene.tweens.add({
        targets: dust,
        x: dust.x + Phaser.Math.Between(-16, 16),
        y: dust.y - Phaser.Math.Between(8, 18),
        alpha: 0,
        scale: 1.8,
        duration: 650,
        onComplete: () => dust.destroy(),
      })
    }
    this.scene.tweens.add({
      targets: this,
      y: this.baseY + 4,
      scaleX: 1.06,
      scaleY: 0.92,
      duration: 130,
      yoyo: true,
      repeat: 2,
    })
  }

  private wake() {
    this.state = 'walking'
    this.clearTint()
  }

  update(deltaMs: number, ctx: DinosaurUpdateContext) {
    const dt = deltaMs / 1000

    if (this.state === 'sleeping') {
      this.zzzTimer -= deltaMs
      if (this.zzzTimer <= 0) {
        this.spawnZzz()
        this.zzzTimer = 1800
      }
      this.forcedStateTimer -= deltaMs
      if (this.forcedStateTimer <= 0 && (ctx.timeOfDay === 'day' || Math.random() < WAKE_CHANCE_PER_SEC * dt)) {
        this.wake()
      }
      this.x = this.baseX
      this.y = this.baseY
      return
    }

    if (this.state === 'happy' || this.state === 'stomping') {
      this.forcedStateTimer -= deltaMs
      if (this.forcedStateTimer <= 0) {
        this.state = 'walking'
      }
      this.x = this.baseX
      this.y = this.baseY
      return
    }

    // walking state
    if (ctx.timeOfDay === 'night' && Math.random() < SLEEP_CHANCE_PER_SEC_NIGHT * dt) {
      this.enterSleep()
      return
    }

    const distToFeeder = this.nearestFeederDistance(ctx.feederPositions)
    const happyRadius = this.speciesId === 'triceratops' ? 54 : FEEDER_HAPPY_RADIUS
    if (distToFeeder < happyRadius && Math.random() < HAPPY_CHANCE_PER_SEC_NEAR_FEEDER * dt) {
      this.enterHappy()
      return
    }

    if (this.speciesId === 'triceratops' && Math.random() < TRICERATOPS_STOMP_CHANCE_PER_SEC * dt) {
      this.enterStomp()
      return
    }

    if (!this.walkTarget) {
      this.pickWalkTarget()
    }

    const target = this.walkTarget!
    const dx = target.x - this.baseX
    const dy = target.y - this.baseY
    const dist = Math.hypot(dx, dy)

    if (dist < 3) {
      this.walkTarget = null
      this.x = this.baseX
      this.y = this.baseY
      return
    }

    const walkSpeed = this.speciesId === 'triceratops' ? 12 : WALK_SPEED
    const step = walkSpeed * dt
    this.baseX += (dx / dist) * step
    this.baseY += (dy / dist) * step

    this.bobPhase += BOB_SPEED * dt
    this.x = this.baseX
    const bobAmplitude = this.speciesId === 'triceratops' ? 1.2 : BOB_AMPLITUDE
    this.y = this.baseY - Math.abs(Math.sin(this.bobPhase)) * bobAmplitude

    if (Math.abs(dx) > 1) {
      this.setFlipX(dx < 0)
    }
  }
}
