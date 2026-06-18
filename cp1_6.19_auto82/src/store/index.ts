import { create } from 'zustand'
import type {
  Order,
  OrderStatus,
  InventoryItem,
  RestockRecord,
  WeeklyOrderData,
  FlavorDistribution,
  CakeFlavor,
  CakeSize,
  CreamType,
  PatternType
} from '../types'

interface OrderStore {
  orders: Order[]
  loading: boolean
  fetchOrders: () => Promise<void>
  addOrder: (data: {
    customerName: string
    flavor: CakeFlavor
    size: CakeSize
    creamType: CreamType
    decorationText: string
    pattern: PatternType
    customImage?: string
  }) => Promise<Order | null>
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<Order | null>
  updateOrderNotes: (id: string, notes: string) => Promise<Order | null>
  getOrderById: (id: string) => Order | undefined
}

interface InventoryStore {
  inventory: InventoryItem[]
  restockRecords: RestockRecord[]
  loading: boolean
  fetchInventory: () => Promise<void>
  fetchRestockRecords: () => Promise<void>
}

interface StatsStore {
  weeklyOrders: WeeklyOrderData[]
  flavorDistribution: FlavorDistribution[]
  lowStockItems: InventoryItem[]
  loading: boolean
  fetchStats: () => Promise<void>
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  loading: false,

  fetchOrders: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/orders')
      const data = await res.json()
      set({ orders: data, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  addOrder: async (data) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const newOrder = await res.json()
      set((state) => ({ orders: [newOrder, ...state.orders] }))
      return newOrder
    } catch {
      return null
    }
  },

  updateOrderStatus: async (id, status) => {
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const updatedOrder = await res.json()
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? updatedOrder : o))
      }))
      return updatedOrder
    } catch {
      return null
    }
  },

  updateOrderNotes: async (id, notes) => {
    try {
      const res = await fetch(`/api/orders/${id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })
      const updatedOrder = await res.json()
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? updatedOrder : o))
      }))
      return updatedOrder
    } catch {
      return null
    }
  },

  getOrderById: (id) => {
    return get().orders.find((o) => o.id === id)
  }
}))

export const useInventoryStore = create<InventoryStore>((set) => ({
  inventory: [],
  restockRecords: [],
  loading: false,

  fetchInventory: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/inventory')
      const data = await res.json()
      set({ inventory: data, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  fetchRestockRecords: async () => {
    try {
      const res = await fetch('/api/restock-records')
      const data = await res.json()
      set({ restockRecords: data })
    } catch {
      // ignore
    }
  }
}))

export const useStatsStore = create<StatsStore>((set) => ({
  weeklyOrders: [],
  flavorDistribution: [],
  lowStockItems: [],
  loading: false,

  fetchStats: async () => {
    set({ loading: true })
    try {
      const [weeklyRes, flavorRes, lowStockRes] = await Promise.all([
        fetch('/api/stats/weekly-orders'),
        fetch('/api/stats/flavor-distribution'),
        fetch('/api/stats/low-stock')
      ])
      const [weeklyData, flavorData, lowStockData] = await Promise.all([
        weeklyRes.json(),
        flavorRes.json(),
        lowStockRes.json()
      ])
      set({
        weeklyOrders: weeklyData,
        flavorDistribution: flavorData,
        lowStockItems: lowStockData,
        loading: false
      })
    } catch {
      set({ loading: false })
    }
  }
}))
