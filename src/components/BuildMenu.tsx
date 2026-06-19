import { FACILITIES } from '../game/constants'
import type { FacilityType, SpeciesId } from '../game/types'

interface BuildMenuProps {
  money: number
  builtFacilityTypes: FacilityType[]
  unlockedSpecies: SpeciesId[]
  onSelect: (type: FacilityType) => void
  onClose: () => void
}

const FACILITY_ICONS: Record<FacilityType, string> = {
  feeder: '🌿',
  shop: '🍪',
  toilet: '🚻',
  hatchery: '🥚',
  'reinforced-pen': '🛡️',
  'large-feeder': '🌾',
}

export function BuildMenu({ money, builtFacilityTypes, unlockedSpecies, onSelect, onClose }: BuildMenuProps) {
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
            (() => {
              const triceratopsFacility = facility.type === 'reinforced-pen' || facility.type === 'large-feeder'
              const lockedBySpecies = triceratopsFacility && !unlockedSpecies.includes('triceratops')
              const needsPen = facility.type === 'large-feeder' && !builtFacilityTypes.includes('reinforced-pen')
              const singleBuild = facility.type === 'reinforced-pen' || facility.type === 'large-feeder'
              const alreadyBuilt = singleBuild && builtFacilityTypes.includes(facility.type)
              const locked = lockedBySpecies || needsPen || alreadyBuilt
              return (
                <button
                  key={facility.type}
                  type="button"
                  className="build-menu-item"
                  disabled={money < facility.cost || locked}
                  onClick={() => onSelect(facility.type)}
                >
                  <span className="build-menu-item-name">
                    {FACILITY_ICONS[facility.type]} {facility.displayName}
                  </span>
                  <span className="build-menu-item-cost">
                    {alreadyBuilt
                      ? '設置済'
                      : lockedBySpecies
                        ? '未解放'
                        : needsPen ? '強化柵が必要' : `￥${facility.cost.toLocaleString()}`}
                  </span>
                </button>
              )
            })()
          ))}
        </div>
      </div>
    </div>
  )
}
