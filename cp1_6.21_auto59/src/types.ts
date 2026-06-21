export interface Activity {
  id: string
  name: string
  description: string
  members: Member[]
  budget?: number
  createdAt: string
}

export interface Member {
  id: string
  name: string
  avatarInitial: string
  budget?: number
}

export interface Expense {
  id: string
  activityId: string
  name: string
  amount: number
  payerId: string
  participants: ExpenseParticipant[]
  category: string
  createdAt: string
}

export interface ExpenseParticipant {
  memberId: string
  weight: number
}

export interface SplitResult {
  memberId: string
  memberName: string
  shareAmount: number
  totalOwed: number
  totalPaid: number
  budget?: number
}
