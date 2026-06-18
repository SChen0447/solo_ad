import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Quote, QuoteStatus, QuoteVersion } from '../types'
import './QuoteDetail.css'

const statusLabels: Record<QuoteStatus, string> = {
  [QuoteStatus.DRAFT]: '草稿',
  [QuoteStatus.PENDING]: '待审批',
  [QuoteStatus.APPROVED]: '已批准',
  [QuoteStatus.REJECTED]: '已拒绝'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getNextStatuses(current: QuoteStatus): { status: QuoteStatus; label: string; type: string }[] {
  switch (current) {
    case QuoteStatus.DRAFT:
      return [{ status: QuoteStatus.PENDING, label: '提交审批', type: 'primary' }]
    case QuoteStatus.PENDING:
      return [
        { status: QuoteStatus.APPROVED, label: '批准', type: 'success' },
        { status: QuoteStatus.REJECTED, label: '拒绝', type: 'danger' }
      ]
    case QuoteStatus.APPROVED:
    case QuoteStatus.REJECTED:
    default:
      return []
  }
}

function VersionPanel({
  version,
  isExpanded,
  onToggle
}: {
  version: QuoteVersion
  isExpanded: boolean
  onToggle: () => void
}) {
  const statusClass = `status-${version.status}`

  return (
    <div className="version-panel">
      <div className="version-header" onClick={onToggle}>
        <div className="version-info">
          <span className="version-number">v{version.version}</span>
          <span className={`status-tag ${statusClass}`}>
            {statusLabels[version.status]}
          </span>
        </div>
        <div className="version-meta">
          <span className="version-time">{formatDateTime(version.changedAt)}</span>
          <span className={`version-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
        </div>
      </div>
      {isExpanded && (
        <div className="version-content">
          <div className="version-detail-row">
            <span className="detail-label">客户：</span>
            <span className="detail-value">{version.customerName}</span>
          </div>
          <div className="version-detail-row">
            <span className="detail-label">总金额：</span>
            <span className="detail-value amount">{formatAmount(version.totalAmount)}</span>
          </div>
          <table className="version-items-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>数量</th>
                <th>单价</th>
                <th>小计</th>
              </tr>
            </thead>
            <tbody>
              {version.items.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{formatAmount(item.unitPrice)}</td>
                  <td>{formatAmount(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set())

  const fetchQuote = async () => {
    if (!id) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/quotes/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('报价单不存在')
        }
        throw new Error('获取报价详情失败')
      }
      const data = await response.json()
      setQuote(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuote()
  }, [id])

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (!id || updating) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/quotes/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('更新状态失败')
      }

      const updatedQuote = await response.json()
      setQuote(updatedQuote)
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失败，请稍后重试')
    } finally {
      setUpdating(false)
    }
  }

  const toggleVersion = (versionNum: number) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(versionNum)) {
        newSet.delete(versionNum)
      } else {
        newSet.add(versionNum)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="quote-detail-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">加载中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="quote-detail-page">
        <div className="error-box">
          <span>{error}</span>
          <button onClick={fetchQuote}>重试</button>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          ← 返回列表
        </button>
      </div>
    )
  }

  if (!quote) {
    return null
  }

  const statusClass = `status-${quote.status}`
  const nextActions = getNextStatuses(quote.status)

  return (
    <div className="quote-detail-page">
      <button className="btn-back" onClick={() => navigate('/')}>
        ← 返回列表
      </button>

      <div className="detail-header card">
        <div className="header-top">
          <div>
            <h2 className="customer-name">{quote.customerName}</h2>
            <p className="create-date">创建于 {formatDate(quote.createdAt)}</p>
          </div>
          <div className="header-right">
            <div className="total-amount-detail">
              <span className="amount-label">总金额</span>
              <span className="amount-value">{formatAmount(quote.totalAmount)}</span>
            </div>
          </div>
        </div>

        <div className="status-section">
          <div className="status-info">
            <span className="status-label">当前状态：</span>
            <span className={`status-tag ${statusClass} status-tag-large`}>
              {statusLabels[quote.status]}
            </span>
          </div>
          {nextActions.length > 0 && (
            <div className="status-actions">
              {nextActions.map(action => (
                <button
                  key={action.status}
                  className={`btn btn-${action.type}`}
                  onClick={() => handleStatusChange(action.status)}
                  disabled={updating}
                >
                  {updating ? '处理中...' : action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="items-section card">
        <h3 className="section-title">商品/服务明细</h3>
        <div className="items-table-wrapper">
          <table className="items-table">
            <thead>
              <tr>
                <th className="col-name">名称</th>
                <th className="col-quantity">数量</th>
                <th className="col-price">单价</th>
                <th className="col-subtotal">小计</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{formatAmount(item.unitPrice)}</td>
                  <td className="subtotal">{formatAmount(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="total-label">合计</td>
                <td className="total-row">{formatAmount(quote.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="versions-section card">
        <h3 className="section-title">版本历史</h3>
        <p className="versions-hint">
          共 {quote.versions.length} 个版本，点击展开查看详情
        </p>
        <div className="versions-list">
          {[...quote.versions].reverse().map(version => (
            <VersionPanel
              key={version.version}
              version={version}
              isExpanded={expandedVersions.has(version.version)}
              onToggle={() => toggleVersion(version.version)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
