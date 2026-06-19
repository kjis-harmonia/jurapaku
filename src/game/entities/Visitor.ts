import Phaser from 'phaser'
import type { SpeciesId, VisitorCatalogKind, VisitorType, Weather } from '../types'
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
  dinosaurName: string
  dinosaurId: string
  dinosaurSpeciesId: SpeciesId
  isDinosaurFan: boolean
  promenadeY: number
  visitorDisplayName: string | null
  specialKind: VisitorCatalogKind | null
  specialBubble: string | null
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
  onVisitStarted: (visitor: Visitor) => void
  onExit: (visitor: Visitor) => void
}

const TEXTURE_BY_TYPE: Record<VisitorType, string> = {
  boy: 'tex_visitor_boy',
  girl: 'tex_visitor_girl',
  office: 'tex_visitor_office',
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
  private route: Phaser.Math.Vector2[] = []

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
    if (context.specialKind === 'regular') this.setTint(0xfff59d)
    if (context.specialKind === 'rare') this.setTint(0xc5b3ff)
  }

  private moveToward(target: Phaser.Math.Vector2, dt: number): boolean {
    const dx = target.x - this.baseX
    const dy = target.y - this.baseY
    const dist = Math.hypot(dx, dy)
    if (dist < 3) return true
    const step = Math.min(MOVE_SPEED * dt, dist)
    this.baseX += (dx / dist) * step
    this.baseY += (dy / dist) * step
    this.idleBobPhase += IDLE_BOB_SPEED * dt
    this.x = this.baseX
    this.y = this.baseY - Math.abs(Math.sin(this.idleBobPhase)) * 1.2
    if (Math.abs(dx) > 1) this.setFlipX(dx < 0)
    return false
  }

  private beginFacilityTrip(phase: 'going-to-shop' | 'going-to-toilet', target: Phaser.Math.Vector2) {
    const promenadeY = this.context.promenadeY
    this.phase = phase
    this.route = [
      new Phaser.Math.Vector2(this.baseX, promenadeY),
      new Phaser.Math.Vector2(target.x, promenadeY),
      target.clone(),
    ].filter((point) => Phaser.Math.Distance.Between(this.baseX, this.baseY, point.x, point.y) >= 3)
  }

  private beginLeaving() {
    const promenadeY = this.context.promenadeY
    this.phase = 'leaving'
    this.route = [
      new Phaser.Math.Vector2(this.baseX, promenadeY),
      new Phaser.Math.Vector2(this.exitPoint.x, promenadeY),
    ].filter((point) => Phaser.Math.Distance.Between(this.baseX, this.baseY, point.x, point.y) >= 3)
  }

  private followRoute(dt: number): boolean {
    const target = this.route[0]
    if (!target) return true
    if (this.moveToward(target, dt)) {
      this.baseX = target.x
      this.baseY = target.y
      this.x = this.baseX
      this.y = this.baseY
      this.route.shift()
    }
    return this.route.length === 0
  }

  private spawnSpeechBubble() {
    const symbol = this.context.specialBubble ?? WATCH_BUBBLE_BY_TYPE[this.type]
    const bubble = this.scene.add.container(this.baseX, this.baseY - 30)
    const label = this.scene.add
      .text(0, -1, symbol, {
        fontSize: this.context.specialBubble ? '9px' : '13px',
        color: this.context.specialKind === 'rare' ? '#6a1b9a' : '#5d4037',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    const bubbleWidth = Math.max(22, label.width + 10)
    const bg = this.scene.add.graphics()
    bg.fillStyle(0xffffff, 0.95)
    bg.lineStyle(2, this.context.specialKind === 'rare' ? 0x9c6ade : 0x8d6e63, 1)
    bg.fillRoundedRect(-bubbleWidth / 2, -11, bubbleWidth, 22, 7)
    bg.strokeRoundedRect(-bubbleWidth / 2, -11, bubbleWidth, 22, 7)
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
    const positive = delta > 0
    const color = positive ? '#256b35' : '#a83232'
    const borderColor = positive ? 0x6fbf73 : 0xe57373
    const icon = positive ? '♥' : '！'
    const value = this.scene.add
      .text(0, 0, `${icon} ${sign}${delta} ${label}`, {
        fontSize: '13px',
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    const width = value.width + 18
    const height = 24
    const bg = this.scene.add.graphics()
    bg.fillStyle(0xffffff, 0.97)
    bg.lineStyle(2, borderColor, 1)
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8)
    const popup = this.scene.add
      .container(this.baseX, this.baseY - 34, [bg, value])
      .setDepth(24)
      .setScale(0.55)
      .setAlpha(0)
    this.scene.tweens.add({
      targets: popup,
      alpha: 1,
      scale: 1,
      y: popup.y - 10,
      duration: 240,
      ease: 'Back.easeOut',
    })
    this.scene.tweens.add({
      targets: popup,
      alpha: 0,
      y: popup.y - 26,
      duration: 650,
      delay: 1050,
      ease: 'Cubic.easeIn',
      onComplete: () => popup.destroy(),
    })
  }

  private finishWatching() {
    let gain = Phaser.Math.Between(10, 30)
    if (this.type === 'boy') gain += 5
    if (this.context.feederNearby) gain += this.type === 'girl' ? 10 : 5
    if (this.context.toiletPosition) gain += this.type === 'office' ? 5 : 3
    if (this.context.dinosaurSpeciesId === 'triceratops') {
      gain += 20
      if (this.type === 'boy') gain += 10
      if (this.context.isDinosaurFan) gain += 12
    }

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

    const maxShopChance = this.context.dinosaurSpeciesId === 'triceratops' ? 0.95 : 0.85
    const shopChance = Math.min(maxShopChance, 0.2 + this.satisfaction / 100 + (this.type === 'girl' ? 0.12 : 0))
    this.wantsShop = this.context.shopPosition !== null && Math.random() < shopChance
    this.wantsToilet = this.context.toiletPosition !== null && (this.type === 'office' || Math.random() < 0.35)
    this.advanceAfterStop()
  }

  private advanceAfterStop() {
    this.y = this.baseY
    if (this.wantsShop && this.context.shopPosition) {
      this.wantsShop = false
      this.beginFacilityTrip('going-to-shop', this.context.shopPosition)
    } else if (this.wantsToilet && this.context.toiletPosition) {
      this.wantsToilet = false
      this.beginFacilityTrip('going-to-toilet', this.context.toiletPosition)
    } else {
      this.beginLeaving()
    }
  }

  private completePurchase() {
    const satisfactionRatio = Phaser.Math.Clamp(this.satisfaction / 60, 0, 1)
    const maxPurchase = this.context.dinosaurSpeciesId === 'triceratops' ? 400 : 300
    const amount = Math.round((100 + satisfactionRatio * (maxPurchase - 100)) / 10) * 10
    this.satisfaction += 3
    this.showSatisfactionPopup(3)
    this.callbacks.onPurchase(amount, this.baseX, this.baseY)
  }

  reactToStomp(dinosaurId: string): boolean {
    if (this.context.dinosaurId !== dinosaurId || this.phase !== 'watching') return false
    const gain = this.context.isDinosaurFan ? 14 : this.type === 'boy' ? 11 : 7
    this.satisfaction += gain
    this.showSatisfactionPopup(gain, '大迫力！')
    this.callbacks.onInfo(`${this.context.visitorDisplayName ?? '来園者'}が踏み鳴らしに大興奮しています`)
    return true
  }

  update(deltaMs: number) {
    const dt = deltaMs / 1000

    if (this.phase === 'arriving') {
      if (this.moveToward(this.viewpoint, dt)) {
        this.phase = 'watching'
        this.phaseTimer = Phaser.Math.Between(WATCH_DURATION_MS[0], WATCH_DURATION_MS[1])
        this.idleBobPhase = 0
        const subject = this.context.visitorDisplayName ?? (this.type === 'office' ? '会社員' : '子供たち')
        const message = `${subject}が${this.context.dinosaurName}を見て喜んでいます`
        this.callbacks.onInfo(message)
        this.callbacks.onVisitStarted(this)
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
      if (this.followRoute(dt)) {
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
      if (this.followRoute(dt)) {
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

    if (this.followRoute(dt)) this.callbacks.onExit(this)
  }
}
