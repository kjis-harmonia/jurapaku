import Phaser from 'phaser'
import type { VisitorType, Weather } from '../types'
import { VISITOR_MONEY_RANGE } from '../constants'

export type VisitorPhase =
  | 'arriving'
  | 'watching'
  | 'going-to-shop'
  | 'shopping'
  | 'going-to-toilet'
  | 'resting'
  | 'leaving'

const MOVE_SPEED = 38
const WATCH_DURATION_MS = [2000, 4000] as const
const FACILITY_STOP_MS = 1200
const IDLE_BOB_AMPLITUDE = 1.6
const IDLE_BOB_SPEED = 4

export interface VisitorContext {
  feederNearby: boolean
  crowdPenalty: number
  shopPosition: Phaser.Math.Vector2 | null
  toiletPosition: Phaser.Math.Vector2 | null
  weather: Weather
}

export interface VisitorCallbacks {
  onMoneyEarned: (amount: number, x: number, y: number) => void
  onPurchase: (amount: number, x: number, y: number) => void
  onInfo: (message: string) => void
  onExit: (visitor: Visitor) => void
}

const TEXTURE_BY_TYPE: Record<VisitorType, string> = {
  boy: 'tex_visitor_boy',
  girl: 'tex_visitor_girl',
  office: 'tex_visitor_office',
}

const WATCH_MESSAGE_BY_TYPE: Record<VisitorType, string> = {
  boy: '子供たちがモコを見て喜んでいます',
  girl: '子供たちがモコを見て喜んでいます',
  office: '会社員がモコを見て癒されています',
}

const WATCH_BUBBLE_BY_TYPE: Record<VisitorType, string> = {
  boy: '！',
  girl: '♪',
  office: '♪',
}

export class Visitor extends Phaser.GameObjects.Sprite {
  readonly type: VisitorType
  readonly weather: Weather
  phase: VisitorPhase = 'arriving'
  satisfaction = 0

  private readonly viewpoint: Phaser.Math.Vector2
  private readonly exitPoint: Phaser.Math.Vector2
  private readonly context: VisitorContext
  private readonly callbacks: VisitorCallbacks
  private baseX: number
  private baseY: number
  private phaseTimer = 0
  private idleBobPhase = 0
  private wantsShop = false
  private wantsToilet = false

  constructor(
    scene: Phaser.Scene,
    spawn: Phaser.Math.Vector2,
    viewpoint: Phaser.Math.Vector2,
    exitPoint: Phaser.Math.Vector2,
    type: VisitorType,
    context: VisitorContext,
    callbacks: VisitorCallbacks,
  ) {
    super(scene, spawn.x, spawn.y, TEXTURE_BY_TYPE[type])
    this.type = type
    this.weather = context.weather
    this.viewpoint = viewpoint
    this.exitPoint = exitPoint
    this.context = context
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
    const step = Math.min(MOVE_SPEED * dt, dist)
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

    this.scene.tweens.add({ targets: bubble, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' })
    this.scene.tweens.add({
      targets: bubble,
      alpha: 0,
      y: bubble.y - 8,
      duration: 500,
      delay: 1100,
      onComplete: () => bubble.destroy(),
    })
  }

  private showSatisfactionPopup(delta: number, label = '満足') {
    if (delta === 0) return
    const sign = delta > 0 ? '+' : ''
    const color = delta > 0 ? '#2e7d32' : '#c62828'
    const text = this.scene.add
      .text(this.baseX, this.baseY - 30, `${sign}${delta} ${label}`, {
        fontSize: '12px',
        color,
        fontStyle: 'bold',
        backgroundColor: '#ffffffdd',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(22)
      .setAlpha(0)
    this.scene.tweens.add({ targets: text, alpha: 1, y: text.y - 8, duration: 220, ease: 'Cubic.easeOut' })
    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 22,
      duration: 700,
      delay: 850,
      onComplete: () => text.destroy(),
    })
  }

  private finishWatching() {
    let gain = Phaser.Math.Between(10, 30)
    if (this.type === 'boy') gain += 5
    if (this.context.feederNearby) gain += this.type === 'girl' ? 10 : 5
    if (this.context.toiletPosition) gain += this.type === 'office' ? 5 : 3

    this.satisfaction = gain
    this.showSatisfactionPopup(gain)
    if (this.context.crowdPenalty > 0) {
      this.satisfaction = Math.max(0, this.satisfaction - this.context.crowdPenalty)
      this.scene.time.delayedCall(650, () => {
        if (this.active) this.showSatisfactionPopup(-this.context.crowdPenalty, 'トイレ不足')
      })
    }

    const admission = Math.round(Phaser.Math.Between(VISITOR_MONEY_RANGE[0], VISITOR_MONEY_RANGE[1]) / 10) * 10
    this.callbacks.onMoneyEarned(admission, this.baseX, this.baseY)

    const shopChance = Math.min(0.85, 0.2 + this.satisfaction / 100 + (this.type === 'girl' ? 0.12 : 0))
    this.wantsShop = this.context.shopPosition !== null && Math.random() < shopChance
    this.wantsToilet = this.context.toiletPosition !== null && (this.type === 'office' || Math.random() < 0.35)
    this.advanceAfterStop()
  }

  private advanceAfterStop() {
    this.y = this.baseY
    if (this.wantsShop && this.context.shopPosition) {
      this.wantsShop = false
      this.phase = 'going-to-shop'
    } else if (this.wantsToilet && this.context.toiletPosition) {
      this.wantsToilet = false
      this.phase = 'going-to-toilet'
    } else {
      this.phase = 'leaving'
    }
  }

  private completePurchase() {
    const satisfactionRatio = Phaser.Math.Clamp(this.satisfaction / 45, 0, 1)
    const amount = Math.round((100 + satisfactionRatio * 200) / 10) * 10
    this.satisfaction += 3
    this.showSatisfactionPopup(3)
    this.callbacks.onPurchase(amount, this.baseX, this.baseY)
  }

  update(deltaMs: number) {
    const dt = deltaMs / 1000

    if (this.phase === 'arriving') {
      if (this.moveToward(this.viewpoint, dt)) {
        this.phase = 'watching'
        this.phaseTimer = Phaser.Math.Between(WATCH_DURATION_MS[0], WATCH_DURATION_MS[1])
        this.idleBobPhase = 0
        this.callbacks.onInfo(WATCH_MESSAGE_BY_TYPE[this.type])
        this.spawnSpeechBubble()
      }
      return
    }

    if (this.phase === 'watching') {
      this.idleBobPhase += IDLE_BOB_SPEED * dt
      this.y = this.baseY - Math.abs(Math.sin(this.idleBobPhase)) * IDLE_BOB_AMPLITUDE
      this.phaseTimer -= deltaMs
      if (this.phaseTimer <= 0) this.finishWatching()
      return
    }

    if (this.phase === 'going-to-shop' && this.context.shopPosition) {
      if (this.moveToward(this.context.shopPosition, dt)) {
        this.phase = 'shopping'
        this.phaseTimer = FACILITY_STOP_MS
        this.completePurchase()
      }
      return
    }

    if (this.phase === 'shopping') {
      this.phaseTimer -= deltaMs
      if (this.phaseTimer <= 0) this.advanceAfterStop()
      return
    }

    if (this.phase === 'going-to-toilet' && this.context.toiletPosition) {
      if (this.moveToward(this.context.toiletPosition, dt)) {
        this.phase = 'resting'
        this.phaseTimer = FACILITY_STOP_MS
        const recovery = this.type === 'office' ? 5 : 2
        this.satisfaction += recovery
        this.showSatisfactionPopup(recovery, '休憩')
        if (this.type === 'office') this.callbacks.onInfo('会社員が休憩トイレでひと息つきました')
      }
      return
    }

    if (this.phase === 'resting') {
      this.phaseTimer -= deltaMs
      if (this.phaseTimer <= 0) this.advanceAfterStop()
      return
    }

    if (this.moveToward(this.exitPoint, dt)) this.callbacks.onExit(this)
  }
}
