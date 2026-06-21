import { v4 as uuidv4 } from 'uuid'

export type GeneColor = 'red' | 'blue' | 'yellow' | 'purple' | null
export type Rarity = 'common' | 'rare' | 'epic'

export interface Seed {
  id: string
  name: string
  geneSequence: GeneColor[]
  growthTime: number
  rarity: Rarity
}

export interface Plant {
  id: string
  seedId: string
  playerId: string
  plotIndex: number
  geneSequence: GeneColor[]
  plantedAt: number
  growthProgress: number
  traits: PlantTraits
}

export interface PlantTraits {
  petalColor: string
  leafShape: 'round' | 'pointed' | 'heart' | 'lanceolate'
  height: number
  diseaseResistance: number
  flowerSize: number
}

export interface TreeNode {
  id: string
  plantName: string
  geneSequence: GeneColor[]
  traits: PlantTraits
  parentIds: string[]
  createdAt: number
  generation: number
}

export interface EvolutionTree {
  playerId: string
  nodes: TreeNode[]
}

interface GameData {
  players: Record<string, {
    seeds: Seed[]
    plants: Plant[]
    evolutionTree: EvolutionTree
  }>
}

const data: GameData = {
  players: {}
}

const GENE_COLOR_HEX: Record<string, string> = {
  red: '#ff4d4d',
  blue: '#4d8aff',
  yellow: '#ffe44d',
  purple: '#b04dff'
}

const LEAF_SHAPES: PlantTraits['leafShape'][] = ['round', 'pointed', 'heart', 'lanceolate']

function ensurePlayer(playerId: string) {
  if (!data.players[playerId]) {
    data.players[playerId] = {
      seeds: generateInitialSeeds(),
      plants: [],
      evolutionTree: {
        playerId,
        nodes: []
      }
    }
  }
  return data.players[playerId]
}

function generateInitialSeeds(): Seed[] {
  return [
    {
      id: uuidv4(),
      name: '火焰玫瑰',
      geneSequence: ['red', 'red', 'yellow', 'red', null, 'red', null, 'yellow'],
      growthTime: 8,
      rarity: 'common'
    },
    {
      id: uuidv4(),
      name: '海洋蓝铃',
      geneSequence: ['blue', 'blue', null, 'blue', 'blue', null, 'purple', null],
      growthTime: 10,
      rarity: 'rare'
    },
    {
      id: uuidv4(),
      name: '金阳菊',
      geneSequence: ['yellow', 'yellow', 'yellow', null, 'red', 'yellow', null, null],
      growthTime: 6,
      rarity: 'common'
    },
    {
      id: uuidv4(),
      name: '紫晶兰花',
      geneSequence: ['purple', 'purple', 'blue', null, 'purple', null, 'purple', 'blue'],
      growthTime: 15,
      rarity: 'epic'
    }
  ]
}

export function calculateTraits(geneSequence: GeneColor[]): PlantTraits {
  const colorCounts: Record<string, number> = { red: 0, blue: 0, yellow: 0, purple: 0 }
  geneSequence.forEach(g => { if (g) colorCounts[g]++ })

  const total = Object.values(colorCounts).reduce((a, b) => a + b, 0) || 1
  const r = (colorCounts.red * 255) / total
  const g = ((colorCounts.yellow * 200) + (colorCounts.blue * 50)) / total
  const b = ((colorCounts.blue * 255) + (colorCounts.purple * 180)) / total
  const petalColor = `rgb(${Math.round(Math.min(255, r))}, ${Math.round(Math.min(255, g))}, ${Math.round(Math.min(255, b))})`

  const dominantIndex = Object.values(colorCounts).indexOf(Math.max(...Object.values(colorCounts)))
  const leafShape = LEAF_SHAPES[dominantIndex % LEAF_SHAPES.length]

  const height = 0.5 + (total / 8) * 1.5
  const diseaseResistance = (colorCounts.purple + colorCounts.blue) / 8
  const flowerSize = 0.3 + ((colorCounts.red + colorCounts.yellow) / 8) * 0.4

  return { petalColor, leafShape, height, diseaseResistance, flowerSize }
}

function generatePlantName(geneSequence: GeneColor[]): string {
  const colors: Record<string, string> = { red: '赤', blue: '碧', yellow: '金', purple: '紫' }
  const prefixes: Record<number, string> = { 2: '双', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八' }
  const suffixes = ['花', '兰', '菊', '薇', '莲', '梅']

  const dominant = Object.entries(
    geneSequence.reduce<Record<string, number>>((acc, g) => { if (g) acc[g] = (acc[g] || 0) + 1; return acc }, {})
  ).sort((a, b) => b[1] - a[1])

  if (dominant.length === 0) return '神秘之花'
  const [color, count] = dominant[0]
  const prefix = count > 1 ? (prefixes[count] || '多') : colors[color]
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
  return `${prefix}${suffix}`
}

export function getSeeds(playerId: string): Seed[] {
  return ensurePlayer(playerId).seeds
}

export function addSeed(playerId: string, seed: Omit<Seed, 'id'>): Seed {
  const player = ensurePlayer(playerId)
  const newSeed: Seed = { ...seed, id: uuidv4() }
  player.seeds.push(newSeed)
  return newSeed
}

export function updateSeed(playerId: string, seedId: string, updates: Partial<Omit<Seed, 'id'>>): Seed | null {
  const player = ensurePlayer(playerId)
  const idx = player.seeds.findIndex(s => s.id === seedId)
  if (idx === -1) return null
  player.seeds[idx] = { ...player.seeds[idx], ...updates }
  return player.seeds[idx]
}

export function removeSeed(playerId: string, seedId: string): boolean {
  const player = ensurePlayer(playerId)
  const idx = player.seeds.findIndex(s => s.id === seedId)
  if (idx === -1) return false
  player.seeds.splice(idx, 1)
  return true
}

export function getPlants(playerId: string): Plant[] {
  return ensurePlayer(playerId).plants
}

export function plantSeed(playerId: string, seedId: string, plotIndex: number): Plant | null {
  const player = ensurePlayer(playerId)
  const seed = player.seeds.find(s => s.id === seedId)
  if (!seed) return null

  const existing = player.plants.find(p => p.plotIndex === plotIndex)
  if (existing) return null

  const plant: Plant = {
    id: uuidv4(),
    seedId,
    playerId,
    plotIndex,
    geneSequence: [...seed.geneSequence],
    plantedAt: Date.now(),
    growthProgress: 0,
    traits: calculateTraits(seed.geneSequence)
  }
  player.plants.push(plant)

  const tree = player.evolutionTree
  const existingNode = tree.nodes.find(n =>
    JSON.stringify(n.geneSequence) === JSON.stringify(seed.geneSequence)
  )
  if (!existingNode) {
    tree.nodes.push({
      id: plant.id,
      plantName: seed.name,
      geneSequence: [...seed.geneSequence],
      traits: { ...plant.traits },
      parentIds: [],
      createdAt: Date.now(),
      generation: 1
    })
  }
  return plant
}

export function removePlant(playerId: string, plantId: string): boolean {
  const player = ensurePlayer(playerId)
  const idx = player.plants.findIndex(p => p.id === plantId)
  if (idx === -1) return false
  player.plants.splice(idx, 1)
  return true
}

export interface BreedRequest {
  parent1Genes: GeneColor[]
  parent2Genes: GeneColor[]
  parent1Name?: string
  parent2Name?: string
  parent1Id?: string
  parent2Id?: string
}

export interface BreedResult {
  id: string
  name: string
  geneSequence: GeneColor[]
  traits: PlantTraits
  growthTime: number
  rarity: Rarity
}

export function breedPlants(playerId: string, req: BreedRequest): BreedResult {
  const player = ensurePlayer(playerId)
  const { parent1Genes, parent2Genes, parent1Id, parent2Id } = req

  const childGenes: GeneColor[] = []
  for (let i = 0; i < 8; i++) {
    const rand = Math.random()
    if (rand < 0.45 && parent1Genes[i]) {
      childGenes.push(parent1Genes[i])
    } else if (rand < 0.9 && parent2Genes[i]) {
      childGenes.push(parent2Genes[i])
    } else if (rand < 0.95) {
      childGenes.push(null)
    } else {
      const palette: GeneColor[] = ['red', 'blue', 'yellow', 'purple']
      childGenes.push(palette[Math.floor(Math.random() * palette.length)])
    }
  }

  const traits = calculateTraits(childGenes)
  const name = generatePlantName(childGenes)
  const geneCount = childGenes.filter(g => g).length
  let rarity: Rarity = 'common'
  if (geneCount >= 7 || childGenes.filter(g => g === 'purple').length >= 3) {
    rarity = 'epic'
  } else if (geneCount >= 5) {
    rarity = 'rare'
  }
  const growthTime = Math.max(4, 8 + (8 - geneCount) * 2 + Math.floor(Math.random() * 4))
  const id = uuidv4()

  const seed: Seed = { id, name, geneSequence: childGenes, growthTime, rarity }
  player.seeds.push(seed)

  const tree = player.evolutionTree
  let maxGen = 0
  if (parent1Id) {
    const n = tree.nodes.find(tn => tn.id === parent1Id)
    if (n) maxGen = Math.max(maxGen, n.generation)
  }
  if (parent2Id) {
    const n = tree.nodes.find(tn => tn.id === parent2Id)
    if (n) maxGen = Math.max(maxGen, n.generation)
  }
  tree.nodes.push({
    id,
    plantName: name,
    geneSequence: childGenes,
    traits,
    parentIds: [parent1Id, parent2Id].filter((x): x is string => !!x),
    createdAt: Date.now(),
    generation: maxGen + 1
  })

  return { id, name, geneSequence: childGenes, traits, growthTime, rarity }
}

export function getEvolutionTree(playerId: string): EvolutionTree {
  return ensurePlayer(playerId).evolutionTree
}

export function updatePlantGrowth(playerId: string, plantId: string, progress: number): Plant | null {
  const player = ensurePlayer(playerId)
  const plant = player.plants.find(p => p.id === plantId)
  if (!plant) return null
  plant.growthProgress = Math.min(1, progress)
  return plant
}
