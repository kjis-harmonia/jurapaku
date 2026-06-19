import { FACILITIES } from '../game/constants'
import type { FacilityType } from '../game/types'

interface BuildMenuProps {
  money: number
  onSelect: (type: FacilityType) => void
  onClose: () => void
}

const FACILITY_ICONS: Record<FacilityType, string> = {
  feeder: '🌿',
  shop: '🍪',
  toilet: '🚻',
}

export function BuildMenu({ money, onSelect, onClose }: BuildMenuProps) {
  const facilities = Object.values(FACILITIES)

  return (
    <div className="build-menu-backdrop" onClick={onClose}>
      <div className="build-menu" onClick={(e) => e.stopPropagation()}>
        <div className="build-menu-header">
          <span>🔨 建築</span>
          <button type="button" className="build-menu-close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        <div className="build-menu-list">
          {facilities.map((facility) => (
            <button
              key={facility.type}
              type="button"
              className="build-menu-item"
              disabled={money < facility.cost}
              onClick={() => onSelect(facility.type)}
            >
              <span className="build-menu-item-name">
                {FACILITY_ICONS[facility.type]} {facility.displayName}
              </span>
              <span className="build-menu-item-cost">￥{facility.cost.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
