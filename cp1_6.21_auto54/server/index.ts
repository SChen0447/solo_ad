import express, { Request, Response } from 'express'
import cors from 'cors'
import {
  loadData,
  saveData,
  generateId,
  generateInviteCode,
  findGroupById,
  findGroupByInviteCode,
  updateGroup,
  calculateSplitAmount,
  getDaysUntilPayment,
  calculateMemberRemainingDays,
  Group,
  Subscription,
  Member,
  PaymentRecord,
  MemberSubscriptionStatus,
  SubscriptionStatus,
  SubscriptionCategory,
} from './data'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

let saveTimer: NodeJS.Timeout | null = null

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const data = loadData()
    saveData(data)
  }, 5000)
}

interface CreateGroupRequest {
  name: string
  creatorName: string
}

app.post('/api/groups', (req: Request<{}, {}, CreateGroupRequest>, res: Response) => {
  const { name, creatorName } = req.body
  
  if (!name || !creatorName) {
    return res.status(400).json({ error: '组名和创建者名称不能为空' })
  }
  
  const data = loadData()
  const groupId = generateId()
  const memberId = generateId()
  
  const newGroup: Group = {
    id: groupId,
    name,
    inviteCode: generateInviteCode(),
    createdAt: new Date().toISOString(),
    members: [
      {
        id: memberId,
        name: creatorName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${creatorName}`,
      },
    ],
    subscriptions: [],
  }
  
  data.groups.push(newGroup)
  scheduleSave()
  
  res.json({ groupId, inviteCode: newGroup.inviteCode, currentMemberId: memberId })
})

app.post('/api/groups/join', (req: Request<{}, {}, { inviteCode: string; memberName: string }>, res: Response) => {
  const { inviteCode, memberName } = req.body
  
  if (!inviteCode || !memberName) {
    return res.status(400).json({ error: '邀请码和成员名称不能为空' })
  }
  
  const group = findGroupByInviteCode(inviteCode.toUpperCase())
  if (!group) {
    return res.status(404).json({ error: '邀请码无效' })
  }
  
  const memberId = generateId()
  const updatedGroup = updateGroup(group.id, (g) => ({
    ...g,
    members: [
      ...g.members,
      {
        id: memberId,
        name: memberName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${memberName}`,
      },
    ],
  }))
  
  if (!updatedGroup) {
    return res.status(500).json({ error: '加入组失败' })
  }
  
  scheduleSave()
  res.json({ groupId: group.id, currentMemberId: memberId })
})

app.get('/api/groups/:groupId', (req: Request<{ groupId: string }>, res: Response) => {
  const group = findGroupById(req.params.groupId)
  if (!group) {
    return res.status(404).json({ error: '组不存在' })
  }
  
  const enrichedSubscriptions = group.subscriptions.map((sub) => ({
    ...sub,
    members: sub.members.map((m) => ({
      ...m,
      remainingDays: m.active && m.activatedDate
        ? calculateMemberRemainingDays(m.activatedDate, sub.paymentDay)
        : 0,
    })),
  }))
  
  res.json({ ...group, subscriptions: enrichedSubscriptions })
})

interface CreateSubscriptionRequest {
  name: string
  icon: string
  category: SubscriptionCategory
  monthlyFee: number
  paymentDay: number
  memberLimit: number
  reminderDays?: number
}

app.post(
  '/api/groups/:groupId/subscriptions',
  (req: Request<{ groupId: string }, {}, CreateSubscriptionRequest>, res: Response) => {
    const { groupId } = req.params
    const { name, icon, category, monthlyFee, paymentDay, memberLimit, reminderDays = 3 } = req.body
    
    if (!name || !icon || !category || monthlyFee <= 0 || paymentDay < 1 || paymentDay > 31 || memberLimit <= 0) {
      return res.status(400).json({ error: '参数不完整或无效' })
    }
    
    const group = findGroupById(groupId)
    if (!group) {
      return res.status(404).json({ error: '组不存在' })
    }
    
    const daysUntil = getDaysUntilPayment(paymentDay)
    let status: SubscriptionStatus = 'active'
    if (daysUntil <= reminderDays) status = 'expiring'
    
    const newSubscription: Subscription = {
      id: generateId(),
      name,
      icon,
      category,
      monthlyFee,
      paymentDay,
      memberLimit,
      status,
      reminderDays,
      members: group.members.map((m) => ({
        memberId: m.id,
        active: false,
        remainingDays: 0,
      })),
      paymentHistory: [],
    }
    
    const updatedGroup = updateGroup(groupId, (g) => ({
      ...g,
      subscriptions: [...g.subscriptions, newSubscription],
    }))
    
    scheduleSave()
    res.json(updatedGroup?.subscriptions.find((s) => s.id === newSubscription.id))
  }
)

app.put(
  '/api/groups/:groupId/subscriptions/:subscriptionId',
  (req: Request<{ groupId: string; subscriptionId: string }, {}, Partial<CreateSubscriptionRequest>>, res: Response) => {
    const { groupId, subscriptionId } = req.params
    const updates = req.body
    
    const updatedGroup = updateGroup(groupId, (g) => ({
      ...g,
      subscriptions: g.subscriptions.map((s) => {
        if (s.id !== subscriptionId) return s
        
        const paymentDay = updates.paymentDay ?? s.paymentDay
        const reminderDays = updates.reminderDays ?? s.reminderDays
        const daysUntil = getDaysUntilPayment(paymentDay)
        let status: SubscriptionStatus = s.status === 'paused' ? 'paused' : 'active'
        if (status === 'active' && daysUntil <= reminderDays) status = 'expiring'
        
        return { ...s, ...updates, paymentDay, reminderDays, status }
      }),
    }))
    
    if (!updatedGroup) {
      return res.status(404).json({ error: '组或订阅不存在' })
    }
    
    scheduleSave()
    res.json(updatedGroup.subscriptions.find((s) => s.id === subscriptionId))
  }
)

app.delete(
  '/api/groups/:groupId/subscriptions/:subscriptionId',
  (req: Request<{ groupId: string; subscriptionId: string }>, res: Response) => {
    const { groupId, subscriptionId } = req.params
    
    const updatedGroup = updateGroup(groupId, (g) => ({
      ...g,
      subscriptions: g.subscriptions.filter((s) => s.id !== subscriptionId),
    }))
    
    if (!updatedGroup) {
      return res.status(404).json({ error: '组不存在' })
    }
    
    scheduleSave()
    res.json({ success: true })
  }
)

interface AddPaymentRequest {
  subscriptionId: string
  amount: number
  payerId: string
  date?: string
}

app.post(
  '/api/groups/:groupId/payments',
  (req: Request<{ groupId: string }, {}, AddPaymentRequest>, res: Response) => {
    const { groupId } = req.params
    const { subscriptionId, amount, payerId, date = new Date().toISOString() } = req.body
    
    const group = findGroupById(groupId)
    if (!group) {
      return res.status(404).json({ error: '组不存在' })
    }
    
    const subscription = group.subscriptions.find((s) => s.id === subscriptionId)
    if (!subscription) {
      return res.status(404).json({ error: '订阅不存在' })
    }
    
    const activeMembers = subscription.members
      .filter((m) => m.active)
      .map((m) => {
        const member = group.members.find((mem) => mem.id === m.memberId)
        return { memberId: m.memberId, customRatio: member?.customRatio }
      })
    
    if (activeMembers.length === 0) {
      return res.status(400).json({ error: '没有激活的成员' })
    }
    
    const splitDetails = calculateSplitAmount(amount, activeMembers)
    const splitTotal = splitDetails.reduce((sum, d) => sum + d.amount, 0)
    if (splitDetails.length > 0) {
      splitDetails[0].amount += Math.round((amount - splitTotal) * 100) / 100
    }
    
    const paymentRecord: PaymentRecord = {
      id: generateId(),
      date,
      amount,
      payerId,
      subscriptionId,
      splitDetails,
    }
    
    const updatedGroup = updateGroup(groupId, (g) => ({
      ...g,
      subscriptions: g.subscriptions.map((s) => {
        if (s.id !== subscriptionId) return s
        return {
          ...s,
          status: 'active' as SubscriptionStatus,
          paymentHistory: [...s.paymentHistory, paymentRecord],
          members: s.members.map((m) =>
            m.active ? { ...m, activatedDate: date, remainingDays: 30 } : m
          ),
        }
      }),
    }))
    
    scheduleSave()
    res.json(paymentRecord)
  }
)

interface UpdateMemberStatusRequest {
  memberIds: string[]
  active: boolean
}

app.put(
  '/api/groups/:groupId/subscriptions/:subscriptionId/members',
  (req: Request<{ groupId: string; subscriptionId: string }, {}, UpdateMemberStatusRequest>, res: Response) => {
    const { groupId, subscriptionId } = req.params
    const { memberIds, active } = req.body
    
    const updatedGroup = updateGroup(groupId, (g) => ({
      ...g,
      subscriptions: g.subscriptions.map((s) => {
        if (s.id !== subscriptionId) return s
        return {
          ...s,
          members: s.members.map((m) => {
            if (!memberIds.includes(m.memberId)) return m
            return {
              ...m,
              active,
              activatedDate: active ? new Date().toISOString() : m.activatedDate,
              remainingDays: active ? 30 : 0,
            }
          }),
        }
      }),
    }))
    
    if (!updatedGroup) {
      return res.status(404).json({ error: '组不存在' })
    }
    
    scheduleSave()
    res.json({ success: true })
  }
)

app.get('/api/groups/:groupId/calculate-split', (req: Request<{ groupId: string }>, res: Response) => {
  const group = findGroupById(req.params.groupId)
  if (!group) {
    return res.status(404).json({ error: '组不存在' })
  }
  
  const memberPayments: Record<string, { shouldPay: number; paid: number }> = {}
  
  group.members.forEach((m) => {
    memberPayments[m.id] = { shouldPay: 0, paid: 0 }
  })
  
  group.subscriptions.forEach((sub) => {
    const activeMembers = sub.members
      .filter((m) => m.active)
      .map((m) => {
        const member = group.members.find((mem) => mem.id === m.memberId)
        return { memberId: m.memberId, customRatio: member?.customRatio }
      })
    
    if (activeMembers.length > 0) {
      const splitDetails = calculateSplitAmount(sub.monthlyFee, activeMembers)
      splitDetails.forEach((d) => {
        if (memberPayments[d.memberId]) {
          memberPayments[d.memberId].shouldPay += d.amount
        }
      })
    }
    
    sub.paymentHistory.forEach((p) => {
      if (memberPayments[p.payerId]) {
        memberPayments[p.payerId].paid += p.amount
      }
    })
  })
  
  const result = group.members.map((m) => ({
    memberId: m.id,
    name: m.name,
    shouldPay: Math.round(memberPayments[m.id].shouldPay * 100) / 100,
    paid: Math.round(memberPayments[m.id].paid * 100) / 100,
    balance: Math.round((memberPayments[m.id].paid - memberPayments[m.id].shouldPay) * 100) / 100,
  }))
  
  res.json(result)
})

app.get('/api/groups/:groupId/renewal-reminders', (req: Request<{ groupId: string }>, res: Response) => {
  const group = findGroupById(req.params.groupId)
  if (!group) {
    return res.status(404).json({ error: '组不存在' })
  }
  
  const reminders = group.subscriptions
    .filter((s) => s.status !== 'paused')
    .map((s) => {
      const daysUntil = getDaysUntilPayment(s.paymentDay)
      return {
        subscriptionId: s.id,
        name: s.name,
        icon: s.icon,
        daysUntil,
        reminderDays: s.reminderDays,
        monthlyFee: s.monthlyFee,
      }
    })
    .filter((r) => r.daysUntil <= r.reminderDays)
    .sort((a, b) => a.daysUntil - b.daysUntil)
  
  res.json(reminders)
})

app.post(
  '/api/groups/:groupId/subscriptions/:subscriptionId/renew',
  (req: Request<{ groupId: string; subscriptionId: string }, {}, { payerId: string }>, res: Response) => {
    const { groupId, subscriptionId } = req.params
    const { payerId } = req.body
    
    const group = findGroupById(groupId)
    if (!group) {
      return res.status(404).json({ error: '组不存在' })
    }
    
    const subscription = group.subscriptions.find((s) => s.id === subscriptionId)
    if (!subscription) {
      return res.status(404).json({ error: '订阅不存在' })
    }
    
    const activeMembers = subscription.members
      .filter((m) => m.active)
      .map((m) => {
        const member = group.members.find((mem) => mem.id === m.memberId)
        return { memberId: m.memberId, customRatio: member?.customRatio }
      })
    
    if (activeMembers.length === 0) {
      return res.status(400).json({ error: '没有激活的成员' })
    }
    
    const date = new Date().toISOString()
    const splitDetails = calculateSplitAmount(subscription.monthlyFee, activeMembers)
    const splitTotal = splitDetails.reduce((sum, d) => sum + d.amount, 0)
    if (splitDetails.length > 0) {
      splitDetails[0].amount += Math.round((subscription.monthlyFee - splitTotal) * 100) / 100
    }
    
    const paymentRecord: PaymentRecord = {
      id: generateId(),
      date,
      amount: subscription.monthlyFee,
      payerId,
      subscriptionId,
      splitDetails,
    }
    
    const updatedGroup = updateGroup(groupId, (g) => ({
      ...g,
      subscriptions: g.subscriptions.map((s) => {
        if (s.id !== subscriptionId) return s
        return {
          ...s,
          status: 'active' as SubscriptionStatus,
          paymentHistory: [...s.paymentHistory, paymentRecord],
          members: s.members.map((m) =>
            m.active ? { ...m, activatedDate: date, remainingDays: 30 } : m
          ),
        }
      }),
    }))
    
    scheduleSave()
    res.json(paymentRecord)
  }
)

app.get('/api/groups/:groupId/search', (req: Request<{ groupId: string }>, res: Response) => {
  const { q } = req.query
  const query = (q as string || '').toLowerCase()
  
  if (!query) {
    return res.json({ subscriptions: [], members: [] })
  }
  
  const group = findGroupById(req.params.groupId)
  if (!group) {
    return res.status(404).json({ error: '组不存在' })
  }
  
  const subscriptions = group.subscriptions
    .filter((s) => s.name.toLowerCase().includes(query))
    .map((s) => ({
      id: s.id,
      type: 'subscription' as const,
      name: s.name,
      icon: s.icon,
    }))
  
  const members = group.members
    .filter((m) => m.name.toLowerCase().includes(query))
    .map((m) => ({
      id: m.id,
      type: 'member' as const,
      name: m.name,
      avatar: m.avatar,
    }))
  
  res.json({ subscriptions, members })
})

app.get('/api/groups/:groupId/export', (req: Request<{ groupId: string }>, res: Response) => {
  const group = findGroupById(req.params.groupId)
  if (!group) {
    return res.status(404).json({ error: '组不存在' })
  }
  
  const monthlyData: Record<string, any[]> = {}
  
  group.subscriptions.forEach((sub) => {
    sub.paymentHistory.forEach((payment) => {
      const date = new Date(payment.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      const payer = group.members.find((m) => m.id === payment.payerId)
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = []
      }
      
      monthlyData[monthKey].push({
        subscription: sub.name,
        amount: payment.amount,
        payer: payer?.name || '未知',
        date: payment.date,
        splitDetails: payment.splitDetails.map((sd) => {
          const member = group.members.find((m) => m.id === sd.memberId)
          return {
            member: member?.name || '未知',
            amount: sd.amount,
          }
        }),
      })
    })
  })
  
  const exportData = {
    groupName: group.name,
    exportedAt: new Date().toISOString(),
    monthlyBills: Object.entries(monthlyData)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, payments]) => ({
        month,
        total: payments.reduce((sum: number, p: any) => sum + p.amount, 0),
        payments,
      })),
  }
  
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="${group.name}-账单导出.json"`)
  res.json(exportData)
})

app.get('/api/groups/:groupId/subscriptions/:subscriptionId', (req: Request<{ groupId: string; subscriptionId: string }>, res: Response) => {
  const group = findGroupById(req.params.groupId)
  if (!group) {
    return res.status(404).json({ error: '组不存在' })
  }
  
  const subscription = group.subscriptions.find((s) => s.id === req.params.subscriptionId)
  if (!subscription) {
    return res.status(404).json({ error: '订阅不存在' })
  }
  
  const enrichedSub = {
    ...subscription,
    members: subscription.members.map((m) => ({
      ...m,
      remainingDays: m.active && m.activatedDate
        ? calculateMemberRemainingDays(m.activatedDate, subscription.paymentDay)
        : 0,
    })),
  }
  
  res.json(enrichedSub)
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
