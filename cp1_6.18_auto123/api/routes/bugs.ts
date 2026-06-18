import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'

const router = Router()

const bugsPath = path.resolve(process.cwd(), 'api/data/bugs.json')

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const data = await fs.readFile(bugsPath, 'utf-8')
    const bugs = JSON.parse(data)
    const filtered = bugs.filter((b: any) => b.projectId === id)
    res.json(filtered)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to read bugs' })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const data = await fs.readFile(bugsPath, 'utf-8')
    const bugs = JSON.parse(data)
    const now = new Date().toISOString()
    const newBug = {
      id: uuidv4(),
      projectId: id,
      title: req.body.title,
      severity: req.body.severity || 'minor',
      description: req.body.description || '',
      reporter: req.body.reporter || '',
      status: req.body.status || 'open',
      createdAt: now,
      updatedAt: now,
    }
    bugs.push(newBug)
    await fs.writeFile(bugsPath, JSON.stringify(bugs, null, 2), 'utf-8')
    res.status(201).json(newBug)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create bug' })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const data = await fs.readFile(bugsPath, 'utf-8')
    const bugs = JSON.parse(data)
    const index = bugs.findIndex((b: any) => b.id === id)
    if (index === -1) {
      res.status(404).json({ success: false, error: 'Bug not found' })
      return
    }
    const bug = bugs[index]
    if (bug.status === 'closed') {
      res.status(400).json({ success: false, error: 'Cannot update a closed bug' })
      return
    }
    bugs[index] = {
      ...bug,
      ...req.body,
      id: bug.id,
      projectId: bug.projectId,
      createdAt: bug.createdAt,
      updatedAt: new Date().toISOString(),
    }
    await fs.writeFile(bugsPath, JSON.stringify(bugs, null, 2), 'utf-8')
    res.json(bugs[index])
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update bug' })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const data = await fs.readFile(bugsPath, 'utf-8')
    const bugs = JSON.parse(data)
    const bug = bugs.find((b: any) => b.id === id)
    if (!bug) {
      res.status(404).json({ success: false, error: 'Bug not found' })
      return
    }
    if (bug.status === 'closed') {
      res.status(400).json({ success: false, error: 'Cannot delete a closed bug' })
      return
    }
    const filtered = bugs.filter((b: any) => b.id !== id)
    await fs.writeFile(bugsPath, JSON.stringify(filtered, null, 2), 'utf-8')
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete bug' })
  }
})

export default router
