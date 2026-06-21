import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

type OrderStatus = 'pending' | 'in_production' | 'ready_to_ship' | 'completed'
type WorkOrderStatus = 'waiting_material' | 'in_progress' | 'completed'
type WorkOrderPriority = 'high' | 'normal'

interface Order {
  id: string
  customer: string
  product: string
  quantity: number
  amount: number
  deadline: string
  status: OrderStatus
  createdAt: string
}

interface Material {
  id: string
  name: string
  category: string
  stock: number
  safetyStock: number
  unit: string
  supplier: string
  lastPurchaseDate?: string
}

interface WorkOrder {
  id: string
  orderId: string
  startTime: string
  estimatedEndTime: string
  priority: WorkOrderPriority
  status: WorkOrderStatus
  logs: string[]
}

interface Shipment {
  id: string
  orderId: string
  estimatedShipDate: string
  address: string
  completed: boolean
}

const addresses = [
  '北京市朝阳区建国路88号',
  '上海市浦东新区陆家嘴环路1000号',
  '广州市天河区珠江新城花城大道10号',
  '深圳市南山区科技园南区高新南一道',
  '杭州市西湖区文三路90号',
  '成都市武侯区天府大道北段1700号',
  '南京市鼓楼区中山北路30号',
  '武汉市江汉区解放大道688号',
]

function randomAddress(): string {
  return addresses[Math.floor(Math.random() * addresses.length)]
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

const now = new Date()

const orders: Order[] = [
  { id: uuidv4(), customer: '张先生', product: '手工皮具钱包', quantity: 5, amount: 1500, deadline: formatDate(addDays(now, 3)), status: 'pending', createdAt: formatDate(addDays(now, -2)) },
  { id: uuidv4(), customer: '李女士', product: '陶瓷花瓶', quantity: 10, amount: 800, deadline: formatDate(addDays(now, 5)), status: 'pending', createdAt: formatDate(addDays(now, -1)) },
  { id: uuidv4(), customer: '王先生', product: '木雕摆件', quantity: 3, amount: 2400, deadline: formatDate(addDays(now, 4)), status: 'pending', createdAt: formatDate(addDays(now, -1)) },
  { id: uuidv4(), customer: '赵女士', product: '手工香薰蜡烛', quantity: 20, amount: 600, deadline: formatDate(addDays(now, 2)), status: 'in_production', createdAt: formatDate(addDays(now, -3)) },
  { id: uuidv4(), customer: '陈先生', product: '编织篮', quantity: 8, amount: 1200, deadline: formatDate(addDays(now, 3)), status: 'in_production', createdAt: formatDate(addDays(now, -2)) },
  { id: uuidv4(), customer: '刘女士', product: '手工皮具手包', quantity: 6, amount: 1800, deadline: formatDate(addDays(now, 1)), status: 'in_production', createdAt: formatDate(addDays(now, -4)) },
  { id: uuidv4(), customer: '孙先生', product: '手工银饰吊坠', quantity: 4, amount: 3200, deadline: formatDate(addDays(now, -1)), status: 'ready_to_ship', createdAt: formatDate(addDays(now, -6)) },
  { id: uuidv4(), customer: '周女士', product: '刺绣抱枕', quantity: 12, amount: 960, deadline: formatDate(addDays(now, 0)), status: 'ready_to_ship', createdAt: formatDate(addDays(now, -5)) },
  { id: uuidv4(), customer: '吴先生', product: '手工皂礼盒', quantity: 15, amount: 750, deadline: formatDate(addDays(now, -3)), status: 'completed', createdAt: formatDate(addDays(now, -7)) },
  { id: uuidv4(), customer: '郑女士', product: '蜡染围巾', quantity: 7, amount: 1050, deadline: formatDate(addDays(now, -2)), status: 'completed', createdAt: formatDate(addDays(now, -8)) },
]

const materials: Material[] = [
  { id: uuidv4(), name: '头层牛皮', category: '皮具原料', stock: 30, safetyStock: 20, unit: '平方英尺', supplier: '温州皮具供应商' },
  { id: uuidv4(), name: '高岭土', category: '陶瓷原料', stock: 8, safetyStock: 15, unit: '公斤', supplier: '景德镇陶艺材料' },
  { id: uuidv4(), name: '椴木板材', category: '木工原料', stock: 12, safetyStock: 10, unit: '块', supplier: '东北木材厂' },
  { id: uuidv4(), name: '大豆蜡', category: '蜡烛原料', stock: 5, safetyStock: 10, unit: '公斤', supplier: '广东蜡材贸易' },
  { id: uuidv4(), name: '棉线', category: '编织原料', stock: 50, safetyStock: 20, unit: '卷', supplier: '义乌纺织批发' },
  { id: uuidv4(), name: '925银料', category: '银饰原料', stock: 3, safetyStock: 5, unit: '克', supplier: '深圳银饰材料' },
  { id: uuidv4(), name: '刺绣丝线', category: '刺绣原料', stock: 40, safetyStock: 15, unit: '卷', supplier: '苏州刺绣用品' },
  { id: uuidv4(), name: '植物精油', category: '香薰原料', stock: 4, safetyStock: 8, unit: '毫升', supplier: '云南精油工坊' },
  { id: uuidv4(), name: '靛蓝染料', category: '蜡染原料', stock: 6, safetyStock: 10, unit: '包', supplier: '贵州蜡染材料' },
  { id: uuidv4(), name: '皂基', category: '手工皂原料', stock: 15, safetyStock: 12, unit: '公斤', supplier: '广州日化原料' },
]

const inProdOrders = orders.filter(o => o.status === 'in_production')

const workOrders: WorkOrder[] = [
  {
    id: uuidv4(),
    orderId: inProdOrders[0].id,
    startTime: formatDate(addDays(now, -1)) + 'T09:00',
    estimatedEndTime: formatDate(addDays(now, 1)) + 'T18:00',
    priority: 'normal',
    status: 'waiting_material',
    logs: [`${formatDate(addDays(now, -1))} 09:00 - 工单创建，等待大豆蜡物料补充`],
  },
  {
    id: uuidv4(),
    orderId: inProdOrders[1].id,
    startTime: formatDate(addDays(now, -2)) + 'T10:00',
    estimatedEndTime: formatDate(addDays(now, 2)) + 'T17:00',
    priority: 'high',
    status: 'in_progress',
    logs: [`${formatDate(addDays(now, -2))} 10:00 - 工单创建，物料充足，开始生产`],
  },
  {
    id: uuidv4(),
    orderId: inProdOrders[2].id,
    startTime: formatDate(addDays(now, -3)) + 'T08:00',
    estimatedEndTime: formatDate(addDays(now, 1)) + 'T20:00',
    priority: 'high',
    status: 'in_progress',
    logs: [`${formatDate(addDays(now, -3))} 08:00 - 工单创建，物料充足，开始生产`],
  },
  {
    id: uuidv4(),
    orderId: orders[0].id,
    startTime: formatDate(addDays(now, 1)) + 'T09:00',
    estimatedEndTime: formatDate(addDays(now, 4)) + 'T18:00',
    priority: 'high',
    status: 'waiting_material',
    logs: [`${formatDate(addDays(now, 0))} - 预排程：等待头层牛皮物料补充`],
  },
  {
    id: uuidv4(),
    orderId: orders[1].id,
    startTime: formatDate(addDays(now, 2)) + 'T09:00',
    estimatedEndTime: formatDate(addDays(now, 6)) + 'T18:00',
    priority: 'normal',
    status: 'waiting_material',
    logs: [`${formatDate(addDays(now, 0))} - 预排程：等待高岭土物料补充`],
  },
]

const readyOrders = orders.filter(o => o.status === 'ready_to_ship')

const shipments: Shipment[] = [
  { id: uuidv4(), orderId: readyOrders[0].id, estimatedShipDate: formatDate(addDays(now, 1)), address: randomAddress(), completed: false },
  { id: uuidv4(), orderId: readyOrders[1].id, estimatedShipDate: formatDate(addDays(now, 0)), address: randomAddress(), completed: false },
  { id: uuidv4(), orderId: orders.find(o => o.status === 'in_production' && o.amount > 1000)!.id, estimatedShipDate: formatDate(addDays(now, 3)), address: randomAddress(), completed: false },
]

function checkMaterialAvailability(): boolean {
  const lowStock = materials.filter(m => m.stock < m.safetyStock)
  return lowStock.length === 0
}

function generateWorkOrder(order: Order): WorkOrder {
  const priority: WorkOrderPriority = order.amount > 1000 ? 'high' : 'normal'
  const hoursNeeded = order.quantity
  const startTime = new Date()
  const estimatedEndTime = new Date(startTime.getTime() + hoursNeeded * 3600000)
  const materialOk = checkMaterialAvailability()
  const status: WorkOrderStatus = materialOk ? 'in_progress' : 'waiting_material'
  const logMsg = materialOk
    ? `${formatDate(startTime)} - 工单创建，物料充足，开始生产`
    : `${formatDate(startTime)} - 工单创建，物料不足，等待补充`

  const wo: WorkOrder = {
    id: uuidv4(),
    orderId: order.id,
    startTime: startTime.toISOString().slice(0, 16).replace('T', ' '),
    estimatedEndTime: estimatedEndTime.toISOString().slice(0, 16).replace('T', ' '),
    priority,
    status,
    logs: [logMsg],
  }
  workOrders.push(wo)
  return wo
}

function generateShipment(order: Order): Shipment {
  const shipDate = new Date(order.deadline)
  const s: Shipment = {
    id: uuidv4(),
    orderId: order.id,
    estimatedShipDate: formatDate(shipDate),
    address: randomAddress(),
    completed: false,
  }
  shipments.push(s)
  return s
}

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/api/orders', (_req: Request, res: Response) => {
  res.json(orders)
})

app.post('/api/orders', (req: Request, res: Response) => {
  const { customer, product, quantity, amount, deadline } = req.body
  if (!customer || !product || !quantity || !amount || !deadline) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }
  const order: Order = {
    id: uuidv4(),
    customer,
    product,
    quantity: Number(quantity),
    amount: Number(amount),
    deadline,
    status: 'pending',
    createdAt: formatDate(new Date()),
  }
  orders.push(order)

  const lowMaterials = materials.filter(m => m.stock < m.safetyStock)
  const warning = lowMaterials.length > 0
    ? { materialWarning: true, lowStockItems: lowMaterials.map(m => m.name) }
    : { materialWarning: false }

  res.json({ order, ...warning })
})

app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
  const { id } = req.params
  const { status } = req.body
  const order = orders.find(o => o.id === id)
  if (!order) {
    res.status(404).json({ error: 'Order not found' })
    return
  }
  const oldStatus = order.status
  order.status = status as OrderStatus

  if (status === 'in_production' && oldStatus === 'pending') {
    const wo = generateWorkOrder(order)
    res.json({ order, workOrder: wo })
    return
  }

  if (status === 'ready_to_ship' && oldStatus === 'in_production') {
    const relatedWo = workOrders.find(w => w.orderId === order.id && w.status !== 'completed')
    if (relatedWo) {
      relatedWo.status = 'completed'
      relatedWo.logs.push(`${formatDate(new Date())} - 生产完成，工单关闭`)
    }
    const shipment = generateShipment(order)
    res.json({ order, shipment })
    return
  }

  res.json({ order })
})

app.get('/api/materials', (_req: Request, res: Response) => {
  res.json(materials)
})

app.post('/api/materials/:id/purchase', (req: Request, res: Response) => {
  const { id } = req.params
  const { quantity } = req.body
  const material = materials.find(m => m.id === id)
  if (!material) {
    res.status(404).json({ error: 'Material not found' })
    return
  }
  material.stock += Number(quantity) || 1
  material.lastPurchaseDate = formatDate(new Date())

  const waitingWos = workOrders.filter(wo => wo.status === 'waiting_material')
  if (checkMaterialAvailability()) {
    for (const wo of waitingWos) {
      wo.status = 'in_progress'
      wo.logs.push(`${formatDate(new Date())} - 物料补充完成，开始生产`)
    }
  }

  res.json({ material, updatedWorkOrders: waitingWos.filter(wo => wo.status === 'in_progress') })
})

app.get('/api/workorders', (_req: Request, res: Response) => {
  res.json(workOrders)
})

app.get('/api/workorders/:id', (req: Request, res: Response) => {
  const wo = workOrders.find(w => w.id === req.params.id)
  if (!wo) {
    res.status(404).json({ error: 'Work order not found' })
    return
  }
  const order = orders.find(o => o.id === wo.orderId)
  res.json({ workOrder: wo, order: order || null })
})

app.get('/api/shipments', (_req: Request, res: Response) => {
  res.json(shipments)
})

app.post('/api/shipments/:id/complete', (req: Request, res: Response) => {
  const { id } = req.params
  const shipment = shipments.find(s => s.id === id)
  if (!shipment) {
    res.status(404).json({ error: 'Shipment not found' })
    return
  }
  shipment.completed = true
  const order = orders.find(o => o.id === shipment.orderId)
  if (order) {
    order.status = 'completed'
  }
  res.json({ shipment, order })
})

app.get('/api/stats', (_req: Request, res: Response) => {
  const today = formatDate(new Date())
  const todayOrders = orders.filter(o => o.createdAt === today).length
  const pendingWorkOrders = workOrders.filter(w => w.status === 'waiting_material' || w.status === 'in_progress').length
  const lowStockCount = materials.filter(m => m.stock < m.safetyStock).length
  const pendingShipments = shipments.filter(s => !s.completed).length

  const last7Days: string[] = []
  for (let i = 6; i >= 0; i--) {
    last7Days.push(formatDate(addDays(new Date(), -i)))
  }

  const orderTrend = last7Days.map(d => orders.filter(o => o.createdAt === d).length)
  const completionTrend = last7Days.map(d => orders.filter(o => o.status === 'completed' && o.deadline === d).length)

  res.json({
    todayOrders,
    pendingWorkOrders,
    lowStockCount,
    pendingShipments,
    orderTrend,
    completionTrend,
    last7Days,
  })
})

app.use('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
