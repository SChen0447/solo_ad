import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const DATA_DIR = path.join(__dirname, 'data')
const SHIFTS_FILE = path.join(DATA_DIR, 'shifts.json')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json')

app.use(cors())
app.use(bodyParser.json())

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readJSON<T>(file: string, defaultValue: T): T {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2), 'utf-8')
    return defaultValue
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T
  } catch {
    return defaultValue
  }
}

function writeJSON<T>(file: string, data: T): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

type ShiftType = 'morning' | 'afternoon' | 'evening'

interface Shift {
  id: string
  employeeId: string
  employeeName: string
  shiftType: ShiftType
  date: string
  note?: string
}

interface Order {
  id: string
  customerName: string
  bouquetName: string
  purchaseDate: string
  quote: string
  isFavorite: boolean
}

interface Employee {
  id: string
  name: string
}

const defaultEmployees: Employee[] = [
  { id: uuidv4(), name: '小美' },
  { id: uuidv4(), name: '阿琳' },
  { id: uuidv4(), name: '莉莉' },
  { id: uuidv4(), name: '晓雯' }
]

const warmQuotes = [
  '愿这束花为你的每一天都带来芬芳与阳光~ 🌸',
  '感谢你选择花语轩，愿美好常伴你左右！',
  '一束花，一份心意，愿你被温柔以待。',
  '花开有时，情意无限，感谢你的信任！',
  '愿你的生活如花般灿烂，如蜜般甘甜 🌺',
  '每一朵花都承载着我们最真挚的祝福~',
  '感谢遇见，愿花香常驻你心间 💐',
  '把阳光和美好打包送给你，希望你喜欢！',
  '花语传情，感谢你成为我们的贵客~',
  '愿你的每一天都像盛开的花朵一样美丽 ✨'
]

function getRandomQuote(): string {
  return warmQuotes[Math.floor(Math.random() * warmQuotes.length)]
}

const today = new Date()
function daysFromNow(n: number): string {
  const d = new Date(today)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function seedData(): void {
  const employees = readJSON<Employee[]>(EMPLOYEES_FILE, defaultEmployees)

  const defaultShifts: Shift[] = [
    { id: uuidv4(), employeeId: employees[0].id, employeeName: employees[0].name, shiftType: 'morning', date: daysFromNow(0), note: '整理新到货的玫瑰' },
    { id: uuidv4(), employeeId: employees[1].id, employeeName: employees[1].name, shiftType: 'afternoon', date: daysFromNow(0) },
    { id: uuidv4(), employeeId: employees[2].id, employeeName: employees[2].name, shiftType: 'evening', date: daysFromNow(0), note: '盘点库存' },
    { id: uuidv4(), employeeId: employees[0].id, employeeName: employees[0].name, shiftType: 'morning', date: daysFromNow(1) },
    { id: uuidv4(), employeeId: employees[3].id, employeeName: employees[3].name, shiftType: 'afternoon', date: daysFromNow(2), note: '大型婚礼花束订单' },
    { id: uuidv4(), employeeId: employees[1].id, employeeName: employees[1].name, shiftType: 'morning', date: daysFromNow(3) }
  ]

  const defaultOrders: Order[] = [
    { id: uuidv4(), customerName: '张女士', bouquetName: '浪漫红玫瑰花束', purchaseDate: daysFromNow(-3), quote: getRandomQuote(), isFavorite: true },
    { id: uuidv4(), customerName: '李先生', bouquetName: '向日葵阳光花篮', purchaseDate: daysFromNow(-2), quote: getRandomQuote(), isFavorite: false },
    { id: uuidv4(), customerName: '王小姐', bouquetName: '粉色满天星花束', purchaseDate: daysFromNow(-1), quote: getRandomQuote(), isFavorite: false },
    { id: uuidv4(), customerName: '陈阿姨', bouquetName: '康乃馨温馨礼盒', purchaseDate: daysFromNow(0), quote: getRandomQuote(), isFavorite: false },
    { id: uuidv4(), customerName: '林先生', bouquetName: '白百合纯洁花束', purchaseDate: daysFromNow(0), quote: getRandomQuote(), isFavorite: true }
  ]

  readJSON<Shift[]>(SHIFTS_FILE, defaultShifts)
  readJSON<Order[]>(ORDERS_FILE, defaultOrders)
}

seedData()

// ========== Employee Routes ==========
app.get('/api/employees', (_req, res) => {
  const employees = readJSON<Employee[]>(EMPLOYEES_FILE, [])
  res.json(employees)
})

// ========== Shift Routes ==========
app.get('/api/shifts', (_req, res) => {
  const shifts = readJSON<Shift[]>(SHIFTS_FILE, [])
  res.json(shifts)
})

app.post('/api/shifts', (req, res) => {
  const shifts = readJSON<Shift[]>(SHIFTS_FILE, [])
  const newShift: Shift = {
    id: uuidv4(),
    employeeId: req.body.employeeId,
    employeeName: req.body.employeeName,
    shiftType: req.body.shiftType,
    date: req.body.date,
    note: req.body.note
  }
  shifts.push(newShift)
  writeJSON(SHIFTS_FILE, shifts)
  res.status(201).json(newShift)
})

app.put('/api/shifts/:id', (req, res) => {
  const shifts = readJSON<Shift[]>(SHIFTS_FILE, [])
  const idx = shifts.findIndex(s => s.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: 'Shift not found' })
    return
  }
  shifts[idx] = {
    ...shifts[idx],
    employeeId: req.body.employeeId,
    employeeName: req.body.employeeName,
    shiftType: req.body.shiftType,
    date: req.body.date,
    note: req.body.note
  }
  writeJSON(SHIFTS_FILE, shifts)
  res.json(shifts[idx])
})

app.delete('/api/shifts/:id', (req, res) => {
  const shifts = readJSON<Shift[]>(SHIFTS_FILE, [])
  const filtered = shifts.filter(s => s.id !== req.params.id)
  if (filtered.length === shifts.length) {
    res.status(404).json({ error: 'Shift not found' })
    return
  }
  writeJSON(SHIFTS_FILE, filtered)
  res.status(204).send()
})

// ========== Order Routes ==========
app.get('/api/orders', (_req, res) => {
  const orders = readJSON<Order[]>(ORDERS_FILE, [])
  res.json(orders)
})

app.post('/api/orders', (req, res) => {
  const orders = readJSON<Order[]>(ORDERS_FILE, [])
  const newOrder: Order = {
    id: uuidv4(),
    customerName: req.body.customerName,
    bouquetName: req.body.bouquetName,
    purchaseDate: req.body.purchaseDate || new Date().toISOString().split('T')[0],
    quote: req.body.quote || getRandomQuote(),
    isFavorite: false
  }
  orders.push(newOrder)
  writeJSON(ORDERS_FILE, orders)
  res.status(201).json(newOrder)
})

app.put('/api/orders/:id', (req, res) => {
  const orders = readJSON<Order[]>(ORDERS_FILE, [])
  const idx = orders.findIndex(o => o.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: 'Order not found' })
    return
  }
  orders[idx] = { ...orders[idx], ...req.body }
  writeJSON(ORDERS_FILE, orders)
  res.json(orders[idx])
})

app.patch('/api/orders/:id/favorite', (req, res) => {
  const orders = readJSON<Order[]>(ORDERS_FILE, [])
  const idx = orders.findIndex(o => o.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: 'Order not found' })
    return
  }
  orders[idx].isFavorite = req.body.isFavorite ?? !orders[idx].isFavorite
  writeJSON(ORDERS_FILE, orders)
  res.json(orders[idx])
})

app.delete('/api/orders/:id', (req, res) => {
  const orders = readJSON<Order[]>(ORDERS_FILE, [])
  const filtered = orders.filter(o => o.id !== req.params.id)
  if (filtered.length === orders.length) {
    res.status(404).json({ error: 'Order not found' })
    return
  }
  writeJSON(ORDERS_FILE, filtered)
  res.status(204).send()
})

app.listen(PORT, () => {
  console.log(`🌸 Flower Shop Server running on http://localhost:${PORT}`)
})
