export type OrderStatus = 'pending' | 'making' | 'completed' | 'cancelled'

export type CakeFlavor = '原味' | '巧克力' | '抹茶' | '红丝绒'
export type CakeSize = '6寸' | '8寸' | '10寸'
export type CreamType = '淡奶油' | '奶油霜' | '乳酪'
export type PatternType = '数字蜡烛' | '花朵' | '卡通动物' | '简约几何'

export interface Order {
  id: string
  customerName: string
  flavor: CakeFlavor
  size: CakeSize
  creamType: CreamType
  decorationText: string
  pattern: PatternType
  customImage?: string
  createdAt: string
  status: OrderStatus
  notes: string
}

export interface InventoryItem {
  id: string
  name: string
  quantity: number
  unit: string
  safeThreshold: number
  lastRestockDate: string
}

export interface RestockRecord {
  id: string
  date: string
  itemName: string
  quantity: number
  supplier: string
}

export interface WeeklyOrderData {
  day: string
  orders: number
}

export interface FlavorDistribution {
  name: string
  value: number
  color: string
}

export const statusColors: Record<OrderStatus, string> = {
  pending: '#ffa502',
  making: '#2ed573',
  completed: '#747d8c',
  cancelled: '#ff4757'
}

export const statusLabels: Record<OrderStatus, string> = {
  pending: '待处理',
  making: '制作中',
  completed: '已完成',
  cancelled: '已取消'
}
