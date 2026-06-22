export type MaterialType = 'floor' | 'wall' | 'curtain'
export type PatternType = 'wood' | 'marble' | 'tile' | 'plain' | 'brick' | 'fabric' | 'vertical'

export interface Material {
  id: string
  name: string
  type: MaterialType
  color: string
  secondaryColor?: string
  pattern: PatternType
  thumbnailColor: string
}

const floorMaterials: Material[] = [
  {
    id: 'floor-oak-light',
    name: '浅橡木地板',
    type: 'floor',
    color: '#D4A574',
    secondaryColor: '#C4956A',
    pattern: 'wood',
    thumbnailColor: '#D4A574'
  },
  {
    id: 'floor-walnut-dark',
    name: '深胡桃木',
    type: 'floor',
    color: '#5D4037',
    secondaryColor: '#4E342E',
    pattern: 'wood',
    thumbnailColor: '#5D4037'
  },
  {
    id: 'floor-marble-gray',
    name: '灰色大理石',
    type: 'floor',
    color: '#E8E8E8',
    secondaryColor: '#D0D0D0',
    pattern: 'marble',
    thumbnailColor: '#E8E8E8'
  },
  {
    id: 'floor-tile-cream',
    name: '米白瓷砖',
    type: 'floor',
    color: '#F5F5DC',
    secondaryColor: '#E8E8D0',
    pattern: 'tile',
    thumbnailColor: '#F5F5DC'
  },
  {
    id: 'floor-bamboo',
    name: '竹木地板',
    type: 'floor',
    color: '#C9A86C',
    secondaryColor: '#B8956A',
    pattern: 'wood',
    thumbnailColor: '#C9A86C'
  },
  {
    id: 'floor-tile-slate',
    name: '板岩瓷砖',
    type: 'floor',
    color: '#6B7280',
    secondaryColor: '#4B5563',
    pattern: 'tile',
    thumbnailColor: '#6B7280'
  }
]

const wallMaterials: Material[] = [
  {
    id: 'wall-cream-white',
    name: '米白色',
    type: 'wall',
    color: '#FDF5E6',
    pattern: 'plain',
    thumbnailColor: '#FDF5E6'
  },
  {
    id: 'wall-light-gray',
    name: '浅灰色',
    type: 'wall',
    color: '#E5E7EB',
    pattern: 'plain',
    thumbnailColor: '#E5E7EB'
  },
  {
    id: 'wall-beige-warm',
    name: '暖米色',
    type: 'wall',
    color: '#F5E6D3',
    pattern: 'plain',
    thumbnailColor: '#F5E6D3'
  },
  {
    id: 'wall-sage-green',
    name: '鼠尾草绿',
    type: 'wall',
    color: '#9CAF88',
    pattern: 'plain',
    thumbnailColor: '#9CAF88'
  },
  {
    id: 'wall-dusty-blue',
    name: '雾霾蓝',
    type: 'wall',
    color: '#A8C5DA',
    pattern: 'plain',
    thumbnailColor: '#A8C5DA'
  },
  {
    id: 'wall-terracotta',
    name: '陶土色',
    type: 'wall',
    color: '#C67B5B',
    pattern: 'brick',
    thumbnailColor: '#C67B5B'
  }
]

const curtainMaterials: Material[] = [
  {
    id: 'curtain-sheer-white',
    name: '白纱帘',
    type: 'curtain',
    color: '#FFFAF0',
    secondaryColor: '#F5F0E6',
    pattern: 'fabric',
    thumbnailColor: '#FFFAF0'
  },
  {
    id: 'curtain-dark-gray',
    name: '深灰窗帘',
    type: 'curtain',
    color: '#4A5568',
    secondaryColor: '#3D4852',
    pattern: 'fabric',
    thumbnailColor: '#4A5568'
  },
  {
    id: 'curtain-lake-blue',
    name: '湖蓝窗帘',
    type: 'curtain',
    color: '#5DADE2',
    secondaryColor: '#4A9BD6',
    pattern: 'vertical',
    thumbnailColor: '#5DADE2'
  },
  {
    id: 'curtain-beige',
    name: '米色窗帘',
    type: 'curtain',
    color: '#D4C4A8',
    secondaryColor: '#C4B498',
    pattern: 'fabric',
    thumbnailColor: '#D4C4A8'
  },
  {
    id: 'curtain-pink-blush',
    name: '浅粉窗帘',
    type: 'curtain',
    color: '#F5D5D0',
    secondaryColor: '#E8C8C2',
    pattern: 'vertical',
    thumbnailColor: '#F5D5D0'
  },
  {
    id: 'curtain-forest-green',
    name: '墨绿窗帘',
    type: 'curtain',
    color: '#2D5A4E',
    secondaryColor: '#1E493D',
    pattern: 'fabric',
    thumbnailColor: '#2D5A4E'
  }
]

const allMaterials: Material[] = [...floorMaterials, ...wallMaterials, ...curtainMaterials]

export function getMaterialsByType(type: MaterialType): Material[] {
  switch (type) {
    case 'floor':
      return floorMaterials
    case 'wall':
      return wallMaterials
    case 'curtain':
      return curtainMaterials
    default:
      return []
  }
}

export function getMaterialById(id: string): Material | undefined {
  return allMaterials.find(m => m.id === id)
}

export function getAllMaterials(): Material[] {
  return allMaterials
}

export function getDefaultSelection(): { floor: string; wall: string; curtain: string } {
  return {
    floor: floorMaterials[0].id,
    wall: wallMaterials[0].id,
    curtain: curtainMaterials[0].id
  }
}
