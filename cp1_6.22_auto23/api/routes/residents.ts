import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { room_id } = req.query
  let residents: any[]
  if (room_id) {
    residents = db.prepare('SELECT * FROM residents WHERE room_id = ? ORDER BY created_at DESC').all(room_id)
  } else {
    residents = db.prepare('SELECT * FROM residents ORDER BY created_at DESC').all()
  }
  res.json(residents)
})

router.post('/', (req: Request, res: Response) => {
  const { name, room_id, area, is_permanent, color_label } = req.body
  if (!name || !room_id) {
    res.status(400).json({ error: 'name and room_id are required' })
    return
  }
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id)
  if (!room) {
    res.status(404).json({ error: 'Room not found' })
    return
  }
  const id = uuidv4()
  db.prepare(
    'INSERT INTO residents (id, name, room_id, area, is_permanent, color_label) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, name, room_id, area ?? 0, is_permanent ?? 1, color_label ?? '#1e3a5f')
  const resident = db.prepare('SELECT * FROM residents WHERE id = ?').get(id)
  res.status(201).json(resident)
})

router.put('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM residents WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Resident not found' })
    return
  }
  const { name, room_id, area, is_permanent, color_label } = req.body
  const e = existing as any
  db.prepare(
    'UPDATE residents SET name = ?, room_id = ?, area = ?, is_permanent = ?, color_label = ? WHERE id = ?',
  ).run(
    name ?? e.name,
    room_id ?? e.room_id,
    area ?? e.area,
    is_permanent ?? e.is_permanent,
    color_label ?? e.color_label,
    req.params.id,
  )
  const resident = db.prepare('SELECT * FROM residents WHERE id = ?').get(req.params.id)
  res.json(resident)
})

router.delete('/:id', (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM residents WHERE id = ?').run(req.params.id)
  if (result.changes === 0) {
    res.status(404).json({ error: 'Resident not found' })
    return
  }
  res.status(204).send()
})

export default router
