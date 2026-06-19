import type { VisitorCatalogKind, VisitorType } from './types'

export type VisitorEventType = 'research' | 'cheer' | 'photo' | 'stream' | 'sponsor' | 'famous' | 'television' | 'viral'

export interface SpecialVisitorProfile {
  id: string
  displayName: string
  kind: VisitorCatalogKind
  visitorType: VisitorType
  eventType: VisitorEventType
  bubble: string
}

export const REGULAR_VISITORS: SpecialVisitorProfile[] = [
  { id: 'regular-professor', displayName: '恐竜博士 ミドリ先生', kind: 'regular', visitorType: 'office', eventType: 'research', bubble: '研究中' },
  { id: 'regular-boy', displayName: '恐竜好き少年 ソラ', kind: 'regular', visitorType: 'boy', eventType: 'cheer', bubble: 'また来た！' },
  { id: 'regular-photographer', displayName: '写真家 ナナ', kind: 'regular', visitorType: 'girl', eventType: 'photo', bubble: '撮れた！' },
  { id: 'regular-streamer', displayName: '配信者 ハコ', kind: 'regular', visitorType: 'girl', eventType: 'stream', bubble: '配信中' },
  { id: 'regular-sponsor', displayName: 'スポンサー 森野さん', kind: 'regular', visitorType: 'office', eventType: 'sponsor', bubble: '応援します' },
]

export const RARE_VISITORS: SpecialVisitorProfile[] = [
  { id: 'rare-professor', displayName: '有名博士 ホシノ教授', kind: 'rare', visitorType: 'office', eventType: 'famous', bubble: '大発見！' },
  { id: 'rare-tv', displayName: 'テレビ取材チーム', kind: 'rare', visitorType: 'office', eventType: 'television', bubble: '生中継' },
  { id: 'rare-streamer', displayName: '人気配信者 ミライ', kind: 'rare', visitorType: 'girl', eventType: 'viral', bubble: '話題沸騰' },
]
