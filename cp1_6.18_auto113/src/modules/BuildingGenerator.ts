import { BuildingData, BuildingStyle, HISTORICAL_NODES } from '@store/useStore'

interface BuildingBlock {
  x: number
  z: number
  width: number
  depth: number
}

const TANG_NAMES = [
  '朱雀台', '兴庆殿', '大明宫', '翰林院', '御史台', '光禄寺',
  '鸿胪馆', '太仆寺', '司农寺', '国子监', '弘文馆', '崇文馆',
  '礼部南院', '吏部选院', '兵部官舍', '户部仓场',
]

const SONG_NAMES = [
  '樊楼', '长庆楼', '太和楼', '清风楼', '八仙楼', '熙春楼',
  '千春楼', '万胜楼', '和乐楼', '铁屑楼', '状元楼', '明月楼',
  '潘楼酒店', '白矾楼', '遇仙正店', '会仙酒楼',
]

const MINGQING_NAMES = [
  '太和殿', '中和殿', '保和殿', '乾清宫', '坤宁宫', '文华殿',
  '武英殿', '奉先殿', '养心殿', '储秀宫', '永寿宫', '长春宫',
  '钟粹宫', '景仁宫', '承乾宫', '翊坤宫',
]

const TANG_FEATURES = [
  '斗拱宏大，出檐深远', '屋脊平直，鸱尾高耸', '柱身粗壮，础石覆盆',
  '门窗朴素，直棂方格', '色彩简朴，朱白为主', '整体方正，气势雄浑',
]

const SONG_FEATURES = [
  '斗拱精巧，飞檐翘角', '屋脊弯曲，走兽生动', '柱身细长，柱础雕饰',
  '棂花复杂，格扇多样', '色彩淡雅，青绿点缀', '整体秀丽，造型轻盈',
]

const MINGQING_FEATURES = [
  '斗拱装饰化，出檐较浅', '屋脊繁复，龙吻庄重', '柱子油漆，彩画辉煌',
  '花窗精雕，隔扇华丽', '红墙黄瓦，金碧辉煌', '整体严谨，富丽堂皇',
]

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function generateCityBlocks(): BuildingBlock[] {
  const blocks: BuildingBlock[] = []
  const rand = seededRandom(42)
  const centerX = 0
  const centerZ = 0
  const ringCount = 5

  for (let ring = 0; ring < ringCount; ring++) {
    const blocksInRing = 4 + ring * 4
    const radius = 20 + ring * 22
    const angleStep = (Math.PI * 2) / blocksInRing

    for (let i = 0; i < blocksInRing; i++) {
      const angle = i * angleStep + ring * 0.15
      const r = radius + (rand() - 0.5) * 10
      const x = centerX + Math.cos(angle) * r
      const z = centerZ + Math.sin(angle) * r
      const blockScale = 1 - ring * 0.08
      const width = (10 + rand() * 8) * blockScale
      const depth = (10 + rand() * 8) * blockScale
      blocks.push({ x, z, width, depth })
    }
  }
  return blocks
}

function getStyleForYear(year: number): BuildingStyle {
  if (year < 960) return 'tang'
  if (year < 1368) return 'song'
  return 'mingqing'
}

function getNamesForStyle(style: BuildingStyle): string[] {
  switch (style) {
    case 'tang': return TANG_NAMES
    case 'song': return SONG_NAMES
    case 'mingqing': return MINGQING_NAMES
  }
}

function getFeaturesForStyle(style: BuildingStyle): string[] {
  switch (style) {
    case 'tang': return TANG_FEATURES
    case 'song': return SONG_FEATURES
    case 'mingqing': return MINGQING_FEATURES
  }
}

export function generateBuildings(
  startYear: number = 700,
  endYear: number = 1900
): BuildingData[] {
  const blocks = generateCityBlocks()
  const buildings: BuildingData[] = []
  const rand = seededRandom(12345)
  const totalCount = Math.min(200, blocks.length * 2)

  let blockIndex = 0
  for (let i = 0; i < totalCount; i++) {
    const block = blocks[blockIndex % blocks.length]
    const subBuilding = blockIndex >= blocks.length

    let posX = block.x
    let posZ = block.z
    let sizeW = block.width * 0.7
    let sizeD = block.depth * 0.7

    if (subBuilding) {
      const offsetX = (rand() - 0.5) * block.width * 0.4
      const offsetZ = (rand() - 0.5) * block.depth * 0.4
      posX += offsetX
      posZ += offsetZ
      sizeW *= 0.55 + rand() * 0.2
      sizeD *= 0.55 + rand() * 0.2
    }

    const yearSpread = endYear - startYear
    const progress = i / totalCount
    const baseYear = Math.floor(startYear + progress * yearSpread * 0.9)
    const yearJitter = Math.floor((rand() - 0.3) * 80)
    const year = Math.max(startYear, Math.min(endYear, baseYear + yearJitter))

    const style = getStyleForYear(year)
    const names = getNamesForStyle(style)
    const features = getFeaturesForStyle(style)
    const nameIndex = i % names.length
    const buildingName = subBuilding
      ? `${names[nameIndex]}偏院`
      : names[nameIndex]

    const styleHeightFactor = style === 'tang' ? 1.3 : style === 'song' ? 1.1 : 1.5
    const height = (6 + rand() * 10) * styleHeightFactor

    const selectedFeatures: string[] = []
    const featureCount = 2 + Math.floor(rand() * 2)
    const usedIndices = new Set<number>()
    while (selectedFeatures.length < featureCount) {
      const idx = Math.floor(rand() * features.length)
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx)
        selectedFeatures.push(features[idx])
      }
    }

    buildings.push({
      id: `building-${i.toString().padStart(4, '0')}`,
      name: buildingName,
      style,
      year,
      position: [posX, 0, posZ],
      size: [sizeW, height, sizeD],
      features: selectedFeatures,
      dimensions: {
        width: Number(sizeW.toFixed(2)),
        depth: Number(sizeD.toFixed(2)),
        height: Number(height.toFixed(2)),
      },
    })

    blockIndex++
  }

  const riverWeight = (x: number, z: number) => {
    const riverX = x * 0.3 + z * 0.95
    const dist = Math.abs(riverX)
    return 1 / (1 + dist * 0.05)
  }

  buildings.sort((a, b) => {
    const wa = riverWeight(a.position[0], a.position[2])
    const wb = riverWeight(b.position[0], b.position[2])
    if (Math.abs(wa - wb) > 0.01) return wa - wb
    return a.year - b.year
  })

  buildings.forEach((b, idx) => {
    b.id = `building-${idx.toString().padStart(4, '0')}`
  })

  return buildings
}

export function getHistoricalNodeForYear(year: number) {
  for (let i = HISTORICAL_NODES.length - 1; i >= 0; i--) {
    if (year >= HISTORICAL_NODES[i].year) {
      return HISTORICAL_NODES[i]
    }
  }
  return HISTORICAL_NODES[0]
}
