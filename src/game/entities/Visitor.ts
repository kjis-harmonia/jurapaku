import Phaser from 'phaser'
import type { VisitorType } from '../types'
import { VISITOR_MONEY_RANGE } from '../constants'

export type VisitorPhase = 'arriving' | 'watching' | 'leaving'

const MOVE_SPEED = 38 // px/sec
const WATCH_DURATION_MS = [2000, 4000] as const
const IDLE_BOB_AMPLITUDE = 1.6
const IDLE_BOB_SPEED = 4 // radians/sec

export interface VisitorCallbacks {
  onMoneyEarned: (amount: number, x: number, y: number) => void
  onInfo: (message: string) => void
  onDespawn: (visitor: Visitor) => void
}

const TEXTURE_BY_TYPE: Record<VisitorType, string> = {
  boy: 'tex_visitor_boy',
  girl: 'tex_visitor_girl',
  office: 'tex_visitor_office',
}

const WATCH_MESSAGE_BY_TYPE: Record<VisitorType, string> = {
  boy: '近所の子供がモコを見ています',
  girl: '近所の子供がモコを見ています',
  office: '会社員が少し癒されています',
}

const WATCH_BUBBLE_BY_TYPE: Record<VisitorType, string> = {
  boy: '！',
  girl: '♪',
  office: '♪',
}

/** Placeholder body; swap the generated textures for pixel-art frames later. */
export class Visitor extends Phaser.GameObjects.Sprite {
  type: VisitorType
  phase: VisitorPhase = 'arriving'
  private viewpoint: Phaser.Math.Vector2
  private exitPoint: Phaser.Math.Vector2
  private watchTimer = 0
  private callbacks: VisitorCallbacks
  private baseX: number
  private baseY: number
  private idleBobPhase = 0

  constructor(
    scene: Phaser.Scene,
    spawn: Phaser.Math.Vector2,
    viewpoint: Phaser.Math.Vector2,
    exitPoint: Phaser.Math.Vector2,
    type: VisitorType,
    callbacks: VisitorCallbacks,
  ) {
    super(scene, spawn.x, spawn.y, TEXTURE_BY_TYPE[type])
    this.type = type
    this.viewpoint = viewpoint
    this.exitPoint = exitPoint
    this.callbacks = callbacks
    this.baseX = spawn.x
    this.baseY = spawn.y
    scene.add.existing(this)
    this.setOrigin(0.5, 0.8)
    this.setFlipX(spawn.x > viewpoint.x)
  }

  private moveToward(target: Phaser.Math.Vector2, dt: number): boolean {
    const dx = target.x - this.baseX
    const dy = target.y - this.baseY
    const dist = Math.hypot(dx, dy)
    if (dist < 3) return true
    const step = MOVE_SPEED * dt
    this.baseX += (dx / dist) * step
    this.baseY += (dy / dist) * step
    this.x = this.baseX
    this.y = this.baseY
    if (Math.abs(dx) > 1) this.setFlipX(dx < 0)
    return false
  }

  private spawnSpeechBubble() {
    const symbol = WATCH_BUBBLE_BY_TYPE[this.type]
    const bubble = this.scene.add.container(this.baseX, this.baseY - 30)
    const bg = this.scene.add.graphics()
    bg.fillStyle(0xffffff, 0.95)
    bg.lineStyle(2, 0x8d6e63, 1)
    bg.fillRoundedRect(-11, -11, 22, 22, 7)
    bg.strokeRoundedRect(-11, -11, 22, 22, 7)
    const label = this.scene.add
      .text(0, -1, symbol, { fontSize: '13px', color: '#5d4037', fontStyle: 'bold' })
      .setOrigin(0.5)
    bubble.add([bg, label])
    bubble.setDepth(21).setScale(0.3).setAlpha(0)

    this.scene.tweens.add({
      targets: bubble,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    })
    this.scene.tweens.add({
      targets: bubble,
      alpha: 0,
      y: bubble.y - 8,
      duration: 500,
      delay: 1100,
      onComplete: () => bubble.destroy(),
    })
  }

  update(deltaMs: number) {
    const dt = deltaMs / 1000

    if (this.phase === 'arriving') {
      if (this.moveToward(this.viewpoint, dt)) {
        this.phase = 'watching'
        this.watchTimer = Phaser.Math.Between(WATCH_DURATION_MS[0], WATCH_DURATION_MS[1])
        this.idleBobPhase = 0
        this.callbacks.onInfo(WATCH_MESSAGE_BY_TYPE[this.type])
        this.spawnSpeechBubble()
      }
      return
    }

    if (this.phase === 'watching') {
      this.idleBobPhase += IDLE_BOB_SPEED * dt
      this.y = this.baseY - Math.abs(Math.sin(this.idleBobPhase)) * IDLE_BOB_AMPLITUDE
      this.watchTimer -= deltaMs
      if (this.watchTimer <= 0) {
        const amount = Math.round(Phaser.Math.Between(VISITOR_MONEY_RANGE[0], VISITOR_MONEY_RANGE[1]) / 10) * 10
        this.callbacks.onMoneyEarned(amount, this.baseX, this.baseY)
        this.phase = 'leaving'
        this.y = this.baseY
      }
      return
    }

    // leaving
    if (this.moveToward(this.exitPoint, dt)) {
      this.callbacks.onDespawn(this)
    }
  }
}
