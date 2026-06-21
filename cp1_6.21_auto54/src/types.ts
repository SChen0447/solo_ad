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

export interface SplitResult {
  memberId: string
  name: string
  shouldPay: number
  paid: number
  balance: number
}

export interface RenewalReminder {
  subscriptionId: string
  name: string
  icon: string
  daysUntil: number
  reminderDays: number
  monthlyFee: number
}

export interface SearchResult {
  subscriptions: { id: string; type: 'subscription'; name: string; icon: string }[]
  members: { id: string; type: 'member'; name: string; avatar: string }[]
}

export interface AppState {
  group: Group | null
  currentMemberId: string | null
  splitData: SplitResult[]
  reminders: RenewalReminder[]
  loading: boolean
  error: string | null
}

export type AppAction =
  | { type: 'SET_GROUP'; payload: Group }
  | { type: 'SET_CURRENT_MEMBER'; payload: string }
  | { type: 'SET_SPLIT_DATA'; payload: SplitResult[] }
  | { type: 'SET_REMINDERS'; payload: RenewalReminder[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_SUBSCRIPTION'; payload: Subscription }
  | { type: 'UPDATE_SUBSCRIPTION'; payload: Subscription }
  | { type: 'DELETE_SUBSCRIPTION'; payload: string }
  | { type: 'ADD_PAYMENT'; payload: { subscriptionId: string; payment: PaymentRecord } }
  | { type: 'UPDATE_MEMBERS_STATUS'; payload: { subscriptionId: string; memberIds: string[]; active: boolean } }
