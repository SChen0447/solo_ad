import { Router, Request, Response } from 'express'
import {
  getSeeds,
  addSeed,
  updateSeed,
  removeSeed,
  getPlants,
  plantSeed,
  removePlant,
  breedPlants,
  getEvolutionTree,
  updatePlantGrowth,
  GeneColor,
  Seed
} from '../dataStore'

const router = Router()

const DEFAULT_PLAYER_ID = 'player_001'

router.get('/player', (_req: Request, res: Response) => {
  res.json({ playerId: DEFAULT_PLAYER_ID })
})

router.get('/seed', (req: Request, res: Response) => {
  const playerId = (req.query.playerId as string) || DEFAULT_PLAYER_ID
  res.json(getSeeds(playerId))
})

router.post('/seed', (req: Request, res: Response) => {
  const playerId = (req.body.playerId as string) || DEFAULT_PLAYER_ID
  const seed = req.body.seed as Omit<Seed, 'id'>
  if (!seed || !seed.name || !Array.isArray(seed.geneSequence)) {
    return res.status(400).json({ error: 'Invalid seed data' })
  }
  const result = addSeed(playerId, seed)
  res.status(201).json(result)
})

router.put('/seed/:seedId', (req: Request, res: Response) => {
  const playerId = (req.body.playerId as string) || DEFAULT_PLAYER_ID
  const { seedId } = req.params
  const updates = req.body.updates as Partial<Omit<Seed, 'id'>>
  const result = updateSeed(playerId, seedId, updates)
  if (!result) return res.status(404).json({ error: 'Seed not found' })
  res.json(result)
})

router.delete('/seed/:seedId', (req: Request, res: Response) => {
  const playerId = (req.query.playerId as string) || DEFAULT_PLAYER_ID
  const { seedId } = req.params
  const ok = removeSeed(playerId, seedId)
  if (!ok) return res.status(404).json({ error: 'Seed not found' })
  res.json({ success: true })
})

router.get('/plant', (req: Request, res: Response) => {
  const playerId = (req.query.playerId as string) || DEFAULT_PLAYER_ID
  res.json(getPlants(playerId))
})

router.post('/plant', (req: Request, res: Response) => {
  const playerId = (req.body.playerId as string) || DEFAULT_PLAYER_ID
  const { seedId, plotIndex } = req.body
  if (typeof seedId !== 'string' || typeof plotIndex !== 'number') {
    return res.status(400).json({ error: 'Invalid plant data' })
  }
  const result = plantSeed(playerId, seedId, plotIndex)
  if (!result) return res.status(400).json({ error: 'Failed to plant (seed not found or plot occupied)' })
  res.status(201).json(result)
})

router.delete('/plant/:plantId', (req: Request, res: Response) => {
  const playerId = (req.query.playerId as string) || DEFAULT_PLAYER_ID
  const { plantId } = req.params
  const ok = removePlant(playerId, plantId)
  if (!ok) return res.status(404).json({ error: 'Plant not found' })
  res.json({ success: true })
})

router.post('/plant/breed', (req: Request, res: Response) => {
  const playerId = (req.body.playerId as string) || DEFAULT_PLAYER_ID
  const { parent1Genes, parent2Genes, parent1Name, parent2Name, parent1Id, parent2Id } = req.body
  if (!Array.isArray(parent1Genes) || !Array.isArray(parent2Genes)) {
    return res.status(400).json({ error: 'Invalid gene sequences' })
  }
  const result = breedPlants(playerId, {
    parent1Genes: parent1Genes as GeneColor[],
    parent2Genes: parent2Genes as GeneColor[],
    parent1Name,
    parent2Name,
    parent1Id,
    parent2Id
  })
  res.json(result)
})

router.get('/tree/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params
  res.json(getEvolutionTree(playerId))
})

router.get('/tree', (req: Request, res: Response) => {
  const playerId = (req.query.playerId as string) || DEFAULT_PLAYER_ID
  res.json(getEvolutionTree(playerId))
})

router.patch('/plant/:plantId/growth', (req: Request, res: Response) => {
  const playerId = (req.body.playerId as string) || DEFAULT_PLAYER_ID
  const { plantId } = req.params
  const { progress } = req.body
  if (typeof progress !== 'number') {
    return res.status(400).json({ error: 'Invalid progress value' })
  }
  const result = updatePlantGrowth(playerId, plantId, progress)
  if (!result) return res.status(404).json({ error: 'Plant not found' })
  res.json(result)
})

export default router
