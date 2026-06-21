export type OrderStatus = 'pending' | 'in_production' | 'ready_to_ship' | 'completed'
export type WorkOrderStatus = 'waiting_material' | 'in_progress' | 'completed'
export type WorkOrderPriority = 'high' | 'normal'

export interface Order {
  id: string
  customer: string
  product: string
  quantity: number
  amount: number
  deadline: string
  status: OrderStatus
  createdAt: string
}

export interface Material {
  id: string
  name: string
  category: string
  stock: number
  safetyStock: number
  unit: string
  supplier: string
  lastPurchaseDate?: string
}

export interface WorkOrder {
  id: string
  orderId: string
  startTime: string
  estimatedEndTime: string
  priority: WorkOrderPriority
  status: WorkOrderStatus
  logs: string[]
}

export interface Shipment {
  id: string
  orderId: string
  estimatedShipDate: string
  address: string
  completed: boolean
}

export interface Stats {
  todayOrders: number
  pendingWorkOrders: number
  lowStockCount: number
  pendingShipments: number
  orderTrend: number[]
  completionTrend: number[]
  last7Days: string[]
}
