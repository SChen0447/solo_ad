import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'

const router = Router()

const projectsPath = path.resolve(process.cwd(), 'api/data/projects.json')
const versionsPath = path.resolve(process.cwd(), 'api/data/versions.json')
const bugsPath = path.resolve(process.cwd(), 'api/data/bugs.json')

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await fs.readFile(projectsPath, 'utf-8')
    const projects = JSON.parse(data)
    res.json(projects)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to read projects' })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await fs.readFile(projectsPath, 'utf-8')
    const projects = JSON.parse(data)
    const now = new Date().toISOString()
    const newProject = {
      id: uuidv4(),
      name: req.body.name,
      description: req.body.description || '',
      icon: req.body.icon || 'gamepad',
      createdAt: now,
      updatedAt: now,
    }
    projects.push(newProject)
    await fs.writeFile(projectsPath, JSON.stringify(projects, null, 2), 'utf-8')
    res.status(201).json(newProject)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create project' })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const projectsData = await fs.readFile(projectsPath, 'utf-8')
    const projects = JSON.parse(projectsData)
    const filteredProjects = projects.filter((p: any) => p.id !== id)
    await fs.writeFile(projectsPath, JSON.stringify(filteredProjects, null, 2), 'utf-8')

    const versionsData = await fs.readFile(versionsPath, 'utf-8')
    const versions = JSON.parse(versionsData)
    const filteredVersions = versions.filter((v: any) => v.projectId !== id)
    await fs.writeFile(versionsPath, JSON.stringify(filteredVersions, null, 2), 'utf-8')

    const bugsData = await fs.readFile(bugsPath, 'utf-8')
    const bugs = JSON.parse(bugsData)
    const filteredBugs = bugs.filter((b: any) => b.projectId !== id)
    await fs.writeFile(bugsPath, JSON.stringify(filteredBugs, null, 2), 'utf-8')

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete project' })
  }
})

export default router
