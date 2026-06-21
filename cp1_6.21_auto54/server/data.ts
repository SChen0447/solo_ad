import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_DIR = join(__dirname)
const DATA_FILE = join(DATA_DIR, 'data.json')

export type SubscriptionCategory = 'video' | 'music' | 'cloud' | 'other'
export type SubscriptionStatus = 'active' | 'paused' | 'expiring'

export interface Member {
  id: string
  name: string
  avatar: string
  customRatio?: number
}

export interface PaymentRecord {
  id: string
  date: string
  amount: number
  payerId: string
  subscriptionId: string
  splitDetails: { memberId: string; amount: number }[]
}

export interface MemberSubscriptionStatus {
  memberId: string
  active: boolean
  remainingDays: number
  activatedDate?: string
}

export interface Subscription {
  id: string
  name: string
  icon: string
  category: SubscriptionCategory
  monthlyFee: number
  paymentDay: number
  memberLimit: number
  status: SubscriptionStatus
  reminderDays: number
  members: MemberSubscriptionStatus[]
  paymentHistory: PaymentRecord[]
}

export interface Group {
  id: string
  name: string
  inviteCode: string
  createdAt: string
  members: Member[]
  subscriptions: Subscription[]
}

export interface AppData {
  groups: Group[]
}

let inMemoryData: AppData | null = null

export function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function loadData(): AppData {
  if (inMemoryData) return inMemoryData
  
  ensureDataDir()
  
  if (!existsSync(DATA_FILE)) {
    inMemoryData = { groups: [] }
    saveData(inMemoryData)
    return inMemoryData
  }
  
  try {
    const content = readFileSync(DATA_FILE, 'utf-8')
    inMemoryData = JSON.parse(content)
  } catch {
    inMemoryData = { groups: [] }
  }
  
  return inMemoryData!
}

export function saveData(data: AppData): void {
  inMemoryData = data
  ensureDataDir()
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export function generateId(): string {
  return uuidv4()
}

export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function findGroupById(groupId: string): Group | undefined {
  const data = loadData()
  return data.groups.find(g => g.id === groupId)
}

export function findGroupByInviteCode(inviteCode: string): Group | undefined {
  const data = loadData()
  return data.groups.find(g => g.inviteCode === inviteCode)
}

export function updateGroup(groupId: string, updater: (group: Group) => Group): Group | null {
  const data = loadData()
  const index = data.groups.findIndex(g => g.id === groupId)
  if (index === -1) return null
  
  data.groups[index] = updater(data.groups[index])
  saveData(data)
  return data.groups[index]
}

export function calculateSplitAmount(
  monthlyFee: number,
  activeMembers: { memberId: string; customRatio?: number }[]
): { memberId: string; amount: number }[] {
  const totalRatio = activeMembers.reduce((sum, m) => sum + (m.customRatio || 1), 0)
  const baseUnit = monthlyFee / totalRatio
  
  return activeMembers.map(m => ({
    memberId: m.memberId,
    amount: Math.round(baseUnit * (m.customRatio || 1) * 100) / 100
  }))
}

export function getDaysUntilPayment(paymentDay: number): number {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  
  if (paymentDay >= currentDay) {
    return paymentDay - currentDay
  } else {
    return daysInMonth - currentDay + paymentDay
  }
}

export function calculateMemberRemainingDays(activatedDate: string, paymentDay: number): number {
  const activated = new Date(activatedDate)
  const today = new Date()
  const daysSinceActivated = Math.floor((today.getTime() - activated.getTime()) / (1000 * 60 * 60 * 24))
  const cycleDays = 30
  
  return Math.max(0, cycleDays - daysSinceActivated)
}
