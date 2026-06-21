import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

router.post('/', (req: Request, res: Response) => {
  const { bill_id } = req.body
  if (!bill_id) {
    res.status(400).json({ error: 'bill_id is required' })
    return
  }
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(bill_id)
  if (!bill) {
    res.status(404).json({ error: 'Bill not found' })
    return
  }

  const id = uuidv4()
  const token = uuidv4()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  db.prepare('INSERT INTO share_tokens (id, bill_id, token, expires_at) VALUES (?, ?, ?, ?)').run(
    id,
    bill_id,
    token,
    expiresAt,
  )

  res.status(201).json({ id, token, expires_at: expiresAt })
})

router.get('/:token', (req: Request, res: Response) => {
  const shareToken = db
    .prepare('SELECT * FROM share_tokens WHERE token = ?')
    .get(req.params.token) as any

  if (!shareToken) {
    res.status(404).json({ error: 'Share token not found' })
    return
  }

  if (new Date(shareToken.expires_at) < new Date()) {
    res.status(410).json({ error: 'Share token has expired' })
    return
  }

  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(shareToken.bill_id) as any
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

export default router
