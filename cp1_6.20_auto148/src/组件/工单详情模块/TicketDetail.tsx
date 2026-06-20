import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getTicketById, updateTicketStatus } from '../../services/ticketService'
import { Ticket } from '../../types'
import { CategoryTag, PriorityTag, KeywordTag } from '../通用/Tags'
import { TicketDetailSkeleton } from '../通用/Skeleton'

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (id) {
      fetchTicket(parseInt(id))
    }
  }, [id])

  const fetchTicket = async (ticketId: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTicketById(ticketId)
      setTicket(data)
    } catch (err) {
      setError('加载工单详情失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleStartProcessing = async () => {
    if (!ticket) return
    setUpdating(true)
    try {
      const updated = await updateTicketStatus(ticket.id, '处理中')
      setTicket(updated)
    } catch (err) {
      setError('更新状态失败，请稍后重试')
    } finally {
      setUpdating(false)
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
      second: '2-digit',
    })
  }

  const formatTicketId = (ticketId: number) => {
    return `T-${String(ticketId).padStart(4, '0')}`
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <button style={styles.backButton} onClick={() => navigate(-1)}>
          ← 返回列表
        </button>
        <TicketDetailSkeleton />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div style={styles.container}>
        <button style={styles.backButton} onClick={() => navigate(-1)}>
          ← 返回列表
        </button>
        <div style={styles.errorMessage}>
          {error || '工单不存在'}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <motion.button
        style={styles.backButton}
        onClick={() => navigate(-1)}
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.2 }}
      >
        ← 返回列表
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={styles.detailCard}
      >
        <div style={styles.header}>
          <h1 style={styles.title}>
            {formatTicketId(ticket.id)} - {ticket.customerName}
          </h1>
          <div style={styles.tagContainer}>
            <CategoryTag category={ticket.category} />
            <PriorityTag priority={ticket.priority} />
          </div>
        </div>

        <div style={styles.readOnlyField}>
          <label style={styles.fieldLabel}>客户名称</label>
          <div style={styles.fieldValue}>{ticket.customerName}</div>
        </div>

        <div style={styles.readOnlyField}>
          <label style={styles.fieldLabel}>反馈分类</label>
          <div style={styles.fieldValue}>{ticket.category}</div>
        </div>

        <div style={styles.readOnlyField}>
          <label style={styles.fieldLabel}>详细描述</label>
          <div style={styles.fieldValue}>{ticket.description}</div>
        </div>

        {ticket.attachmentUrl && (
          <div style={styles.readOnlyField}>
            <label style={styles.fieldLabel}>附件链接</label>
            <a
              href={ticket.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
            >
              {ticket.attachmentUrl}
            </a>
          </div>
        )}

        <div style={styles.readOnlyField}>
          <label style={styles.fieldLabel}>当前状态</label>
          <div style={styles.fieldValue}>
            <span style={styles.statusBadge(ticket.status)}>
              {ticket.status}
            </span>
          </div>
        </div>

        <div style={styles.readOnlyField}>
          <label style={styles.fieldLabel}>提交时间</label>
          <div style={styles.fieldValue}>{formatDate(ticket.createdAt)}</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={styles.tagsCard}
      >
        <h2 style={styles.sectionTitle}>智能标签</h2>
        
        <div style={styles.tagSection}>
          <label style={styles.tagLabel}>优先级</label>
          <PriorityTag priority={ticket.priority} />
        </div>

        <div style={styles.tagSection}>
          <label style={styles.tagLabel}>关键词</label>
          <div style={styles.keywordContainer}>
            {ticket.keywords.map((keyword, index) => (
              <KeywordTag key={index} keyword={keyword} />
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={styles.actionCard}
      >
        {ticket.status === '待处理' ? (
          <motion.button
            onClick={handleStartProcessing}
            disabled={updating}
            style={styles.startButton}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2 }}
          >
            {updating ? '处理中...' : '开始处理'}
          </motion.button>
        ) : (
          <div style={styles.processingInfo}>
            {ticket.status === '处理中' 
              ? '当前工单正在处理中...'
              : '当前工单已完成处理'
            }
          </div>
        )}
      </motion.div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties | ((status: string) => React.CSSProperties)> = {
  container: {
    width: '100%',
    maxWidth: 1024,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    color: '#374151',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  errorMessage: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    borderRadius: 8,
  },
  detailCard: {
    backgroundColor: '#f9fafb',
    padding: 32,
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  tagContainer: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  readOnlyField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: '#6b7280',
  },
  fieldValue: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 1.6,
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
    wordBreak: 'break-all',
  },
  statusBadge: (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      '待处理': { bg: '#fef3c7', color: '#92400e' },
      '处理中': { bg: '#dbeafe', color: '#1e40af' },
      '已完成': { bg: '#d1fae5', color: '#065f46' },
    }
    const style = colors[status] || { bg: '#f3f4f6', color: '#374151' }
    return {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: 9999,
      backgroundColor: style.bg,
      color: style.color,
      fontSize: 12,
      fontWeight: 500,
    }
  },
  tagsCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  tagSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  tagLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: '#6b7280',
    minWidth: 60,
  },
  keywordContainer: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'center',
  },
  startButton: {
    height: 40,
    padding: '0 32px',
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  processingInfo: {
    color: '#6b7280',
    fontSize: 14,
  },
}

export default TicketDetail
