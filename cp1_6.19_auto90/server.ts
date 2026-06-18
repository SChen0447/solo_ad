import express, { Request, Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { v4 as uuidv4 } from 'uuid'
import { format, differenceInDays, startOfDay, addDays, subDays, isWithinInterval, parseISO } from 'date-fns'

const app = express()
const PORT = 3001

app.use(cors())
app.use(cookieParser())
app.use(express.json())

type CouponType = 'general' | 'category' | 'newCustomer'

interface CouponTemplate {
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
}

interface CouponInstance {
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
}

interface RedemptionRecord {
  id: string
  couponInstanceId: string
  templateId: string
  merchantId: string
  merchantName: string
  faceValue: number
  code: string
  redeemedAt: string
}

interface Merchant {
  id: string
  name: string
}

const merchants: Merchant[] = [
  { id: 'm1', name: '示例商家A' },
  { id: 'm2', name: '示例商家B' },
]

const couponTemplates: CouponTemplate[] = []
const couponInstances: CouponInstance[] = []
const redemptionRecords: RedemptionRecord[] = []
const claimedMap: Map<string, Set<string>> = new Map()

const generateUniqueCode = (): string => {
  let code = ''
  let attempts = 0
  const maxAttempts = 10000
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString()
    attempts++
  } while (couponInstances.some((c) => c.code === code) && attempts < maxAttempts)
  return code
}

app.get('/api/merchants', (_req: Request, res: Response) => {
  res.json(merchants)
})

app.post('/api/coupons', (req: Request, res: Response) => {
  try {
    const {
      merchantId,
      merchantName,
      faceValue,
      threshold,
      validFrom,
      validTo,
      stock,
      type,
    } = req.body

    if (!merchantId || !faceValue || !validFrom || !validTo || !stock || !type) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    const fv = Number(faceValue)
    const th = Number(threshold) || 0
    const st = Number(stock)

    if (fv < 1 || fv > 1000) {
      return res.status(400).json({ error: '面额范围必须在1-1000元之间' })
    }
    if (st < 1 || st > 1000) {
      return res.status(400).json({ error: '库存数量必须在1-1000之间' })
    }

    const templateId = uuidv4()
    const now = new Date().toISOString()

    const template: CouponTemplate = {
      id: templateId,
      merchantId,
      merchantName: merchantName || merchants.find((m) => m.id === merchantId)?.name || '未知商家',
      faceValue: fv,
      threshold: th,
      validFrom,
      validTo,
      stock: st,
      initialStock: st,
      type,
      createdAt: now,
    }

    couponTemplates.push(template)

    for (let i = 0; i < st; i++) {
      const instance: CouponInstance = {
        id: uuidv4(),
        templateId,
        merchantId,
        merchantName: template.merchantName,
        faceValue: fv,
        threshold: th,
        validFrom,
        validTo,
        type,
        code: generateUniqueCode(),
        customerId: null,
        claimedAt: null,
        redeemed: false,
        redeemedAt: null,
      }
      couponInstances.push(instance)
    }

    res.status(201).json({ template, instancesCreated: st })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

app.get('/api/coupons/templates', (_req: Request, res: Response) => {
  const result = couponTemplates.map((t) => {
    const claimed = couponInstances.filter((c) => c.templateId === t.id && c.customerId !== null).length
    const redeemed = couponInstances.filter((c) => c.templateId === t.id && c.redeemed).length
    return { ...t, claimedCount: claimed, redeemedCount: redeemed, remainingStock: t.stock }
  })
  res.json(result)
})

app.get('/api/coupons/available', (req: Request, res: Response) => {
  const customerId = req.query.customerId as string || 'default-customer'
  const now = new Date()

  const available: (CouponTemplate & { available: boolean; alreadyClaimed: boolean; validDays: number })[] = []

  for (const t of couponTemplates) {
    if (t.stock <= 0) continue

    const validFrom = parseISO(t.validFrom)
    const validTo = parseISO(t.validTo)

    if (now > validTo) continue

    const alreadyClaimed = claimedMap.get(t.id)?.has(customerId) || false
    const validDays = Math.max(0, differenceInDays(validTo, startOfDay(now)) + 1)

    available.push({
      ...t,
      available: !alreadyClaimed,
      alreadyClaimed,
      validDays,
    })
  }

  res.json(available)
})

app.post('/api/coupons/claim', (req: Request, res: Response) => {
  try {
    const { templateId, customerId = 'default-customer' } = req.body

    if (!templateId) {
      return res.status(400).json({ error: '缺少优惠券ID' })
    }

    const template = couponTemplates.find((t) => t.id === templateId)
    if (!template) {
      return res.status(404).json({ error: '优惠券不存在' })
    }

    if (template.stock <= 0) {
      return res.status(400).json({ error: '库存不足' })
    }

    if (!claimedMap.has(templateId)) {
      claimedMap.set(templateId, new Set())
    }
    if (claimedMap.get(templateId)!.has(customerId)) {
      return res.status(400).json({ error: '您已领取过该优惠券' })
    }

    const instance = couponInstances.find(
      (c) => c.templateId === templateId && c.customerId === null
    )
    if (!instance) {
      return res.status(400).json({ error: '无可用优惠券' })
    }

    instance.customerId = customerId
    instance.claimedAt = new Date().toISOString()
    template.stock -= 1
    claimedMap.get(templateId)!.add(customerId)

    res.json({ instance })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

app.get('/api/coupons/mine', (req: Request, res: Response) => {
  const customerId = req.query.customerId as string || 'default-customer'
  const myCoupons = couponInstances
    .filter((c) => c.customerId === customerId)
    .map((c) => {
      const now = new Date()
      const validFrom = parseISO(c.validFrom)
      const validTo = parseISO(c.validTo)
      const isExpired = now > validTo
      const isValid = now >= validFrom && now <= validTo
      const validDays = Math.max(0, differenceInDays(validTo, startOfDay(now)) + 1)
      return { ...c, isExpired, isValid, validDays }
    })
    .sort((a, b) => {
      if (a.redeemed !== b.redeemed) return a.redeemed ? 1 : -1
      if (a.isExpired !== b.isExpired) return a.isExpired ? 1 : -1
      return new Date(b.claimedAt || '').getTime() - new Date(a.claimedAt || '').getTime()
    })
  res.json(myCoupons)
})

app.post('/api/coupons/redeem', (req: Request, res: Response) => {
  try {
    const { code } = req.body

    if (!code || !/^\d{4}$/.test(code)) {
      return res.status(400).json({ error: '请输入4位核销码' })
    }

    const instance = couponInstances.find((c) => c.code === code)
    if (!instance) {
      return res.status(404).json({ error: '优惠券不存在' })
    }

    if (instance.redeemed) {
      return res.status(400).json({ error: '该优惠券已被核销' })
    }

    const now = new Date()
    const validFrom = parseISO(instance.validFrom)
    const validTo = parseISO(instance.validTo)

    if (now < validFrom) {
      return res.status(400).json({ error: `该优惠券尚未生效，生效日期：${format(validFrom, 'yyyy-MM-dd')}` })
    }

    if (now > validTo) {
      return res.status(400).json({ error: '该优惠券已过期' })
    }

    instance.redeemed = true
    instance.redeemedAt = now.toISOString()

    const record: RedemptionRecord = {
      id: uuidv4(),
      couponInstanceId: instance.id,
      templateId: instance.templateId,
      merchantId: instance.merchantId,
      merchantName: instance.merchantName,
      faceValue: instance.faceValue,
      code: instance.code,
      redeemedAt: instance.redeemedAt,
    }
    redemptionRecords.push(record)

    res.json({ success: true, record, coupon: instance })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

app.get('/api/redemptions', (_req: Request, res: Response) => {
  res.json(redemptionRecords)
})

app.get('/api/stats', (_req: Request, res: Response) => {
  const totalTemplates = couponTemplates.length
  const totalClaimed = couponInstances.filter((c) => c.customerId !== null).length
  const totalRedeemed = redemptionRecords.length
  const redemptionRate = totalClaimed > 0 ? (totalRedeemed / totalClaimed) * 100 : 0

  const dailyRedeem: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const day = startOfDay(subDays(new Date(), i))
    const dayEnd = addDays(day, 1)
    const count = redemptionRecords.filter((r) => {
      const t = new Date(r.redeemedAt)
      return t >= day && t < dayEnd
    }).length
    dailyRedeem.push({
      date: format(day, 'MM-dd'),
      count,
    })
  }

  const totalCreated = couponInstances.length

  res.json({
    totalCreated,
    totalTemplates,
    totalClaimed,
    totalRedeemed,
    redemptionRate: Number(redemptionRate.toFixed(1)),
    dailyRedeem,
  })
})

app.get('/api/coupons/code/:code', (req: Request, res: Response) => {
  const { code } = req.params
  const instance = couponInstances.find((c) => c.code === code)
  if (!instance) {
    return res.status(404).json({ error: '优惠券不存在' })
  }
  const now = new Date()
  const validFrom = parseISO(instance.validFrom)
  const validTo = parseISO(instance.validTo)
  res.json({
    ...instance,
    isExpired: now > validTo,
    isValid: now >= validFrom && now <= validTo,
  })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
