import { v4 as uuidv4 } from 'uuid'

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

let quotes: Quote[] = []

function calculateTotal(items: QuoteItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}

function deepCloneQuote(quote: Quote): Quote {
  return JSON.parse(JSON.stringify(quote))
}

function createVersion(quote: Quote, versionNum: number): QuoteVersion {
  return {
    version: versionNum,
    status: quote.status,
    items: quote.items.map(item => ({ ...item })),
    customerName: quote.customerName,
    totalAmount: quote.totalAmount,
    changedAt: new Date().toISOString()
  }
}

export function getAllQuotes(): Quote[] {
  return quotes.map(q => ({
    ...q,
    items: [...q.items],
    versions: [...q.versions]
  }))
}

export function getQuotesByStatus(status: QuoteStatus): Quote[] {
  return quotes
    .filter(q => q.status === status)
    .map(q => ({
      ...q,
      items: [...q.items],
      versions: [...q.versions]
    }))
}

export function getQuotesBySearch(search: string): Quote[] {
  const keyword = search.toLowerCase()
  return quotes
    .filter(q => q.customerName.toLowerCase().includes(keyword))
    .map(q => ({
      ...q,
      items: [...q.items],
      versions: [...q.versions]
    }))
}

export function getQuotesFiltered(options: { status?: QuoteStatus; search?: string }): Quote[] {
  let result = quotes

  if (options.status) {
    result = result.filter(q => q.status === options.status)
  }

  if (options.search) {
    const keyword = options.search.toLowerCase()
    result = result.filter(q => q.customerName.toLowerCase().includes(keyword))
  }

  return result.map(q => ({
    ...q,
    items: [...q.items],
    versions: [...q.versions]
  }))
}

export function getQuoteById(id: string): Quote | undefined {
  const quote = quotes.find(q => q.id === id)
  return quote ? deepCloneQuote(quote) : undefined
}

export function createQuote(customerName: string, items: Omit<QuoteItem, 'id'>[]): Quote {
  const quoteItems: QuoteItem[] = items.map(item => ({
    ...item,
    id: uuidv4()
  }))
  const totalAmount = calculateTotal(quoteItems)
  const now = new Date().toISOString()

  const newQuote: Quote = {
    id: uuidv4(),
    customerName,
    items: quoteItems,
    status: QuoteStatus.DRAFT,
    totalAmount,
    createdAt: now,
    updatedAt: now,
    versions: []
  }

  newQuote.versions.push(createVersion(newQuote, 1))
  quotes.push(newQuote)
  return deepCloneQuote(newQuote)
}

export function updateQuoteStatus(id: string, newStatus: QuoteStatus): Quote | undefined {
  const quoteIndex = quotes.findIndex(q => q.id === id)
  if (quoteIndex === -1) return undefined

  const quote = quotes[quoteIndex]
  quote.status = newStatus
  quote.updatedAt = new Date().toISOString()
  quote.totalAmount = calculateTotal(quote.items)

  const nextVersionNum = quote.versions.length + 1
  quote.versions.push(createVersion(quote, nextVersionNum))

  return deepCloneQuote(quote)
}

export function deleteQuote(id: string): boolean {
  const initialLength = quotes.length
  quotes = quotes.filter(q => q.id !== id)
  return quotes.length < initialLength
}

export function seedMockData(): void {
  const mockQuotes = [
    {
      customerName: '阿里巴巴科技有限公司',
      items: [
        { name: '网站设计服务', quantity: 1, unitPrice: 50000 },
        { name: '前端开发服务', quantity: 3, unitPrice: 30000 }
      ]
    },
    {
      customerName: '腾讯云计算',
      items: [
        { name: 'SaaS 平台开发', quantity: 1, unitPrice: 120000 },
        { name: '移动端适配', quantity: 2, unitPrice: 25000 }
      ]
    },
    {
      customerName: '字节跳动',
      items: [
        { name: '数据可视化服务', quantity: 1, unitPrice: 80000 },
        { name: '技术咨询', quantity: 10, unitPrice: 5000 }
      ]
    }
  ]

  mockQuotes.forEach((q, index) => {
    const created = createQuote(q.customerName, q.items)
    if (index === 0) {
      updateQuoteStatus(created.id, QuoteStatus.PENDING)
    } else if (index === 1) {
      updateQuoteStatus(created.id, QuoteStatus.PENDING)
      updateQuoteStatus(created.id, QuoteStatus.APPROVED)
    } else if (index === 2) {
      updateQuoteStatus(created.id, QuoteStatus.PENDING)
      updateQuoteStatus(created.id, QuoteStatus.REJECTED)
    }
  })
}
