// All sound is synthesized with Web Audio API - no audio files needed.
// Everything is routed through a single compressor so rapid, overlapping
// SFX (e.g. several coins in a row) stay pleasant instead of clipping.
class SoundManager {
  enabled = true

  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private rainNodes: { source: AudioBufferSourceNode; gain: GainNode } | null = null
  private nightActive = false
  private nightTimer: number | null = null

  private ensureContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -24
    compressor.knee.value = 24
    compressor.ratio.value = 4
    compressor.attack.value = 0.003
    compressor.release.value = 0.25
    compressor.connect(ctx.destination)

    const master = ctx.createGain()
    master.gain.value = 0.6
    master.connect(compressor)

    this.ctx = ctx
    this.master = master
  }

  /** Call from any direct user-gesture handler to unlock audio on first interaction. */
  unlock() {
    this.ensureContext()
  }

  setEnabled(on: boolean) {
    this.enabled = on
    if (!on) {
      this.stopRain()
      this.stopNightLoop()
    }
  }

  private tone(freqStart: number, freqEnd: number, duration: number, type: OscillatorType, peakGain: number, delay = 0) {
    if (!this.enabled) return
    this.ensureContext()
    const ctx = this.ctx!
    const master = this.master!
    const now = ctx.currentTime + delay

    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freqStart, now)
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), now + duration)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peakGain, now + duration * 0.15)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    osc.connect(gain)
    gain.connect(master)
    osc.start(now)
    osc.stop(now + duration + 0.02)
  }

  /** ピコーン + チャリン: a bright two-layer blip for a coin drop. */
  playCoin() {
    if (!this.enabled) return
    this.tone(1100, 1800, 0.09, 'sine', 0.22)
    this.tone(2000, 1600, 0.18, 'triangle', 0.14, 0.05)
  }

  /** A soft three-note sparkle for reputation gains. */
  playReputation() {
    if (!this.enabled) return
    this.tone(660, 720, 0.12, 'sine', 0.11)
    this.tone(880, 960, 0.14, 'sine', 0.1, 0.07)
    this.tone(1100, 1240, 0.16, 'triangle', 0.08, 0.14)
  }

  playHatch() {
    if (!this.enabled) return
    this.tone(420, 780, 0.22, 'sine', 0.14)
    this.tone(620, 1180, 0.28, 'triangle', 0.12, 0.12)
    this.tone(900, 1500, 0.32, 'sine', 0.1, 0.24)
  }

  playCelebration() {
    if (!this.enabled) return
    for (let i = 0; i < 4; i++) {
      this.tone(520 + i * 130, 650 + i * 150, 0.16, 'triangle', 0.1, i * 0.1)
    }
  }

  playStomp() {
    if (!this.enabled) return
    this.tone(95, 48, 0.28, 'sine', 0.2)
    this.tone(150, 70, 0.18, 'triangle', 0.12, 0.04)
  }

  /** Short neutral blip for menu/button taps. */
  playUiTap() {
    if (!this.enabled) return
    this.tone(700, 500, 0.06, 'square', 0.1)
  }

  /** "きゅぅ〜": soft pitch-down glide with a light vibrato, for Mocco's happy moments. */
  playHappy() {
    if (!this.enabled) return
    this.ensureContext()
    const ctx = this.ctx!
    const master = this.master!
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(720, now)
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.4)

    const vibrato = ctx.createOscillator()
    vibrato.frequency.value = 7
    const vibratoGain = ctx.createGain()
    vibratoGain.gain.value = 18
    vibrato.connect(vibratoGain)
    vibratoGain.connect(osc.frequency)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)

    osc.connect(gain)
    gain.connect(master)
    osc.start(now)
    vibrato.start(now)
    osc.stop(now + 0.45)
    vibrato.stop(now + 0.45)
  }

  /** Quiet filtered-noise loop, only while it's raining. */
  setRain(active: boolean) {
    if (!active || !this.enabled) {
      this.stopRain()
      return
    }
    if (this.rainNodes) return
    this.ensureContext()
    const ctx = this.ctx!
    const master = this.master!

    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 3000
    filter.Q.value = 0.6

    const gain = ctx.createGain()
    gain.gain.value = 0.045

    source.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    source.start()

    this.rainNodes = { source, gain }
  }

  private stopRain() {
    if (!this.rainNodes) return
    try {
      this.rainNodes.source.stop()
    } catch {
      // already stopped
    }
    this.rainNodes.source.disconnect()
    this.rainNodes.gain.disconnect()
    this.rainNodes = null
  }

  /** Crickets-at-night ambience: irregular soft chirps, no BGM. */
  setNight(active: boolean) {
    this.nightActive = active
    if (!active || !this.enabled) {
      this.stopNightLoop()
      return
    }
    if (this.nightTimer !== null) return
    this.scheduleCricket()
  }

  private scheduleCricket() {
    const delay = 250 + Math.random() * 500
    this.nightTimer = window.setTimeout(() => {
      if (this.nightActive && this.enabled) {
        this.playCricketChirp()
        this.scheduleCricket()
      } else {
        this.nightTimer = null
      }
    }, delay)
  }

  private playCricketChirp() {
    this.ensureContext()
    const ctx = this.ctx!
    const master = this.master!
    const now = ctx.currentTime
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.06
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 4200 + Math.random() * 300
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.045, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
      osc.connect(gain)
      gain.connect(master)
      osc.start(t)
      osc.stop(t + 0.06)
    }
  }

  private stopNightLoop() {
    if (this.nightTimer !== null) {
      window.clearTimeout(this.nightTimer)
      this.nightTimer = null
    }
  }
}

export const soundManager = new SoundManager()
