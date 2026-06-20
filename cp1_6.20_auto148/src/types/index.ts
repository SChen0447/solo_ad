export type TicketCategory = '功能建议' | '缺陷报告' | '服务投诉' | '其他'

export type TicketStatus = '待处理' | '处理中' | '已完成'

export type PriorityLevel = '紧急' | '高' | '中' | '低'

export interface Ticket {
  id: number
  customerName: string
  category: TicketCategory
  description: string
  attachmentUrl?: string
  status: TicketStatus
  priority: PriorityLevel
  keywords: string[]
  createdAt: string
}

export interface CreateTicketRequest {
  customerName: string
  category: TicketCategory
  description: string
  attachmentUrl?: string
}

export interface ClassificationResult {
  priority: PriorityLevel
  keywords: string[]
}

export interface TicketStats {
  total: number
  pending: number
  byCategory: { name: string; value: number }[]
  byPriority: { name: string; value: number }[]
}
