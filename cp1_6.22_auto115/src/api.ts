import { Seed, Plant, EvolutionTree, BreedResult, GeneColor, Rarity } from './types'

const PLAYER_ID = 'player_001'

export async function fetchSeeds(): Promise<Seed[]> {
  const res = await fetch(`/api/seed?playerId=${PLAYER_ID}`)
  return res.json()
}

export async function addSeed(seed: Omit<Seed, 'id'>): Promise<Seed> {
  const res = await fetch('/api/seed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: PLAYER_ID, seed })
  })
  return res.json()
}

export async function deleteSeed(seedId: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/seed/${seedId}?playerId=${PLAYER_ID}`, {
    method: 'DELETE'
  })
  return res.json()
}

export async function fetchPlants(): Promise<Plant[]> {
  const res = await fetch(`/api/plant?playerId=${PLAYER_ID}`)
  return res.json()
}

export async function plantSeedToPlot(seedId: string, plotIndex: number): Promise<Plant> {
  const res = await fetch('/api/plant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: PLAYER_ID, seedId, plotIndex })
  })
  if (!res.ok) throw new Error('种植失败')
  return res.json()
}

export async function removePlant(plantId: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/plant/${plantId}?playerId=${PLAYER_ID}`, {
    method: 'DELETE'
  })
  return res.json()
}

export async function breedPlants(
  parent1Genes: GeneColor[],
  parent2Genes: GeneColor[],
  parent1Id?: string,
  parent2Id?: string
): Promise<BreedResult> {
  const res = await fetch('/api/plant/breed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId: PLAYER_ID,
      parent1Genes,
      parent2Genes,
      parent1Id,
      parent2Id
    })
  })
  return res.json()
}

export async function fetchEvolutionTree(): Promise<EvolutionTree> {
  const res = await fetch(`/api/tree?playerId=${PLAYER_ID}`)
  return res.json()
}

export const PLAYER = PLAYER_ID
