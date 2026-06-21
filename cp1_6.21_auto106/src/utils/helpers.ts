import { useState, useEffect } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import type { InventoryItem, Category } from '../../shared/types'
import { CATEGORIES, CATEGORY_COLORS } from '../../shared/types'

export { CATEGORIES, CATEGORY_COLORS }
export type { InventoryItem, Category }

export function getDaysRemaining(expiryDate: string): number {
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return differenceInCalendarDays(expiry, today)
}

export type ExpiryStatus = 'expired' | 'warning' | 'normal'

export function getExpiryStatus(days: number): ExpiryStatus {
  if (days < 0) return 'expired'
  if (days <= 3) return 'warning'
  return 'normal'
}

export function getStatusColor(status: ExpiryStatus): string {
  switch (status) {
    case 'expired':
      return '#E74C3C'
    case 'warning':
      return '#F39C12'
    case 'normal':
      return '#27AE60'
  }
}

export function getCategoryColor(category: Category): string {
  return CATEGORY_COLORS[category] || '#D3D3D3'
}

export function formatDaysText(days: number): string {
  if (days < 0) return `已过期 ${Math.abs(days)} 天`
  if (days === 0) return '今日到期'
  return `剩 ${days} 天`
}

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
