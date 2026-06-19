import { useState } from 'react'
import type {
  ContestSaveData,
  DinosaurSaveData,
  FacilityData,
  FacilityType,
  GameSpeed,
  LegendData,
  SpeciesId,
  TimeOfDay,
  VisitorCatalogEntry,
  Weather,
} from '../game/types'
import {
  TRICERATOPS_UNLOCK_CONTEST_WINS,
  TRICERATOPS_UNLOCK_REPUTATION,
  formatGeneration,
  protectionYearsForSpecies,
  speciesDisplayName,
} from '../game/constants'
import { BuildMenu } from './BuildMenu'

interface UIPanelProps {
  money: number
  reputation: number
  reputationPulse: number
  dinosaurs: DinosaurSaveData[]
  legends: LegendData[]
  eggRemainingMs: number | null
  visitorCatalog: VisitorCatalogEntry[]
  contest: ContestSaveData
  unlockedSpecies: SpeciesId[]
  rareEggs: number
  triceratopsEggs: number
  facilities: FacilityData[]
  day: number
  timeOfDay: TimeOfDay
  weather: Weather
  soundOn: boolean
  gameSpeed: GameSpeed
  info: string
  buildMenuOpen: boolean
  buildModeActive: boolean
  onToggleBuildMenu: () => void
  onSelectFacility: (type: FacilityType) => void
  onCloseBuildMenu: () => void
  onCancelBuildMode: () => void
  onReset: () => void
  onToggleSound: () => void
  onChangeSpeed: (speed: GameSpeed) => void
}

const TIME_LABEL: Record<TimeOfDay, string> = { day: '昼', night: '夜' }
const WEATHER_LABEL: Record<Weather, string> = { sunny: '晴れ', rainy: '雨' }
const TIME_ICON: Record<TimeOfDay, string> = { day: '☀️', night: '🌙' }
const WEATHER_ICON: Record<Weather, string> = { sunny: '🌤️', rainy: '☔' }
const SPEEDS: GameSpeed[] = [1, 2, 3]

export function UIPanel({
  money,
  reputation,
  reputationPulse,
  dinosaurs,
  legends,
  eggRemainingMs,
  visitorCatalog,
  contest,
  unlockedSpecies,
  rareEggs,
  triceratopsEggs,
  facilities,
  day,
  timeOfDay,
  weather,
  soundOn,
  gameSpeed,
  info,
  buildMenuOpen,
  buildModeActive,
  onToggleBuildMenu,
  onSelectFacility,
  onCloseBuildMenu,
  onCancelBuildMode,
  onReset,
  onToggleSound,
  onChangeSpeed,
}: UIPanelProps) {
  const filledStars = reputation === 0 ? 0 : Math.min(5, Math.ceil(reputation / 10))
  const [catalogOpen, setCatalogOpen] = useState(false)

  return (
    <div className="ui-panel">
      <div className="ui-header">
        <h1 className="ui-title">ジュラパク！</h1>
        <div className="ui-stats">
          <span className="ui-stat-badge ui-stat-money">💰 ￥{money.toLocaleString()}</span>
          <span
            key={`reputation-${reputationPulse}`}
            className={`ui-stat-badge ui-stat-reputation${reputationPulse > 0 ? ' ui-stat-reputation-gained' : ''}`}
            aria-label={`評判 ${reputation}、星5個中${filledStars}個`}
          >
            <span>評判 {reputation}</span>
            <span className="ui-reputation-stars" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((index) => (
                <span
                  key={index}
                  className={index < filledStars ? 'ui-reputation-star-filled' : 'ui-reputation-star-empty'}
                  style={{ animationDelay: `${index * 55}ms` }}
                >
                  {index < filledStars ? '★' : '☆'}
                </span>
              ))}
            </span>
          </span>
          <span className="ui-stat-badge">📅 {day}日目</span>
          <span className="ui-stat-badge">
            {TIME_ICON[timeOfDay]} {TIME_LABEL[timeOfDay]}
          </span>
          <span className="ui-stat-badge">
            {WEATHER_ICON[weather]} {WEATHER_LABEL[weather]}
          </span>
        </div>
      </div>

      <div className="ui-toolbar">
        <div className="ui-speed-group" role="group" aria-label="ゲーム速度">
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={`ui-speed-button${gameSpeed === speed ? ' ui-speed-button-active' : ''}`}
              onClick={() => onChangeSpeed(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
        <button type="button" className="ui-sound-button" onClick={onToggleSound}>
          {soundOn ? '🔊 SOUND ON' : '🔇 SOUND OFF'}
        </button>
      </div>

      <div className="ui-generation-panel" aria-label="保護中の恐竜とレジェンド">
        <div className="ui-dinosaur-roster">
          {dinosaurs.map((dinosaur) => (
            <span key={dinosaur.id} className="ui-dinosaur-entry">
              <strong>{dinosaur.name}</strong>
              <span>{speciesDisplayName(dinosaur.speciesId)}</span>
              <span>{formatGeneration(dinosaur.generation)}</span>
              <span>{dinosaur.protectionYears}/{protectionYearsForSpecies(dinosaur.speciesId)}年</span>
              <span>人気 {dinosaur.popularity}</span>
            </span>
          ))}
          {eggRemainingMs !== null && (
            <span className="ui-egg-status">🥚 孵化まで {Math.max(0, Math.ceil(eggRemainingMs / 1000))}秒</span>
          )}
        </div>
        {legends.length > 0 && (
          <div className="ui-legends">
            <span className="ui-legends-title">🏆 レジェンド {legends.length}</span>
            {legends.slice(-2).reverse().map((legend) => (
              <span key={legend.id}>
                {legend.name}・{formatGeneration(legend.generation)}・人気 {legend.popularity}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="ui-phase4-status">
        <span className="ui-contest-status">
          🏆 次回大会 {Math.max(0, contest.nextContestDay - day)}日後
          {contest.lastRank !== null && `・前回${contest.lastRank}位`}
        </span>
        {unlockedSpecies.includes('starhorn') && (
          <span className="ui-rare-unlock">✦ {speciesDisplayName('starhorn')}解放 {rareEggs > 0 ? `・卵${rareEggs}個` : ''}</span>
        )}
        {unlockedSpecies.includes('triceratops') ? (
          <span className="ui-triceratops-unlock">▲ トリケラ解放 {triceratopsEggs > 0 ? `・卵${triceratopsEggs}個` : ''}</span>
        ) : (
          <span className="ui-triceratops-progress">
            ▲ トリケラ 評判{Math.min(reputation, TRICERATOPS_UNLOCK_REPUTATION)}/{TRICERATOPS_UNLOCK_REPUTATION}
            ・大会{Math.min(contest.wins, TRICERATOPS_UNLOCK_CONTEST_WINS)}/{TRICERATOPS_UNLOCK_CONTEST_WINS}勝
          </span>
        )}
        <button type="button" className="ui-catalog-button" onClick={() => setCatalogOpen(true)}>
          📖 来園者図鑑 {visitorCatalog.length}/8
        </button>
      </div>

      <div className="ui-info-bar">
        <span className="ui-info-icon">🦕</span>
        {info}
      </div>

      <div className="ui-actions">
        {buildModeActive ? (
          <button type="button" className="ui-button ui-button-cancel" onClick={onCancelBuildMode}>
            ✕ 設置をやめる
          </button>
        ) : (
          <button type="button" className="ui-button" onClick={onToggleBuildMenu}>
            🔨 建築
          </button>
        )}
        <button type="button" className="ui-button ui-button-secondary" onClick={onReset}>
          ↺ セーブリセット
        </button>
      </div>

      {buildMenuOpen && (
        <BuildMenu
          money={money}
          builtFacilityTypes={facilities.map((facility) => facility.type)}
          unlockedSpecies={unlockedSpecies}
          onSelect={onSelectFacility}
          onClose={onCloseBuildMenu}
        />
      )}

      {catalogOpen && (
        <div className="catalog-backdrop" onClick={() => setCatalogOpen(false)}>
          <div className="catalog-modal" onClick={(event) => event.stopPropagation()}>
            <div className="catalog-header">
              <div>
                <strong>来園者図鑑</strong>
                <span> 出会い {visitorCatalog.length}/8</span>
              </div>
              <button type="button" className="build-menu-close" onClick={() => setCatalogOpen(false)} aria-label="閉じる">
                ×
              </button>
            </div>
            <div className="catalog-list">
              {visitorCatalog.length === 0 && <p className="catalog-empty">まだ特別な来園者とは出会っていません</p>}
              {[...visitorCatalog]
                .sort((a, b) => b.visits - a.visits)
                .map((visitor) => (
                  <div key={visitor.id} className={`catalog-entry catalog-entry-${visitor.kind}`}>
                    <span className="catalog-entry-mark">{visitor.kind === 'rare' ? '✦' : '●'}</span>
                    <div className="catalog-entry-main">
                      <strong>{visitor.displayName}</strong>
                      <span>{visitor.kind === 'rare' ? 'レア来園者' : `常連 Lv.${visitor.level}`}</span>
                    </div>
                    <div className="catalog-entry-stats">
                      <span>初来園 {visitor.firstVisitDay}日目</span>
                      <span>来園 {visitor.visits}回</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
