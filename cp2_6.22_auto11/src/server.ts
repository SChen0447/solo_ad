import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 4200

app.use(cors())
app.use(express.json())

interface Product {
  id: string
  name: string
  price: number
  stock: number
  description: string
  imageUrl: string
  createdAt: string
}

interface Order {
  id: string
  productId: string
  productName: string
  productImage: string
  quantity: number
  totalPrice: number
  status: 'pending' | 'paid' | 'shipping' | 'completed'
  createdAt: string
}

interface SalesData {
  date: string
  revenue: number
  orders: number
}

let products: Product[] = [
  {
    id: '1',
    name: '手工陶瓷花瓶',
    price: 128,
    stock: 15,
    description: '手工制作的精美陶瓷花瓶，独特的纹理设计',
    imageUrl: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=400',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: '2',
    name: '手绘帆布包',
    price: 89,
    stock: 32,
    description: '原创手绘设计帆布包，环保又时尚',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400',
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: '3',
    name: '木质香薰蜡烛',
    price: 68,
    stock: 50,
    description: '天然大豆蜡，木质烛芯，多种香型可选',
    imageUrl: 'https://images.unsplash.com/photo-1602607461155-06dd8d0e4f25?w=400',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: '4',
    name: '编织草帽',
    price: 156,
    stock: 20,
    description: '手工编织夏季草帽，遮阳又百搭',
    imageUrl: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=400',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: '5',
    name: '复古皮革钱包',
    price: 299,
    stock: 12,
    description: '头层牛皮手工缝制，复古风格设计',
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: '6',
    name: '植物染色丝巾',
    price: 188,
    stock: 25,
    description: '天然植物染料，桑蚕丝材质',
    imageUrl: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '7',
    name: '手工银饰耳环',
    price: 168,
    stock: 40,
    description: '925纯银手工打造，简约百搭款式',
    imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: '8',
    name: '原创插画明信片',
    price: 35,
    stock: 100,
    description: '原创水彩插画明信片，一套10张',
    imageUrl: 'https://images.unsplash.com/photo-1531050873004-7ca390a82b8c?w=400',
    createdAt: new Date().toISOString(),
  },
]

let orders: Order[] = []

const statuses: Array<'pending' | 'paid' | 'shipping' | 'completed'> = ['pending', 'paid', 'shipping', 'completed']
for (let i = 0; i < 15; i++) {
  const product = products[i % products.length]
  const quantity = Math.floor(Math.random() * 3) + 1
  const daysAgo = Math.floor(Math.random() * 7)
  orders.push({
    id: uuidv4(),
    productId: product.id,
    productName: product.name,
    productImage: product.imageUrl,
    quantity,
    totalPrice: product.price * quantity,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    createdAt: new Date(Date.now() - 86400000 * daysAgo - Math.random() * 86400000).toISOString(),
  })
}

app.get('/api/products', (req, res) => {
  res.json(products)
})

app.post('/api/products', (req, res) => {
  const { name, price, stock, description, imageUrl } = req.body
  if (!name || price === undefined || stock === undefined) {
    return res.status(400).json({ error: '商品名称、价格和库存为必填项' })
  }
  const newProduct: Product = {
    id: uuidv4(),
    name,
    price: Number(price),
    stock: Number(stock),
    description: description || '',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    createdAt: new Date().toISOString(),
  }
  products.unshift(newProduct)
  res.status(201).json(newProduct)
})

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params
  const productIndex = products.findIndex(p => p.id === id)
  if (productIndex === -1) {
    return res.status(404).json({ error: '商品不存在' })
  }
  const { name, price, stock, description, imageUrl } = req.body
  products[productIndex] = {
    ...products[productIndex],
    name: name || products[productIndex].name,
    price: price !== undefined ? Number(price) : products[productIndex].price,
    stock: stock !== undefined ? Number(stock) : products[productIndex].stock,
    description: description !== undefined ? description : products[productIndex].description,
    imageUrl: imageUrl || products[productIndex].imageUrl,
  }
  res.json(products[productIndex])
})

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params
  const productIndex = products.findIndex(p => p.id === id)
  if (productIndex === -1) {
    return res.status(404).json({ error: '商品不存在' })
  }
  products.splice(productIndex, 1)
  res.json({ message: '删除成功' })
})

app.get('/api/orders', (req, res) => {
  const sortedOrders = [...orders].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  res.json(sortedOrders)
})

app.post('/api/orders', (req, res) => {
  const { productId, quantity } = req.body
  const product = products.find(p => p.id === productId)
  if (!product) {
    return res.status(404).json({ error: '商品不存在' })
  }
  const qty = Number(quantity) || 1
  if (qty > product.stock) {
    return res.status(400).json({ error: '库存不足' })
  }
  const newOrder: Order = {
    id: uuidv4(),
    productId: product.id,
    productName: product.name,
    productImage: product.imageUrl,
    quantity: qty,
    totalPrice: product.price * qty,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  product.stock -= qty
  orders.unshift(newOrder)
  res.status(201).json(newOrder)
})

app.patch('/api/orders/:id/status', (req, res) => {
  const { id } = req.params
  const { status } = req.body
  const orderIndex = orders.findIndex(o => o.id === id)
  if (orderIndex === -1) {
    return res.status(404).json({ error: '订单不存在' })
  }
  if (!['pending', 'paid', 'shipping', 'completed'].includes(status)) {
    return res.status(400).json({ error: '无效的订单状态' })
  }
  orders[orderIndex].status = status
  res.json(orders[orderIndex])
})

app.get('/api/stats/summary', (req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  let todayRevenue = 0
  let todayOrders = 0
  let monthOrders = 0
  
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  orders.forEach(order => {
    const orderDate = new Date(order.createdAt)
    if (orderDate >= today) {
      todayRevenue += order.totalPrice
      todayOrders++
    }
    if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
      monthOrders++
    }
  })
  
  res.json({
    todayRevenue,
    monthOrders,
    totalProducts: products.length,
  })
})

app.get('/api/stats/sales-trend', (req, res) => {
  const salesData: SalesData[] = []
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    
    let revenue = 0
    let orderCount = 0
    
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt)
      if (orderDate >= date && orderDate < nextDate) {
        revenue += order.totalPrice
        orderCount++
      }
    })
    
    salesData.push({
      date: date.toISOString().split('T')[0],
      revenue,
      orders: orderCount,
    })
  }
  
  res.json(salesData)
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})

export default app
