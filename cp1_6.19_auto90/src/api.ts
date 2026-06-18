import axios from 'axios'
import {
  Merchant,
  CouponTemplate,
  CouponInstance,
  RedemptionRecord,
  Stats,
  CouponType,
} from './store'

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
})

export interface CreateCouponParams {
  merchantId: string
  merchantName?: string
  faceValue: number
  threshold: number
  validFrom: string
  validTo: string
  stock: number
  type: CouponType
}

export const merchantApi = {
  getAll: async (): Promise<Merchant[]> => {
    const res = await api.get('/merchants')
    return res.data
  },
}

export const couponApi = {
  create: async (params: CreateCouponParams) => {
    const res = await api.post('/coupons', params)
    return res.data
  },
  getTemplates: async (): Promise<CouponTemplate[]> => {
    const res = await api.get('/coupons/templates')
    return res.data
  },
  getAvailable: async (customerId: string = 'default-customer'): Promise<CouponTemplate[]> => {
    const res = await api.get('/coupons/available', { params: { customerId } })
    return res.data
  },
  claim: async (templateId: string, customerId: string = 'default-customer'): Promise<{ instance: CouponInstance }> => {
    const res = await api.post('/coupons/claim', { templateId, customerId })
    return res.data
  },
  getMine: async (customerId: string = 'default-customer'): Promise<CouponInstance[]> => {
    const res = await api.get('/coupons/mine', { params: { customerId } })
    return res.data
  },
  redeem: async (code: string): Promise<{ success: boolean; record: RedemptionRecord; coupon: CouponInstance }> => {
    const res = await api.post('/coupons/redeem', { code })
    return res.data
  },
  getByCode: async (code: string): Promise<CouponInstance> => {
    const res = await api.get(`/coupons/code/${code}`)
    return res.data
  },
}

export const redemptionApi = {
  getAll: async (): Promise<RedemptionRecord[]> => {
    const res = await api.get('/redemptions')
    return res.data
  },
}

export const statsApi = {
  get: async (): Promise<Stats> => {
    const res = await api.get('/stats')
    return res.data
  },
}
