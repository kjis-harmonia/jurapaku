import type { FacilityType, GameSpeed, TimeOfDay, Weather } from '../game/types'
import { BuildMenu } from './BuildMenu'

interface UIPanelProps {
  money: number
  reputation: number
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
  return (
    <div className="ui-panel">
      <div className="ui-header">
        <h1 className="ui-title">ジュラパク！</h1>
        <div className="ui-stats">
          <span className="ui-stat-badge ui-stat-money">💰 ￥{money.toLocaleString()}</span>
          <span className="ui-stat-badge ui-stat-reputation" title={`評判 ${reputation}`}>
            ⭐ 評判：{reputation} <span aria-hidden="true">{'★'.repeat(Math.min(5, Math.floor(reputation / 10)))}</span>
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
        <BuildMenu money={money} onSelect={onSelectFacility} onClose={onCloseBuildMenu} />
      )}
    </div>
  )
}
