import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, 'data')
const ordersFile = path.join(dataDir, 'orders.json')
const productsFile = path.join(dataDir, 'products.json')
const notificationsFile = path.join(dataDir, 'notifications.json')

function readJSON<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
}

function writeJSON<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// GET /api/orders
app.get('/api/orders', (req: Request, res: Response): void => {
  const orders = readJSON<any[]>(ordersFile)
  let result = [...orders]
  const { status, keyword } = req.query
  if (status) {
    result = result.filter(o => o.status === status)
  }
  if (keyword) {
    const kw = String(keyword).toLowerCase()
    result = result.filter(
      o => o.orderNo.toLowerCase().includes(kw) || o.userName.toLowerCase().includes(kw)
    )
  }
  res.json({ success: true, data: result })
})

// GET /api/orders/stats/today
app.get('/api/orders/stats/today', (_req: Request, res: Response): void => {
  const orders = readJSON<any[]>(ordersFile)
  const today = new Date().toISOString().slice(0, 10)
  const todayOrders = orders.filter(o => o.createdAt.slice(0, 10) === today)
  const total = todayOrders.length
  const pending = todayOrders.filter(o => o.status === 'pending').length
  const sorted = todayOrders.filter(o => o.status === 'sorted').length
  const completed = todayOrders.filter(o => o.status === 'completed').length
  const revenue = todayOrders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.totalAmount, 0)
  res.json({ success: true, data: { total, pending, sorted, completed, revenue } })
})

// PUT /api/orders/:id/status
app.put('/api/orders/:id/status', (req: Request, res: Response): void => {
  const orders = readJSON<any[]>(ordersFile)
  const { id } = req.params
  const { status } = req.body
  const idx = orders.findIndex(o => o.id === id)
  if (idx === -1) {
    res.status(404).json({ success: false, error: 'Order not found' })
    return
  }
  orders[idx].status = status
  writeJSON(ordersFile, orders)
  res.json({ success: true, data: orders[idx] })
})

// GET /api/products
app.get('/api/products', (req: Request, res: Response): void => {
  const products = readJSON<any[]>(productsFile)
  let result = [...products]
  const { category } = req.query
  if (category) {
    result = result.filter(p => p.category === category)
  }
  res.json({ success: true, data: result })
})

// POST /api/products
app.post('/api/products', (req: Request, res: Response): void => {
  const products = readJSON<any[]>(productsFile)
  const { name, category, price, stock } = req.body
  const newProduct = {
    id: uuidv4(),
    name,
    category,
    price,
    stock,
  }
  products.push(newProduct)
  writeJSON(productsFile, products)
  res.json({ success: true, data: newProduct })
})

// PUT /api/products/:id
app.put('/api/products/:id', (req: Request, res: Response): void => {
  const products = readJSON<any[]>(productsFile)
  const { id } = req.params
  const idx = products.findIndex(p => p.id === id)
  if (idx === -1) {
    res.status(404).json({ success: false, error: 'Product not found' })
    return
  }
  const { name, category, price, stock } = req.body
  if (name !== undefined) products[idx].name = name
  if (category !== undefined) products[idx].category = category
  if (price !== undefined) products[idx].price = price
  if (stock !== undefined) products[idx].stock = stock
  writeJSON(productsFile, products)
  res.json({ success: true, data: products[idx] })
})

// DELETE /api/products/:id
app.delete('/api/products/:id', (req: Request, res: Response): void => {
  const products = readJSON<any[]>(productsFile)
  const { id } = req.params
  const idx = products.findIndex(p => p.id === id)
  if (idx === -1) {
    res.status(404).json({ success: false, error: 'Product not found' })
    return
  }
  const removed = products.splice(idx, 1)
  writeJSON(productsFile, products)
  res.json({ success: true, data: removed[0] })
})

// GET /api/sort/list
app.get('/api/sort/list', (_req: Request, res: Response): void => {
  const orders = readJSON<any[]>(ordersFile)
  const sortOrders = orders.filter(o => o.status === 'paid' || o.status === 'sorted')
  const productMap = new Map<string, { productId: string; productName: string; category: string; totalQuantity: number; sources: { userName: string; quantity: number; checked: boolean }[] }>()

  for (const order of sortOrders) {
    for (const item of order.items) {
      const existing = productMap.get(item.productId)
      const source = { userName: order.userName, quantity: item.quantity, checked: false }
      if (existing) {
        existing.totalQuantity += item.quantity
        existing.sources.push(source)
      } else {
        productMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          category: item.category || '',
          totalQuantity: item.quantity,
          sources: [source],
        })
      }
    }
  }

  res.json({ success: true, data: Array.from(productMap.values()) })
})

// PUT /api/sort/check
app.put('/api/sort/check', (req: Request, res: Response): void => {
  const { productId, userName, checked } = req.body
  const sortList = readJSON<any[]>(ordersFile)
  const orders = sortOrders_forSort(sortList)
  const productMap = buildSortMap(orders)
  const item = productMap.get(productId)
  if (!item) {
    res.status(404).json({ success: false, error: 'Product not found in sort list' })
    return
  }
  const source = item.sources.find(s => s.userName === userName)
  if (!source) {
    res.status(404).json({ success: false, error: 'User source not found' })
    return
  }
  source.checked = checked
  res.json({ success: true, data: item })
})

function sortOrders_forSort(orders: any[]): any[] {
  return orders.filter(o => o.status === 'paid' || o.status === 'sorted')
}

function buildSortMap(orders: any[]): Map<string, { productId: string; productName: string; category: string; totalQuantity: number; sources: { userName: string; quantity: number; checked: boolean }[] }> {
  const productMap = new Map<string, { productId: string; productName: string; category: string; totalQuantity: number; sources: { userName: string; quantity: number; checked: boolean }[] }>()
  for (const order of orders) {
    for (const item of order.items) {
      const existing = productMap.get(item.productId)
      const source = { userName: order.userName, quantity: item.quantity, checked: false }
      if (existing) {
        existing.totalQuantity += item.quantity
        existing.sources.push(source)
      } else {
        productMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          category: item.category || '',
          totalQuantity: item.quantity,
          sources: [source],
        })
      }
    }
  }
  return productMap
}

// POST /api/sort/complete
app.post('/api/sort/complete', (_req: Request, res: Response): void => {
  const orders = readJSON<any[]>(ordersFile)
  for (const order of orders) {
    if (order.status === 'paid' || order.status === 'sorted') {
      order.status = 'sorted'
    }
  }
  writeJSON(ordersFile, orders)
  res.json({ success: true, message: 'All orders marked as sorted' })
})

// GET /api/stats/trend
app.get('/api/stats/trend', (_req: Request, res: Response): void => {
  const orders = readJSON<any[]>(ordersFile)
  const trend: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const count = orders.filter(o => o.createdAt.slice(0, 10) === dateStr).length
    trend.push({ date: dateStr, count })
  }
  res.json({ success: true, data: trend })
})

// GET /api/stats/top-products
app.get('/api/stats/top-products', (_req: Request, res: Response): void => {
  const orders = readJSON<any[]>(ordersFile)
  const productMap = new Map<string, { productId: string; productName: string; totalQuantity: number }>()
  for (const order of orders) {
    for (const item of order.items) {
      const existing = productMap.get(item.productId)
      if (existing) {
        existing.totalQuantity += item.quantity
      } else {
        productMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          totalQuantity: item.quantity,
        })
      }
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 10)
  res.json({ success: true, data: topProducts })
})

// GET /api/stats/category-distribution
app.get('/api/stats/category-distribution', (_req: Request, res: Response): void => {
  const orders = readJSON<any[]>(ordersFile)
  const products = readJSON<any[]>(productsFile)
  const categoryMap = new Map<string, number>()
  for (const order of orders) {
    for (const item of order.items) {
      const product = products.find(p => p.id === item.productId)
      const category = product ? product.category : '未分类'
      categoryMap.set(category, (categoryMap.get(category) || 0) + item.quantity)
    }
  }
  const distribution = Array.from(categoryMap.entries()).map(([category, count]) => ({
    category,
    count,
  }))
  res.json({ success: true, data: distribution })
})

// GET /api/notifications
app.get('/api/notifications', (_req: Request, res: Response): void => {
  const notifications = readJSON<any[]>(notificationsFile)
  res.json({ success: true, data: notifications })
})

// PUT /api/notifications/:id/read
app.put('/api/notifications/:id/read', (req: Request, res: Response): void => {
  const notifications = readJSON<any[]>(notificationsFile)
  const { id } = req.params
  const idx = notifications.findIndex(n => n.id === id)
  if (idx === -1) {
    res.status(404).json({ success: false, error: 'Notification not found' })
    return
  }
  notifications[idx].read = true
  writeJSON(notificationsFile, notifications)
  res.json({ success: true, data: notifications[idx] })
})

// GET /api/notifications/unread-count
app.get('/api/notifications/unread-count', (_req: Request, res: Response): void => {
  const notifications = readJSON<any[]>(notificationsFile)
  const count = notifications.filter(n => !n.read).length
  res.json({ success: true, data: { count } })
})

// health
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

// error handler middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
