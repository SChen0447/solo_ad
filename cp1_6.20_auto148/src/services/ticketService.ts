import { get, post, put } from '../utils/api'
import { Ticket, CreateTicketRequest, TicketStats, ClassificationResult } from '../types'

export const createTicket = (data: CreateTicketRequest): Promise<Ticket> => {
  return post<Ticket>('/api/tickets', data)
}

export const getTickets = (status?: string, customer?: string): Promise<Ticket[]> => {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (customer) params.append('customer', customer)
  const query = params.toString()
  return get<Ticket[]>(`/api/tickets${query ? `?${query}` : ''}`)
}

export const getTicketById = (id: number): Promise<Ticket> => {
  return get<Ticket>(`/api/tickets/${id}`)
}

export const updateTicketStatus = (id: number, status: string): Promise<Ticket> => {
  return put<Ticket>(`/api/tickets/${id}`, { status })
}

export const getTicketStats = (): Promise<TicketStats> => {
  return get<TicketStats>('/api/tickets/stats')
}

export const classifyTicket = (content: string, category: string): Promise<ClassificationResult> => {
  return post<ClassificationResult>('/api/classify', { content, category })
}
