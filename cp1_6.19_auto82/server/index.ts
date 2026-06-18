import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import {
  initialOrders,
  initialInventory,
  initialRestockRecords,
  getConsumption,
  type Order,
  type OrderStatus,
  type InventoryItem,
  type RestockRecord,
  type CakeFlavor,
  type CakeSize
} from './data'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

let orders: Order[] = [...initialOrders]
let inventory: InventoryItem[] = [...initialInventory]
let restockRecords: RestockRecord[] = [...initialRestockRecords]

// Orders API
app.get('/api/orders', (_req, res) => {
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  res.json(sortedOrders)
})

app.get('/api/orders/:id', (req, res) => {
  const order = orders.find((o) => o.id === req.params.id)
  if (!order) {
    res.status(404).json({ error: '订单不存在' })
    return
  }
  res.json(order)
})

app.post('/api/orders', (req, res) => {
  const {
    customerName,
    flavor,
    size,
    creamType,
    decorationText,
    pattern,
    customImage
  } = req.body

  const newOrder: Order = {
    id: `ord-${uuidv4().slice(0, 8)}`,
    customerName,
    flavor,
    size,
    creamType,
    decorationText: decorationText.slice(0, 12),
    pattern,
    customImage,
    createdAt: new Date().toISOString(),
    status: 'pending',
    notes: ''
  }

  orders.unshift(newOrder)
  res.status(201).json(newOrder)
})

app.put('/api/orders/:id/status', (req, res) => {
  const { status } = req.body as { status: OrderStatus }
  const orderIndex = orders.findIndex((o) => o.id === req.params.id)

  if (orderIndex === -1) {
    res.status(404).json({ error: '订单不存在' })
    return
  }

  const order = orders[orderIndex]
  const prevStatus = order.status

  if (prevStatus === 'pending' && status === 'making') {
    const consumption = getConsumption(order.size as CakeSize, order.flavor as CakeFlavor)
    const flourItem = inventory.find((i) => i.name === '面粉')
    const eggItem = inventory.find((i) => i.name === '鸡蛋')

    if (flourItem) {
      flourItem.quantity = Math.max(0, flourItem.quantity - consumption.flour / 1000)
    }
    if (eggItem) {
      eggItem.quantity = Math.max(0, eggItem.quantity - consumption.eggs)
    }
  }

  orders[orderIndex] = { ...order, status }
  res.json(orders[orderIndex])
})

app.put('/api/orders/:id/notes', (req, res) => {
  const { notes } = req.body
  const orderIndex = orders.findIndex((o) => o.id === req.params.id)

  if (orderIndex === -1) {
    res.status(404).json({ error: '订单不存在' })
    return
  }

  orders[orderIndex] = { ...orders[orderIndex], notes }
  res.json(orders[orderIndex])
})

// Inventory API
app.get('/api/inventory', (_req, res) => {
  res.json(inventory)
})

app.get('/api/restock-records', (_req, res) => {
  const sorted = [...restockRecords]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
  res.json(sorted)
})

// Dashboard / Statistics API
app.get('/api/stats/weekly-orders', (_req, res) => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const weeklyData = dayNames.map((name, index) => {
    const dayStart = new Date(monday)
    dayStart.setDate(monday.getDate() + index)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayStart.getDate() + 1)

    const count = orders.filter((o) => {
      const orderDate = new Date(o.createdAt)
      return orderDate >= dayStart && orderDate < dayEnd && o.status !== 'cancelled'
    }).length

    return { day: name, orders: count }
  })

  res.json(weeklyData)
})

app.get('/api/stats/flavor-distribution', (_req, res) => {
  const flavors: CakeFlavor[] = ['原味', '巧克力', '抹茶', '红丝绒']
  const flavorColors: Record<CakeFlavor, string> = {
    '原味': '#ffa502',
    '巧克力': '#2ed573',
    '抹茶': '#1e90ff',
    '红丝绒': '#ff6b6b'
  }

  const distribution = flavors.map((flavor) => {
    const count = orders.filter((o) => o.flavor === flavor && o.status !== 'cancelled').length
    return { name: flavor, value: count, color: flavorColors[flavor] }
  })

  res.json(distribution)
})

app.get('/api/stats/low-stock', (_req, res) => {
  const lowStockItems = inventory.filter((item) => item.quantity < item.safeThreshold)
  res.json(lowStockItems)
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
