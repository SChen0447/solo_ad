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

export interface IngredientConsumption {
  flour: number
  eggs: number
}

export const getConsumption = (size: CakeSize, _flavor: CakeFlavor): IngredientConsumption => {
  const consumptionMap: Record<CakeSize, IngredientConsumption> = {
    '6寸': { flour: 150, eggs: 3 },
    '8寸': { flour: 220, eggs: 4 },
    '10寸': { flour: 300, eggs: 5 }
  }
  return consumptionMap[size]
}

const now = Date.now()

export const initialOrders: Order[] = [
  {
    id: 'ord-001',
    customerName: '小明妈妈',
    flavor: '巧克力',
    size: '8寸',
    creamType: '淡奶油',
    decorationText: '生日快乐',
    pattern: '卡通动物',
    createdAt: new Date(now - 5 * 60 * 1000).toISOString(),
    status: 'pending',
    notes: ''
  },
  {
    id: 'ord-002',
    customerName: '张女士',
    flavor: '原味',
    size: '6寸',
    creamType: '奶油霜',
    decorationText: 'LOVE',
    pattern: '花朵',
    createdAt: new Date(now - 30 * 60 * 1000).toISOString(),
    status: 'making',
    notes: '需要写字用粉色奶油'
  },
  {
    id: 'ord-003',
    customerName: '李先生',
    flavor: '抹茶',
    size: '10寸',
    creamType: '乳酪',
    decorationText: '祝妈妈身体健康',
    pattern: '简约几何',
    createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    notes: '已取货'
  },
  {
    id: 'ord-004',
    customerName: '王小姐',
    flavor: '红丝绒',
    size: '8寸',
    creamType: '淡奶油',
    decorationText: '永远18岁',
    pattern: '数字蜡烛',
    createdAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    notes: ''
  },
  {
    id: 'ord-005',
    customerName: '陈先生',
    flavor: '巧克力',
    size: '6寸',
    creamType: '奶油霜',
    decorationText: '恭喜发财',
    pattern: '卡通动物',
    createdAt: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    notes: '下午3点取'
  },
  {
    id: 'ord-006',
    customerName: '刘女士',
    flavor: '原味',
    size: '8寸',
    creamType: '乳酪',
    decorationText: '宝宝满月',
    pattern: '花朵',
    createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    notes: ''
  }
]

export const initialInventory: InventoryItem[] = [
  {
    id: 'inv-001',
    name: '面粉',
    quantity: 5.2,
    unit: 'kg',
    safeThreshold: 2,
    lastRestockDate: '2026-06-10'
  },
  {
    id: 'inv-002',
    name: '鸡蛋',
    quantity: 48,
    unit: '个',
    safeThreshold: 30,
    lastRestockDate: '2026-06-15'
  },
  {
    id: 'inv-003',
    name: '淡奶油',
    quantity: 2.5,
    unit: 'L',
    safeThreshold: 1.5,
    lastRestockDate: '2026-06-12'
  },
  {
    id: 'inv-004',
    name: '奶油霜',
    quantity: 1.2,
    unit: 'kg',
    safeThreshold: 0.5,
    lastRestockDate: '2026-06-08'
  },
  {
    id: 'inv-005',
    name: '乳酪',
    quantity: 0.8,
    unit: 'kg',
    safeThreshold: 0.5,
    lastRestockDate: '2026-06-14'
  },
  {
    id: 'inv-006',
    name: '巧克力',
    quantity: 0.6,
    unit: 'kg',
    safeThreshold: 0.8,
    lastRestockDate: '2026-06-05'
  },
  {
    id: 'inv-007',
    name: '抹茶粉',
    quantity: 0.2,
    unit: 'kg',
    safeThreshold: 0.15,
    lastRestockDate: '2026-06-01'
  },
  {
    id: 'inv-008',
    name: '红曲粉',
    quantity: 0.08,
    unit: 'kg',
    safeThreshold: 0.1,
    lastRestockDate: '2026-05-28'
  }
]

export const initialRestockRecords: RestockRecord[] = [
  { id: 'rs-001', date: '2026-06-15', itemName: '鸡蛋', quantity: 60, supplier: '绿源农场' },
  { id: 'rs-002', date: '2026-06-14', itemName: '乳酪', quantity: 1, supplier: '荷兰乳品' },
  { id: 'rs-003', date: '2026-06-12', itemName: '淡奶油', quantity: 3, supplier: '安佳乳品' },
  { id: 'rs-004', date: '2026-06-10', itemName: '面粉', quantity: 5, supplier: '金像面粉' },
  { id: 'rs-005', date: '2026-06-08', itemName: '奶油霜', quantity: 1.5, supplier: '焙乐道' },
  { id: 'rs-006', date: '2026-06-05', itemName: '巧克力', quantity: 1, supplier: '可可百利' },
  { id: 'rs-007', date: '2026-06-01', itemName: '抹茶粉', quantity: 0.3, supplier: '宇治抹茶' },
  { id: 'rs-008', date: '2026-05-28', itemName: '红曲粉', quantity: 0.15, supplier: '古田红曲' },
  { id: 'rs-009', date: '2026-05-20', itemName: '面粉', quantity: 5, supplier: '金像面粉' },
  { id: 'rs-010', date: '2026-05-15', itemName: '鸡蛋', quantity: 60, supplier: '绿源农场' },
  { id: 'rs-011', date: '2026-05-10', itemName: '淡奶油', quantity: 2, supplier: '安佳乳品' }
]
