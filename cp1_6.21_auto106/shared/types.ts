export type Category = '蔬菜' | '水果' | '肉类' | '乳制品' | '调味品' | '饮料' | '其他'

export interface InventoryItem {
  id: string
  name: string
  category: Category
  quantity: number
  unit: string
  purchaseDate: string
  expiryDate: string
  handled: boolean
}

export interface Recipe {
  id: string
  name: string
  ingredients: { name: string; required: boolean }[]
  steps: string[]
}

export const CATEGORIES: Category[] = ['蔬菜', '水果', '肉类', '乳制品', '调味品', '饮料', '其他']

export const CATEGORY_COLORS: Record<Category, string> = {
  '蔬菜': '#8FBC8F',
  '水果': '#FFB347',
  '肉类': '#E8A0A0',
  '乳制品': '#FFF8E7',
  '调味品': '#D2B48C',
  '饮料': '#87CEEB',
  '其他': '#D3D3D3'
}
