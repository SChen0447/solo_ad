import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import type { PaymentRecord } from '../types'

export default function SubscriptionDetail() {
  const { state, dispatch, currentMemberId, refreshSplitData, refreshReminders } = useApp()
  const { groupId, subscriptionId } = useParams<{ groupId: string; subscriptionId: string }>()
  const navigate = useNavigate()
  const api = useApi()
  const timelineRef = useRef<HTMLDivElement>(null)
  const [highlightedPaymentId, setHighlightedPaymentId] = useState<string | null>(null)
  
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payerId: currentMemberId || '',
  })

  const subscription = state.group?.subscriptions.find(s => s.id === subscriptionId)

  useEffect(() => {
    if (subscription && timelineRef.current) {
      setTimeout(() => {
        if (timelineRef.current) {
          timelineRef.current.scrollTop = timelineRef.current.scrollHeight
        }
      }, 100)
    }
  }, [subscription?.paymentHistory.length])

  useEffect(() => {
    if (highlightedPaymentId) {
      const timer = setTimeout(() => setHighlightedPaymentId(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [highlightedPaymentId])

  if (!state.group || !subscription) {
    return (
      <div className="container">
        <div className="error-message">未找到订阅信息</div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          ← 返回
        </button>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getMemberName = (memberId: string) => {
    return state.group!.members.find(m => m.id === memberId)?.name || '未知'
  }

  const getMemberAvatar = (memberId: string) => {
    return state.group!.members.find(m => m.id === memberId)?.avatar || ''
  }

  const handleMemberSelect = (memberId: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedMembers.size === subscription.members.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(subscription.members.map(m => m.memberId)))
    }
  }

  const handleBatchUpdate = async (active: boolean) => {
    if (!groupId || selectedMembers.size === 0) return

    try {
      await api.updateMembersStatus(
        groupId,
        subscriptionId!,
        Array.from(selectedMembers),
        active
      )
      dispatch({
        type: 'UPDATE_MEMBERS_STATUS',
        payload: {
          subscriptionId: subscriptionId!,
          memberIds: Array.from(selectedMembers),
          active,
        },
      })
      setSelectedMembers(new Set())
      await refreshSplitData(groupId)
    } catch (err: any) {
      alert(err.message || '操作失败')
    }
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupId || !subscriptionId) return

    try {
      const payment = await api.addPayment(groupId, {
        subscriptionId,
        amount: parseFloat(paymentForm.amount),
        payerId: paymentForm.payerId,
      })
      dispatch({
        type: 'ADD_PAYMENT',
        payload: { subscriptionId, payment },
      })
      setHighlightedPaymentId(payment.id)
      setShowAddPaymentModal(false)
      setPaymentForm({ amount: subscription.monthlyFee.toString(), payerId: currentMemberId || '' })
      await refreshSplitData(groupId)
      await refreshReminders(groupId)
    } catch (err: any) {
      alert(err.message || '添加失败')
    }
  }

  const getDaysClass = (days: number, active: boolean) => {
    if (!active) return 'expired'
    if (days <= 3) return 'expired'
    if (days <= 10) return 'warning'
    return 'good'
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      active: { label: '● 活跃', className: 'status-badge active' },
      paused: { label: '● 已暂停', className: 'status-badge paused' },
      expiring: { label: '● 即将到期', className: 'status-badge expiring' },
    }
    return statusMap[status] || statusMap.active
  }

  const status = getStatusBadge(subscription.status)

  const sortedPayments = [...subscription.paymentHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <div className="container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← 返回仪表盘
      </button>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 48 }}>{subscription.icon}</span>
          <div>
            <h1 className="page-title">{subscription.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <span style={{ color: '#64748b' }}>
                ¥{subscription.monthlyFee.toFixed(2)} / 月 · 每月{subscription.paymentDay}日付费
              </span>
              <span className={status.className}>{status.label}</span>
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setPaymentForm({ amount: subscription.monthlyFee.toString(), payerId: currentMemberId || '' })
          setShowAddPaymentModal(true)
        }}>
          + 添加付费记录
        </button>
      </div>

      <div className="detail-layout">
        <div className="timeline-section glass">
          <h2 className="section-title">💰 付费记录时间线</h2>
          
          {sortedPayments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💳</div>
              <div className="empty-state-title">还没有付费记录</div>
              <div>点击右上角"添加付费记录"开始记录</div>
            </div>
          ) : (
            <div className="timeline" ref={timelineRef}>
              {sortedPayments.map((payment: PaymentRecord, idx: number) => {
                const payer = state.group!.members.find(m => m.id === payment.payerId)
                return (
                  <div
                    key={payment.id}
                    className={`timeline-item ${highlightedPaymentId === payment.id ? 'highlight' : ''}`}
                  >
                    <div className="timeline-date">
                      {formatDate(payment.date)}
                    </div>
                    <div className="timeline-amount">
                      ¥{payment.amount.toFixed(2)}
                    </div>
                    <div className="timeline-payer">
                      {payer && (
                        <img
                          src={payer.avatar}
                          alt={payer.name}
                          style={{ width: 20, height: 20, borderRadius: '50%', verticalAlign: 'middle', marginRight: 8 }}
                        />
                      )}
                      付款人: {getMemberName(payment.payerId)}
                    </div>
                    <div className="timeline-split">
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>分摊明细:</div>
                      {payment.splitDetails.map((detail) => (
                        <div key={detail.memberId} className="split-row">
                          <span className="split-row-name">{getMemberName(detail.memberId)}</span>
                          <span className="split-row-amount">¥{detail.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="members-section glass">
          <h2 className="section-title">👥 成员订阅状态</h2>

          <div className="batch-actions">
            <button
              className="btn btn-sm btn-secondary"
              onClick={handleSelectAll}
            >
              {selectedMembers.size === subscription.members.length ? '取消全选' : '全选'}
            </button>
            <button
              className="btn btn-sm btn-success"
              onClick={() => handleBatchUpdate(true)}
              disabled={selectedMembers.size === 0}
              style={{ opacity: selectedMembers.size === 0 ? 0.5 : 1 }}
            >
              ✓ 启用选中
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => handleBatchUpdate(false)}
              disabled={selectedMembers.size === 0}
              style={{ opacity: selectedMembers.size === 0 ? 0.5 : 1 }}
            >
              ✕ 禁用选中
            </button>
            <span style={{ fontSize: 13, color: '#64748b', alignSelf: 'center' }}>
              已选 {selectedMembers.size} 人
            </span>
          </div>

          <div className="members-list">
            {subscription.members.map((memberStatus) => {
              const member = state.group!.members.find(m => m.id === memberStatus.memberId)
              if (!member) return null

              const isSelected = selectedMembers.has(memberStatus.memberId)
              const daysClass = getDaysClass(memberStatus.remainingDays, memberStatus.active)

              return (
                <div
                  key={memberStatus.memberId}
                  className={`member-item ${isSelected ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="member-checkbox"
                    checked={isSelected}
                    onChange={() => handleMemberSelect(memberStatus.memberId)}
                  />
                  <div className="member-avatar-sm">
                    <img src={member.avatar} alt={member.name} />
                  </div>
                  <div className="member-info">
                    <div className="member-name">{member.name}</div>
                    <div className="member-status">
                      <span className={memberStatus.active ? 'status-active-dot' : 'status-inactive-dot'}></span>
                      <span style={{ color: memberStatus.active ? '#059669' : '#64748b' }}>
                        {memberStatus.active ? '已激活' : '未激活'}
                      </span>
                      {memberStatus.active && (
                        <span className={`member-days ${daysClass}`}>
                          剩余 {memberStatus.remainingDays} 天
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showAddPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowAddPaymentModal(false)}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">添加付费记录</h2>
            <form onSubmit={handleAddPayment}>
              <div className="form-group">
                <label className="form-label">付费金额 (元)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder={subscription.monthlyFee.toString()}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">付款人</label>
                <select
                  className="form-input"
                  value={paymentForm.payerId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payerId: e.target.value })}
                  required
                >
                  <option value="">请选择付款人</option>
                  {state.group!.members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddPaymentModal(false)}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
