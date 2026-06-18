import { FACILITIES } from '../game/constants'

interface BuildMenuProps {
  money: number
  onSelectFeeder: () => void
  onClose: () => void
}

export function BuildMenu({ money, onSelectFeeder, onClose }: BuildMenuProps) {
  const feeder = FACILITIES.feeder
  const affordable = money >= feeder.cost

  return (
    <div className="build-menu-backdrop" onClick={onClose}>
      <div className="build-menu" onClick={(e) => e.stopPropagation()}>
        <div className="build-menu-header">
          <span>🔨 建築</span>
          <button type="button" className="build-menu-close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        <button
          type="button"
          className="build-menu-item"
          disabled={!affordable}
          onClick={onSelectFeeder}
        >
          <span className="build-menu-item-name">🌿 {feeder.displayName}</span>
          <span className="build-menu-item-cost">￥{feeder.cost.toLocaleString()}</span>
        </button>
      </div>
    </div>
  )
}
