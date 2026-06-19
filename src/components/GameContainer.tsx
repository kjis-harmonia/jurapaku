import { useEffect, useState } from 'react'
import { PhaserGame } from './PhaserGame'
import { UIPanel } from './UIPanel'
import { eventBus, type BuildResultPayload, type UiStatePayload } from '../game/EventBus'
import { createDefaultSaveState } from '../game/constants'
import { soundManager } from '../game/SoundManager'
import type { FacilityType, GameSpeed } from '../game/types'

const defaults = createDefaultSaveState()

export function GameContainer() {
  const [money, setMoney] = useState(defaults.money)
  const [reputation, setReputation] = useState(defaults.reputation)
  const [day, setDay] = useState(defaults.day)
  const [timeOfDay, setTimeOfDay] = useState(defaults.timeOfDay)
  const [weather, setWeather] = useState(defaults.weather)
  const [soundOn, setSoundOn] = useState(defaults.soundOn)
  const [gameSpeed, setGameSpeed] = useState<GameSpeed>(defaults.gameSpeed)
  const [info, setInfo] = useState('モコがぽてぽて歩いています')
  const [buildMenuOpen, setBuildMenuOpen] = useState(false)
  const [buildModeActive, setBuildModeActive] = useState(false)

  useEffect(() => {
    const onState = (payload: UiStatePayload) => {
      setMoney(payload.money)
      setReputation(payload.reputation)
      setDay(payload.day)
      setTimeOfDay(payload.timeOfDay)
      setWeather(payload.weather)
      setSoundOn(payload.soundOn)
      setGameSpeed(payload.gameSpeed)
    }
    const onInfo = (message: string) => setInfo(message)
    const onBuildResult = (result: BuildResultPayload) => {
      setInfo(result.message)
      if (result.success) setBuildModeActive(false)
    }

    eventBus.on('state-update', onState)
    eventBus.on('info', onInfo)
    eventBus.on('build-result', onBuildResult)

    return () => {
      eventBus.off('state-update', onState)
      eventBus.off('info', onInfo)
      eventBus.off('build-result', onBuildResult)
    }
  }, [])

  const handleToggleBuildMenu = () => {
    soundManager.unlock()
    soundManager.playUiTap()
    setBuildMenuOpen((open) => !open)
  }
  const handleCloseBuildMenu = () => setBuildMenuOpen(false)

  const handleSelectFacility = (type: FacilityType) => {
    soundManager.playUiTap()
    setBuildMenuOpen(false)
    setBuildModeActive(true)
    eventBus.emit('set-build-mode', type)
  }

  const handleCancelBuildMode = () => {
    setBuildModeActive(false)
    eventBus.emit('set-build-mode', null)
    setInfo('設置をやめました')
  }

  const handleReset = () => {
    if (!window.confirm('セーブデータをリセットして最初からやり直しますか？')) return
    eventBus.emit('reset-game')
  }

  const handleToggleSound = () => {
    soundManager.unlock()
    const next = !soundOn
    soundManager.setEnabled(next)
    eventBus.emit('set-sound', next)
    if (next) soundManager.playUiTap()
  }

  const handleChangeSpeed = (speed: GameSpeed) => {
    soundManager.playUiTap()
    eventBus.emit('set-speed', speed)
  }

  return (
    <div className="game-container">
      <div className="game-canvas-area">
        <PhaserGame />
      </div>
      <UIPanel
        money={money}
        reputation={reputation}
        day={day}
        timeOfDay={timeOfDay}
        weather={weather}
        soundOn={soundOn}
        gameSpeed={gameSpeed}
        info={info}
        buildMenuOpen={buildMenuOpen}
        buildModeActive={buildModeActive}
        onToggleBuildMenu={handleToggleBuildMenu}
        onSelectFacility={handleSelectFacility}
        onCloseBuildMenu={handleCloseBuildMenu}
        onCancelBuildMode={handleCancelBuildMode}
        onReset={handleReset}
        onToggleSound={handleToggleSound}
        onChangeSpeed={handleChangeSpeed}
      />
    </div>
  )
}
