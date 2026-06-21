import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

const PRICES = { electricity: 0.56, gas: 2.8, water: 5.0, heating: 0.35 }

router.get('/', (req: Request, res: Response) => {
  const bills = db.prepare('SELECT * FROM bills ORDER BY created_at DESC').all()
  res.json(bills)
})

router.get('/trend', (req: Request, res: Response) => {
  const { room_id } = req.query
  if (!room_id) {
    res.status(400).json({ error: 'room_id is required' })
    return
  }
  const bills = db
    .prepare(
      `SELECT month, total_cost, total_electricity, total_gas, total_water, total_heating
       FROM bills WHERE room_id = ? ORDER BY month DESC LIMIT 12`,
    )
    .all(room_id as string)
    .reverse() as any[]

  res.json({
    months: bills.map((b) => b.month),
    costs: bills.map((b) => b.total_cost),
    usages: bills.map((b) => ({
      electricity: b.total_electricity,
      gas: b.total_gas,
      water: b.total_water,
      heating: b.total_heating,
    })),
  })
})

router.get('/:month', (req: Request, res: Response) => {
  const { room_id } = req.query
  if (!room_id) {
    res.status(400).json({ error: 'room_id is required' })
    return
  }
  const bill = db
    .prepare('SELECT * FROM bills WHERE room_id = ? AND month = ?')
    .get(room_id as string, req.params.month) as any
  if (!bill) {
    res.status(404).json({ error: 'Bill not found' })
    return
  }
  const splits = db
    .prepare(
      `SELECT bs.*, r.name as resident_name
       FROM bill_splits bs
       JOIN residents r ON bs.resident_id = r.id
       WHERE bs.bill_id = ?`,
    )
    .all(bill.id)
  res.json({ ...bill, splits })
})

router.post('/calculate', (req: Request, res: Response) => {
  const { room_id, month, rule } = req.body
  if (!room_id || !month || !rule) {
    res.status(400).json({ error: 'room_id, month, and rule are required' })
    return
  }
  if (!['per_capita', 'by_area', 'by_usage'].includes(rule)) {
    res.status(400).json({ error: 'rule must be per_capita, by_area, or by_usage' })
    return
  }

  const readings = db
    .prepare(
      `SELECT * FROM readings
       WHERE room_id = ? AND strftime('%Y-%m', recorded_at) = ?
       ORDER BY recorded_at ASC`,
    )
    .all(room_id, month) as any[]

  if (readings.length === 0) {
    res.status(404).json({ error: 'No readings found for this room and month' })
    return
  }

  const totalElectricity = readings.reduce((s, r) => s + r.delta_electricity, 0)
  const totalGas = readings.reduce((s, r) => s + r.delta_gas, 0)
  const totalWater = readings.reduce((s, r) => s + r.delta_water, 0)
  const totalHeating = readings.reduce((s, r) => s + r.delta_heating, 0)

  const totalCost =
    Math.round(
      (totalElectricity * PRICES.electricity +
        totalGas * PRICES.gas +
        totalWater * PRICES.water +
        totalHeating * PRICES.heating) *
        100,
    ) / 100

  const existing = db
    .prepare('SELECT * FROM bills WHERE room_id = ? AND month = ?')
    .get(room_id, month) as any

  let billId: string
  if (existing) {
    billId = existing.id
    db.prepare(
      `UPDATE bills SET total_electricity = ?, total_gas = ?, total_water = ?, total_heating = ?, total_cost = ?, rule = ? WHERE id = ?`,
    ).run(totalElectricity, totalGas, totalWater, totalHeating, totalCost, rule, billId)
    db.prepare('DELETE FROM bill_splits WHERE bill_id = ?').run(billId)
  } else {
    billId = uuidv4()
    db.prepare(
      `INSERT INTO bills (id, room_id, month, total_electricity, total_gas, total_water, total_heating, total_cost, rule)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(billId, room_id, month, totalElectricity, totalGas, totalWater, totalHeating, totalCost, rule)
  }

  const residents = db.prepare('SELECT * FROM residents WHERE room_id = ?').all(room_id) as any[]
  if (residents.length === 0) {
    res.status(400).json({ error: 'No residents found for this room' })
    return
  }

  const insertSplit = db.prepare(
    'INSERT INTO bill_splits (id, bill_id, resident_id, amount, is_paid) VALUES (?, ?, ?, ?, 0)',
  )

  if (rule === 'per_capita') {
    const perCapita = Math.round((totalCost / residents.length) * 100) / 100
    for (const r of residents) {
      insertSplit.run(uuidv4(), billId, r.id, perCapita)
    }
  } else if (rule === 'by_area') {
    const totalArea = residents.reduce((s, r) => s + r.area, 0)
    for (const r of residents) {
      const amount = Math.round((totalCost * r.area / totalArea) * 100) / 100
      insertSplit.run(uuidv4(), billId, r.id, amount)
    }
  } else if (rule === 'by_usage') {
    const totalHeatingUsage = readings.reduce((s, r) => s + r.delta_heating, 0)
    const heatingCost = totalHeatingUsage * PRICES.heating
    const otherCost = totalCost - heatingCost
    const perCapitaOther = otherCost / residents.length
    for (const r of residents) {
      const residentReadings = readings.filter((rd) => rd.resident_id === r.id)
      const residentHeating = residentReadings.reduce((s, rd) => s + rd.delta_heating, 0)
      const heatingShare = totalHeatingUsage > 0 ? (residentHeating / totalHeatingUsage) * heatingCost : 0
      const amount = Math.round((perCapitaOther + heatingShare) * 100) / 100
      insertSplit.run(uuidv4(), billId, r.id, amount)
    }
  }

  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId) as Record<string, any>
  const splits = db
    .prepare(
      `SELECT bs.*, r.name as resident_name
       FROM bill_splits bs
       JOIN residents r ON bs.resident_id = r.id
       WHERE bs.bill_id = ?`,
    )
    .all(billId)

  res.status(201).json({ ...bill, splits })
})

router.put('/splits/:id', (req: Request, res: Response) => {
  const { is_paid } = req.body
  const existing = db.prepare('SELECT * FROM bill_splits WHERE id = ?').get(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Split not found' })
    return
  }
  const paidAt = is_paid ? new Date().toISOString() : null
  db.prepare('UPDATE bill_splits SET is_paid = ?, paid_at = ? WHERE id = ?').run(
    is_paid ? 1 : 0,
    paidAt,
    req.params.id,
  )
  const split = db.prepare('SELECT * FROM bill_splits WHERE id = ?').get(req.params.id)
  res.json(split)
})

router.post('/export/:month', (req: Request, res: Response) => {
  const { room_id } = req.query
  if (!room_id) {
    res.status(400).json({ error: 'room_id is required' })
    return
  }
  const bill = db
    .prepare('SELECT * FROM bills WHERE room_id = ? AND month = ?')
    .get(room_id as string, req.params.month) as any
  if (!bill) {
    res.status(404).json({ error: 'Bill not found' })
    return
  }
  const splits = db
    .prepare(
      `SELECT bs.amount, bs.is_paid, r.name as resident_name
       FROM bill_splits bs
       JOIN residents r ON bs.resident_id = r.id
       WHERE bs.bill_id = ?`,
    )
    .all(bill.id) as any[]

  const rows = [
    ['Month', bill.month],
    ['Rule', bill.rule],
    ['Total Electricity', bill.total_electricity],
    ['Total Gas', bill.total_gas],
    ['Total Water', bill.total_water],
    ['Total Heating', bill.total_heating],
    ['Total Cost', bill.total_cost],
    [],
    ['Resident', 'Amount', 'Paid'],
    ...splits.map((s) => [s.resident_name, s.amount, s.is_paid ? 'Yes' : 'No']),
  ]

  const csv = rows.map((row) => row.join(',')).join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename=bill-${bill.month}.csv`)
  res.send(csv)
})

export default router
