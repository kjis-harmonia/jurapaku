import Phaser from 'phaser'

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
}

export interface BuildResultPayload {
  success: boolean
  message: string
}
