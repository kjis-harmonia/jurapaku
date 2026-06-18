import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from './constants'
import { MainScene } from './scenes/MainScene'

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#8bc34a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [MainScene],
  })
}
