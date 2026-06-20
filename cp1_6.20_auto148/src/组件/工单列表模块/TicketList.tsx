import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getTickets } from '../../services/ticketService'
import { Ticket, TicketStatus, TicketCategory } from '../../types'
import { CategoryTag } from '../通用/Tags'
import { TicketListSkeleton } from '../通用/Skeleton'

const TicketList: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const statusOptions: (TicketStatus | '')[] = ['', '待处理', '处理中', '已完成']
  const categoryOptions: (TicketCategory | '全部')[] = ['全部', '功能建议', '缺陷报告', '服务投诉', '其他']

  useEffect(() => {
    fetchTickets()
  }, [statusFilter, categoryFilter])

  const fetchTickets = async () => {
    setLoading(true)
    setError(null)
    try {
      const status = statusFilter || undefined
      const customer = searchQuery || undefined
      const category = categoryFilter === '全部' ? undefined : categoryFilter
      const data = await getTickets(status, customer)
      let filtered = data
      if (category) {
        filtered = data.filter(t => t.category === category)
      }
      setTickets(filtered.sort((a, b) => b.id - a.id))
    } catch (err) {
      setError('加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTicketId = (id: number) => {
    return `T-${String(id).padStart(4, '0')}`
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchTickets()
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>工单列表</h1>

      <div style={styles.filterBar}>
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索客户名称..."
            style={styles.searchInput}
          />
          <motion.button
            type="submit"
            style={styles.searchButton}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2 }}
          >
            搜索
          </motion.button>
        </form>

        <div style={styles.filterGroup}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.filterSelect}
          >
            {statusOptions.map(status => (
              <option key={status || 'all'} value={status}>
                {status || '全部状态'}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={styles.filterSelect}
          >
            {categoryOptions.map(cat => (
              <option key={cat} value={cat}>
                {cat === '全部' ? '全部分类' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}

      {loading ? (
        <TicketListSkeleton />
      ) : (
        <div style={styles.listContainer}>
          {tickets.length === 0 ? (
            <div style={styles.emptyState}>
              暂无工单数据
            </div>
          ) : (
            tickets.map((ticket, index) => (
              <motion.div
                key={ticket.id}
                className="ticket-item"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                style={styles.ticketItem}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                whileHover={{
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  backgroundColor: '#f9fafb',
                }}
              >
                <span style={styles.ticketId}>{formatTicketId(ticket.id)}</span>
                <span style={styles.customerName}>{ticket.customerName}</span>
                <CategoryTag category={ticket.category} />
                <span style={styles.statusBadge(ticket.status)}>
                  {ticket.status}
                </span>
                <span className="created-at" style={styles.createdAt}>{formatDate(ticket.createdAt)}</span>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties | ((status: string) => React.CSSProperties)> = {
  container: {
    width: '100%',
    maxWidth: 1024,
    margin: '0 auto',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 24,
  },
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  searchForm: {
    display: 'flex',
    gap: 8,
    flex: 1,
    minWidth: 200,
  },
  searchInput: {
    flex: 1,
    height: 40,
    padding: '0 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
  },
  searchButton: {
    height: 40,
    padding: '0 20px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  filterGroup: {
    display: 'flex',
    gap: 8,
  },
  filterSelect: {
    height: 40,
    padding: '0 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    outline: 'none',
  },
  errorMessage: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    borderRadius: 8,
    marginBottom: 16,
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  ticketItem: {
    width: '100%',
    height: 80,
    padding: 16,
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  ticketId: {
    fontFamily: 'monospace',
    color: '#6b7280',
    fontSize: 14,
    minWidth: 70,
  },
  customerName: {
    fontWeight: 600,
    color: '#111827',
    fontSize: 14,
    flex: 1,
    minWidth: 100,
  },
  statusBadge: (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      '待处理': { bg: '#fef3c7', color: '#92400e' },
      '处理中': { bg: '#dbeafe', color: '#1e40af' },
      '已完成': { bg: '#d1fae5', color: '#065f46' },
    }
    const style = colors[status] || { bg: '#f3f4f6', color: '#374151' }
    return {
      padding: '4px 12px',
      borderRadius: 9999,
      backgroundColor: style.bg,
      color: style.color,
      fontSize: 12,
      fontWeight: 500,
    }
  },
  createdAt: {
    color: '#9ca3af',
    fontSize: 12,
    minWidth: 140,
    textAlign: 'right',
  },
  emptyState: {
    padding: 48,
    textAlign: 'center',
    color: '#9ca3af',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
  },
}

export default TicketList
