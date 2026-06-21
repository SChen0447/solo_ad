export type GeneColor = 'red' | 'blue' | 'yellow' | 'purple' | null
export type Rarity = 'common' | 'rare' | 'epic'

export interface Seed {
  id: string
  name: string
  geneSequence: GeneColor[]
  growthTime: number
  rarity: Rarity
}

export interface PlantTraits {
  petalColor: string
  leafShape: 'round' | 'pointed' | 'heart' | 'lanceolate'
  height: number
  diseaseResistance: number
  flowerSize: number
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

export interface BreedResult {
  id: string
  name: string
  geneSequence: GeneColor[]
  traits: PlantTraits
  growthTime: number
  rarity: Rarity
}

export const GENE_COLOR_HEX: Record<string, string> = {
  red: '#ff4d4d',
  blue: '#4d8aff',
  yellow: '#ffe44d',
  purple: '#b04dff'
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#94a3b8',
  rare: '#3b82f6',
  epic: '#f59e0b'
}
