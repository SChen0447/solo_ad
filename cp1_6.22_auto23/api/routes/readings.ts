import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { room_id, limit } = req.query
  let sql = 'SELECT * FROM readings'
  const params: any[] = []
  if (room_id) {
    sql += ' WHERE room_id = ?'
    params.push(room_id)
  }
  sql += ' ORDER BY recorded_at DESC'
  if (limit) {
    sql += ' LIMIT ?'
    params.push(Number(limit))
  }
  const readings = db.prepare(sql).all(...params)
  res.json(readings)
})

router.get('/latest', (req: Request, res: Response) => {
  const { room_id } = req.query
  if (!room_id) {
    res.status(400).json({ error: 'room_id is required' })
    return
  }
  const reading = db
    .prepare('SELECT * FROM readings WHERE room_id = ? ORDER BY recorded_at DESC LIMIT 1')
    .get(room_id as string)
  if (!reading) {
    res.status(404).json({ error: 'No readings found for this room' })
    return
  }
  res.json(reading)
})

router.post('/', (req: Request, res: Response) => {
  const { room_id, resident_id, electricity, gas, water, heating } = req.body
  if (!room_id) {
    res.status(400).json({ error: 'room_id is required' })
    return
  }

  let delta_electricity = 0
  let delta_gas = 0
  let delta_water = 0
  let delta_heating = 0

  const prev = db
    .prepare('SELECT * FROM readings WHERE room_id = ? ORDER BY recorded_at DESC LIMIT 1')
    .get(room_id) as any

  if (prev) {
    delta_electricity = (electricity ?? 0) - prev.electricity
    delta_gas = (gas ?? 0) - prev.gas
    delta_water = (water ?? 0) - prev.water
    delta_heating = (heating ?? 0) - prev.heating
  }

  const id = uuidv4()
  db.prepare(
    `INSERT INTO readings (id, room_id, resident_id, electricity, gas, water, heating, delta_electricity, delta_gas, delta_water, delta_heating)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, room_id, resident_id ?? null, electricity ?? 0, gas ?? 0, water ?? 0, heating ?? 0, delta_electricity, delta_gas, delta_water, delta_heating)

  const reading = db.prepare('SELECT * FROM readings WHERE id = ?').get(id)
  res.status(201).json(reading)
})

router.delete('/:id', (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM readings WHERE id = ?').run(req.params.id)
  if (result.changes === 0) {
    res.status(404).json({ error: 'Reading not found' })
    return
  }
  res.status(204).send()
})

export default router
