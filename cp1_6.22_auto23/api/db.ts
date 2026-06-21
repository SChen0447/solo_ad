import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', 'data', 'energy.db')

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS residents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    area REAL NOT NULL DEFAULT 0,
    is_permanent INTEGER NOT NULL DEFAULT 1,
    color_label TEXT NOT NULL DEFAULT '#1e3a5f',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS readings (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    resident_id TEXT NOT NULL REFERENCES residents(id) ON DELETE SET NULL,
    electricity REAL NOT NULL DEFAULT 0,
    gas REAL NOT NULL DEFAULT 0,
    water REAL NOT NULL DEFAULT 0,
    heating REAL NOT NULL DEFAULT 0,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    delta_electricity REAL NOT NULL DEFAULT 0,
    delta_gas REAL NOT NULL DEFAULT 0,
    delta_water REAL NOT NULL DEFAULT 0,
    delta_heating REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    total_electricity REAL NOT NULL DEFAULT 0,
    total_gas REAL NOT NULL DEFAULT 0,
    total_water REAL NOT NULL DEFAULT 0,
    total_heating REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    rule TEXT NOT NULL DEFAULT 'per_capita',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(room_id, month)
  );

  CREATE TABLE IF NOT EXISTS bill_splits (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    resident_id TEXT NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    amount REAL NOT NULL DEFAULT 0,
    is_paid INTEGER NOT NULL DEFAULT 0,
    paid_at TEXT
  );

  CREATE TABLE IF NOT EXISTS share_tokens (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_readings_room ON readings(room_id);
  CREATE INDEX IF NOT EXISTS idx_readings_date ON readings(recorded_at);
  CREATE INDEX IF NOT EXISTS idx_bills_room_month ON bills(room_id, month);
  CREATE INDEX IF NOT EXISTS idx_bill_splits_bill ON bill_splits(bill_id);
  CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token);
`)

const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get() as { count: number }

if (roomCount.count === 0) {
  const { v4: uuidv4 } = await import('uuid')
  const roomId = uuidv4()

  const insertRoom = db.prepare('INSERT INTO rooms (id, name, address) VALUES (?, ?, ?)')
  insertRoom.run(roomId, '阳光公寓3单元', '北京市朝阳区建国路88号')

  const colors = ['#1e3a5f', '#2d7d9a', '#e8961e', '#6b46c1', '#38a169', '#e53e3e', '#d69e2e', '#3182ce']
  const residents = [
    { name: '张明', area: 25, is_permanent: 1 },
    { name: '李华', area: 20, is_permanent: 1 },
    { name: '王芳', area: 30, is_permanent: 1 },
    { name: '赵强', area: 18, is_permanent: 0 },
  ]

  const insertResident = db.prepare('INSERT INTO residents (id, name, room_id, area, is_permanent, color_label) VALUES (?, ?, ?, ?, ?, ?)')
  for (const r of residents) {
    insertResident.run(uuidv4(), r.name, roomId, r.area, r.is_permanent, colors[residents.indexOf(r) % colors.length])
  }

  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`

    const baseE = 120 + Math.floor(Math.random() * 80)
    const baseG = 30 + Math.floor(Math.random() * 20)
    const baseW = 15 + Math.floor(Math.random() * 10)
    const baseH = 40 + Math.floor(Math.random() * 30)

    const billId = uuidv4()
    const totalCost = baseE * 0.56 + baseG * 2.8 + baseW * 5.0 + baseH * 0.35

    const insertBill = db.prepare('INSERT INTO bills (id, room_id, month, total_electricity, total_gas, total_water, total_heating, total_cost, rule) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    insertBill.run(billId, roomId, monthStr, baseE, baseG, baseW, baseH, Math.round(totalCost * 100) / 100, 'per_capita')

    const dbResidents = db.prepare('SELECT id, area FROM residents WHERE room_id = ?').all(roomId) as { id: string; area: number }[]
    const totalArea = dbResidents.reduce((s, r) => s + r.area, 0)
    const perCapita = totalCost / dbResidents.length

    const insertSplit = db.prepare('INSERT INTO bill_splits (id, bill_id, resident_id, amount, is_paid) VALUES (?, ?, ?, ?, ?)')
    for (const res of dbResidents) {
      const amt = i > 1 ? Math.round(perCapita * 100) / 100 : Math.round((totalCost * res.area / totalArea) * 100) / 100
      insertSplit.run(uuidv4(), billId, res.id, amt, i < 4 ? 1 : 0)
    }
  }

  const dbResidents = db.prepare('SELECT id FROM residents WHERE room_id = ?').all(roomId) as { id: string }[]
  const insertReading = db.prepare('INSERT INTO readings (id, room_id, resident_id, electricity, gas, water, heating, recorded_at, delta_electricity, delta_gas, delta_water, delta_heating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')

  let prevE = 1000, prevG = 500, prevW = 200, prevH = 100
  for (let i = 30; i >= 0; i -= 7) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString()

    const e = prevE + 20 + Math.floor(Math.random() * 30)
    const g = prevG + 5 + Math.floor(Math.random() * 10)
    const w = prevW + 3 + Math.floor(Math.random() * 5)
    const h = prevH + 8 + Math.floor(Math.random() * 12)

    insertReading.run(
      uuidv4(), roomId, dbResidents[Math.floor(Math.random() * dbResidents.length)].id,
      e, g, w, h, dateStr,
      e - prevE, g - prevG, w - prevW, h - prevH
    )
    prevE = e; prevG = g; prevW = w; prevH = h
  }
}

export default db
