import { useCallback } from 'react'
import type {
  Group,
  Subscription,
  PaymentRecord,
  SplitResult,
  RenewalReminder,
  SearchResult,
  SubscriptionCategory,
} from '../types'

const API_BASE = '/api'

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}`)
  }
  
  return response.json()
}

export function useApi() {
  const createGroup = useCallback(async (name: string, creatorName: string) => {
    return request<{ groupId: string; inviteCode: string; currentMemberId: string }>('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, creatorName }),
    })
  }, [])

  const joinGroup = useCallback(async (inviteCode: string, memberName: string) => {
    return request<{ groupId: string; currentMemberId: string }>('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode, memberName }),
    })
  }, [])

  const getGroup = useCallback(async (groupId: string) => {
    return request<Group>(`/groups/${groupId}`)
  }, [])

  const getSubscription = useCallback(async (groupId: string, subscriptionId: string) => {
    return request<Subscription>(`/groups/${groupId}/subscriptions/${subscriptionId}`)
  }, [])

  const createSubscription = useCallback(async (
    groupId: string,
    data: {
      name: string
      icon: string
      category: SubscriptionCategory
      monthlyFee: number
      paymentDay: number
      memberLimit: number
      reminderDays?: number
    }
  ) => {
    return request<Subscription>(`/groups/${groupId}/subscriptions`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }, [])

  const updateSubscription = useCallback(async (
    groupId: string,
    subscriptionId: string,
    data: Partial<{
      name: string
      icon: string
      category: SubscriptionCategory
      monthlyFee: number
      paymentDay: number
      memberLimit: number
      reminderDays: number
    }>
  ) => {
    return request<Subscription>(`/groups/${groupId}/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }, [])

  const deleteSubscription = useCallback(async (groupId: string, subscriptionId: string) => {
    return request<{ success: boolean }>(`/groups/${groupId}/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
    })
  }, [])

  const addPayment = useCallback(async (
    groupId: string,
    data: {
      subscriptionId: string
      amount: number
      payerId: string
      date?: string
    }
  ) => {
    return request<PaymentRecord>(`/groups/${groupId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }, [])

  const updateMembersStatus = useCallback(async (
    groupId: string,
    subscriptionId: string,
    memberIds: string[],
    active: boolean
  ) => {
    return request<{ success: boolean }>(
      `/groups/${groupId}/subscriptions/${subscriptionId}/members`,
      {
        method: 'PUT',
        body: JSON.stringify({ memberIds, active }),
      }
    )
  }, [])

  const getSplitData = useCallback(async (groupId: string) => {
    return request<SplitResult[]>(`/groups/${groupId}/calculate-split`)
  }, [])

  const getReminders = useCallback(async (groupId: string) => {
    return request<RenewalReminder[]>(`/groups/${groupId}/renewal-reminders`)
  }, [])

  const markAsRenewed = useCallback(async (
    groupId: string,
    subscriptionId: string,
    payerId: string
  ) => {
    return request<PaymentRecord>(
      `/groups/${groupId}/subscriptions/${subscriptionId}/renew`,
      {
        method: 'POST',
        body: JSON.stringify({ payerId }),
      }
    )
  }, [])

  const search = useCallback(async (groupId: string, query: string) => {
    return request<SearchResult>(`/groups/${groupId}/search?q=${encodeURIComponent(query)}`)
  }, [])

  const exportBills = useCallback(async (groupId: string) => {
    const response = await fetch(`${API_BASE}/groups/${groupId}/export`)
    if (!response.ok) {
      throw new Error('导出失败')
    }
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const contentDisposition = response.headers.get('Content-Disposition')
    const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || '账单导出.json'
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }, [])

  return {
    createGroup,
    joinGroup,
    getGroup,
    getSubscription,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    addPayment,
    updateMembersStatus,
    getSplitData,
    getReminders,
    markAsRenewed,
    search,
    exportBills,
  }
}
