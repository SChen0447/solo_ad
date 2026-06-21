import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY created_at DESC').all()
  res.json(rooms)
})

router.post('/', (req: Request, res: Response) => {
  const { name, address } = req.body
  if (!name || !address) {
    res.status(400).json({ error: 'name and address are required' })
    return
  }
  const id = uuidv4()
  db.prepare('INSERT INTO rooms (id, name, address) VALUES (?, ?, ?)').run(id, name, address)
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id)
  res.status(201).json(room)
})

router.put('/:id', (req: Request, res: Response) => {
  const { name, address } = req.body
  const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Room not found' })
    return
  }
  db.prepare('UPDATE rooms SET name = ?, address = ? WHERE id = ?').run(
    name ?? (existing as any).name,
    address ?? (existing as any).address,
    req.params.id,
  )
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id)
  res.json(room)
})

router.delete('/:id', (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id)
  if (result.changes === 0) {
    res.status(404).json({ error: 'Room not found' })
    return
  }
  res.status(204).send()
})

export default router
