export interface Product {
  id: string
  name: string
  price: number
  stock: number
  description: string
  imageUrl: string
  createdAt: string
}

export interface Order {
  id: string
  productId: string
  productName: string
  productImage: string
  quantity: number
  totalPrice: number
  status: 'pending' | 'paid' | 'shipping' | 'completed'
  createdAt: string
}

export interface StatsSummary {
  todayRevenue: number
  monthOrders: number
  totalProducts: number
}

export interface SalesTrendItem {
  date: string
  revenue: number
  orders: number
}

export type TabType = 'products' | 'orders' | 'dashboard'
