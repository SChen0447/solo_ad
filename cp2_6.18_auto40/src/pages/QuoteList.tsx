import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Quote, QuoteStatus } from '../types'
import AddQuoteModal from '../components/AddQuoteModal'
import './QuoteList.css'

const statusLabels: Record<QuoteStatus, string> = {
  [QuoteStatus.DRAFT]: '草稿',
  [QuoteStatus.PENDING]: '待审批',
  [QuoteStatus.APPROVED]: '已批准',
  [QuoteStatus.REJECTED]: '已拒绝'
}

const filterOptions = [
  { value: 'all', label: '全部状态' },
  { value: QuoteStatus.DRAFT, label: '草稿' },
  { value: QuoteStatus.PENDING, label: '待审批' },
  { value: QuoteStatus.APPROVED, label: '已批准' },
  { value: QuoteStatus.REJECTED, label: '已拒绝' }
]

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function QuoteCardSkeleton() {
  return (
    <div className="quote-card skeleton-card">
      <div className="skeleton-line skeleton-title"></div>
      <div className="skeleton-line skeleton-amount"></div>
      <div className="skeleton-footer">
        <div className="skeleton-line skeleton-date"></div>
        <div className="skeleton-line skeleton-tag"></div>
      </div>
    </div>
  )
}

function QuoteCard({ quote }: { quote: Quote }) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/quotes/${quote.id}`)
  }

  const statusClass = `status-tag-${quote.status}`

  return (
    <div className="quote-card" onClick={handleClick}>
      <div className="quote-card-header">
        <h3 className="quote-customer">{quote.customerName}</h3>
        <span className="quote-amount">{formatAmount(quote.totalAmount)}</span>
      </div>
      <div className="quote-card-footer">
        <span className="quote-date">{formatDate(quote.createdAt)}</span>
        <span className={`status-tag ${statusClass}`}>
          {statusLabels[quote.status]}
        </span>
      </div>
    </div>
  )
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

export default function QuoteList() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const debouncedSearch = useDebounce(searchQuery, 300)

  const fetchQuotes = useCallback(async () => {
    setLoading(true)
    setError(null)

    const skeletonTimer = setTimeout(() => {
      setShowSkeleton(false)
    }, 200)

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (debouncedSearch.trim() !== '') {
        params.append('search', debouncedSearch.trim())
      }

      const url = params.toString()
        ? `/api/quotes?${params.toString()}`
        : '/api/quotes'

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('获取报价列表失败')
      }
      const data = await response.json()
      setQuotes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误，请稍后重试')
    } finally {
      clearTimeout(skeletonTimer)
      setLoading(false)
      setShowSkeleton(false)
    }
  }, [statusFilter, debouncedSearch])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  const handleQuoteCreated = (newQuote: Quote) => {
    setQuotes(prev => [newQuote, ...prev])
    setIsModalOpen(false)
  }

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const isFiltering = searchQuery !== '' || statusFilter !== 'all'

  return (
    <div className="quote-list-page">
      <div className="page-header">
        <h2 className="page-title">报价列表</h2>
        <button
          className="btn btn-primary"
          onClick={handleOpenModal}
        >
          + 创建报价
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="搜索客户名称..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>
        <select
          className="status-filter"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {filterOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="error-box">
          <span>{error}</span>
          <button onClick={fetchQuotes}>重试</button>
        </div>
      )}

      {loading && showSkeleton ? (
        <div className="quote-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <QuoteCardSkeleton key={i} />
          ))}
        </div>
      ) : loading && !showSkeleton ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">加载中...</span>
        </div>
      ) : (
        <div className="quote-grid">
          {quotes.map(quote => (
            <QuoteCard key={quote.id} quote={quote} />
          ))}
          {quotes.length === 0 && !error && (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3 className="empty-title">
                {isFiltering ? '没有找到匹配的报价单' : '暂无报价单'}
              </h3>
              <p className="empty-desc">
                {isFiltering
                  ? '试试调整搜索条件或筛选状态'
                  : '点击上方"创建报价"按钮开始创建您的第一份报价单'}
              </p>
              {!isFiltering && (
                <button
                  className="btn btn-primary empty-btn"
                  onClick={handleOpenModal}
                >
                  + 创建报价
                </button>
              )}
              {isFiltering && (
                <button
                  className="btn btn-secondary empty-btn"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                  }}
                >
                  清除筛选条件
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <AddQuoteModal
          onClose={() => setIsModalOpen(false)}
          onCreated={handleQuoteCreated}
        />
      )}
    </div>
  )
}
