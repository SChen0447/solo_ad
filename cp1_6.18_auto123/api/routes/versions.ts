import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'

const router = Router()

const versionsPath = path.resolve(process.cwd(), 'api/data/versions.json')

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const data = await fs.readFile(versionsPath, 'utf-8')
    const versions = JSON.parse(data)
    const filtered = versions.filter((v: any) => v.projectId === id)
    res.json(filtered)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to read versions' })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const data = await fs.readFile(versionsPath, 'utf-8')
    const versions = JSON.parse(data)
    const items = (req.body.items || []).map((item: any) => ({
      ...item,
      id: uuidv4(),
    }))
    const newVersion = {
      id: uuidv4(),
      projectId: id,
      version: req.body.version,
      date: req.body.date || new Date().toISOString().split('T')[0],
      summary: req.body.summary || '',
      items,
      createdAt: new Date().toISOString(),
    }
    versions.push(newVersion)
    await fs.writeFile(versionsPath, JSON.stringify(versions, null, 2), 'utf-8')
    res.status(201).json(newVersion)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create version' })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const data = await fs.readFile(versionsPath, 'utf-8')
    const versions = JSON.parse(data)
    const filtered = versions.filter((v: any) => v.id !== id)
    await fs.writeFile(versionsPath, JSON.stringify(filtered, null, 2), 'utf-8')
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete version' })
  }
})

export default router
