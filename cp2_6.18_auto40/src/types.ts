export enum QuoteStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface QuoteItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
}

export interface QuoteVersion {
  version: number
  status: QuoteStatus
  items: QuoteItem[]
  customerName: string
  totalAmount: number
  changedAt: string
}

export interface Quote {
  id: string
  customerName: string
  items: QuoteItem[]
  status: QuoteStatus
  totalAmount: number
  createdAt: string
  updatedAt: string
  versions: QuoteVersion[]
}
