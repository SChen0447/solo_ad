import { create } from 'zustand'

export type CouponType = 'general' | 'category' | 'newCustomer'

export interface Merchant {
  id: string
  name: string
}

export interface CouponTemplate {
  id: string
  merchantId: string
  merchantName: string
  faceValue: number
  threshold: number
  validFrom: string
  validTo: string
  stock: number
  initialStock: number
  type: CouponType
  createdAt: string
  claimedCount?: number
  redeemedCount?: number
  remainingStock?: number
  available?: boolean
  alreadyClaimed?: boolean
  validDays?: number
}

export interface CouponInstance {
  id: string
  templateId: string
  merchantId: string
  merchantName: string
  faceValue: number
  threshold: number
  validFrom: string
  validTo: string
  type: CouponType
  code: string
  customerId: string | null
  claimedAt: string | null
  redeemed: boolean
  redeemedAt: string | null
  isExpired?: boolean
  isValid?: boolean
  validDays?: number
}

export interface RedemptionRecord {
  id: string
  couponInstanceId: string
  templateId: string
  merchantId: string
  merchantName: string
  faceValue: number
  code: string
  redeemedAt: string
}

export interface Stats {
  totalCreated: number
  totalTemplates: number
  totalClaimed: number
  totalRedeemed: number
  redemptionRate: number
  dailyRedeem: { date: string; count: number }[]
}

interface AppState {
  merchants: Merchant[]
  templates: CouponTemplate[]
  availableCoupons: CouponTemplate[]
  myCoupons: CouponInstance[]
  redemptions: RedemptionRecord[]
  stats: Stats | null
  customerId: string
  errorMessage: string | null
  setErrorMessage: (msg: string | null) => void
  setMerchants: (m: Merchant[]) => void
  setTemplates: (t: CouponTemplate[]) => void
  setAvailableCoupons: (c: CouponTemplate[]) => void
  setMyCoupons: (c: CouponInstance[]) => void
  setRedemptions: (r: RedemptionRecord[]) => void
  setStats: (s: Stats) => void
}

const defaultStats: Stats = {
  totalCreated: 0,
  totalTemplates: 0,
  totalClaimed: 0,
  totalRedeemed: 0,
  redemptionRate: 0,
  dailyRedeem: [],
}

export const useAppStore = create<AppState>((set) => ({
  merchants: [],
  templates: [],
  availableCoupons: [],
  myCoupons: [],
  redemptions: [],
  stats: null,
  customerId: 'default-customer',
  errorMessage: null,
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  setMerchants: (m) => set({ merchants: m }),
  setTemplates: (t) => set({ templates: t }),
  setAvailableCoupons: (c) => set({ availableCoupons: c }),
  setMyCoupons: (c) => set({ myCoupons: c }),
  setRedemptions: (r) => set({ redemptions: r }),
  setStats: (s) => set({ stats: s }),
}))

export const getTypeColor = (type: CouponType): string => {
  switch (type) {
    case 'general':
      return '#42a5f5'
    case 'category':
      return '#ffa726'
    case 'newCustomer':
      return '#66bb6a'
    default:
      return '#42a5f5'
  }
}

export const getTypeLabel = (type: CouponType): string => {
  switch (type) {
    case 'general':
      return '通用券'
    case 'category':
      return '品类券'
    case 'newCustomer':
      return '新客券'
    default:
      return '通用券'
  }
}
