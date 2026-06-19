import { useEffect, useState } from 'react'
import { PhaserGame } from './PhaserGame'
import { UIPanel } from './UIPanel'
import {
  eventBus,
  type BuildResultPayload,
  type UiStatePayload,
} from '../game/EventBus'
import { createDefaultSaveState } from '../game/constants'
import { soundManager } from '../game/SoundManager'
import type {
  ContestSaveData,
  DinosaurSaveData,
  FacilityType,
  GameSpeed,
  LegendData,
  SpeciesId,
  VisitorCatalogEntry,
} from '../game/types'

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
  const [reputationPulse, setReputationPulse] = useState(0)
  const [dinosaurs, setDinosaurs] = useState<DinosaurSaveData[]>(defaults.dinosaurs)
  const [legends, setLegends] = useState<LegendData[]>(defaults.legends)
  const [eggRemainingMs, setEggRemainingMs] = useState<number | null>(defaults.egg?.remainingMs ?? null)
  const [visitorCatalog, setVisitorCatalog] = useState<VisitorCatalogEntry[]>(defaults.visitorCatalog)
  const [contest, setContest] = useState<ContestSaveData>(defaults.contest)
  const [unlockedSpecies, setUnlockedSpecies] = useState<SpeciesId[]>(defaults.unlockedSpecies)
  const [rareEggs, setRareEggs] = useState(defaults.rareEggs)

  useEffect(() => {
    const onState = (payload: UiStatePayload) => {
      setMoney(payload.money)
      setReputation(payload.reputation)
      setDay(payload.day)
      setTimeOfDay(payload.timeOfDay)
      setWeather(payload.weather)
      setSoundOn(payload.soundOn)
      setGameSpeed(payload.gameSpeed)
      setDinosaurs(payload.dinosaurs)
      setLegends(payload.legends)
      setEggRemainingMs(payload.eggRemainingMs)
      setVisitorCatalog(payload.visitorCatalog)
      setContest(payload.contest)
      setUnlockedSpecies(payload.unlockedSpecies)
      setRareEggs(payload.rareEggs)
    }
    const onInfo = (message: string) => setInfo(message)
    const onBuildResult = (result: BuildResultPayload) => {
      setInfo(result.message)
      if (result.success) setBuildModeActive(false)
    }
    const onReputationGained = () => {
      setReputationPulse((pulse) => pulse + 1)
    }

    eventBus.on('state-update', onState)
    eventBus.on('info', onInfo)
    eventBus.on('build-result', onBuildResult)
    eventBus.on('reputation-gained', onReputationGained)

    return () => {
      eventBus.off('state-update', onState)
      eventBus.off('info', onInfo)
      eventBus.off('build-result', onBuildResult)
      eventBus.off('reputation-gained', onReputationGained)
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
        reputationPulse={reputationPulse}
        dinosaurs={dinosaurs}
        legends={legends}
        eggRemainingMs={eggRemainingMs}
        visitorCatalog={visitorCatalog}
        contest={contest}
        unlockedSpecies={unlockedSpecies}
        rareEggs={rareEggs}
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
