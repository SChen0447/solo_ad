import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useApp } from '../App'
import { useApi } from '../hooks/useApi'
import type { Subscription, SubscriptionCategory } from '../types'

const categoryColors: Record<SubscriptionCategory, string> = {
  video: '#ef4444',
  music: '#8b5cf6',
  cloud: '#10b981',
  other: '#eab308',
}

const categoryLabels: Record<SubscriptionCategory, string> = {
  video: '视频',
  music: '音乐',
  cloud: '云盘',
  other: '其他',
}

const categoryEmojis: Record<SubscriptionCategory, string[]> = {
  video: ['🎬', '📺', '🎥', '🎞️'],
  music: ['🎵', '🎶', '🎸', '🎤'],
  cloud: ['☁️', '💾', '📁', '🗄️'],
  other: ['📦', '🔧', '🎯', '✨'],
}

export default function Dashboard() {
  const { state, dispatch, currentMemberId, refreshSplitData, refreshReminders } = useApp()
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const api = useApi()
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [selectedMemberForCalc, setSelectedMemberForCalc] = useState(currentMemberId || '')
  const [paidAmount, setPaidAmount] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    icon: '🎬',
    category: 'video' as SubscriptionCategory,
    monthlyFee: '',
    paymentDay: '15',
    memberLimit: '5',
    reminderDays: '3',
  })

  if (!state.group) return null

  const activeMemberCount = state.group.members.length
  const totalMonthlyFee = state.group.subscriptions
    .filter(s => s.status !== 'paused')
    .reduce((sum, s) => sum + s.monthlyFee, 0)

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      active: { label: '● 活跃', className: 'status-badge active' },
      paused: { label: '● 已暂停', className: 'status-badge paused' },
      expiring: { label: '● 即将到期', className: 'status-badge expiring' },
    }
    return statusMap[status] || statusMap.active
  }

  const handleCardClick = (subscriptionId: string) => {
    navigate(`/group/${groupId}/subscription/${subscriptionId}`)
  }

  const handleEdit = (e: React.MouseEvent, subscription: Subscription) => {
    e.stopPropagation()
    setEditingSubscription(subscription)
    setFormData({
      name: subscription.name,
      icon: subscription.icon,
      category: subscription.category,
      monthlyFee: subscription.monthlyFee.toString(),
      paymentDay: subscription.paymentDay.toString(),
      memberLimit: subscription.memberLimit.toString(),
      reminderDays: subscription.reminderDays.toString(),
    })
    setShowEditModal(true)
  }

  const handleDelete = async (e: React.MouseEvent, subscriptionId: string) => {
    e.stopPropagation()
    if (!confirm('确定要删除这个订阅吗？')) return
    if (!groupId) return

    try {
      await api.deleteSubscription(groupId, subscriptionId)
      dispatch({ type: 'DELETE_SUBSCRIPTION', payload: subscriptionId })
      await refreshSplitData(groupId)
      await refreshReminders(groupId)
    } catch (err: any) {
      alert(err.message || '删除失败')
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupId) return

    try {
      const sub = await api.createSubscription(groupId, {
        name: formData.name,
        icon: formData.icon,
        category: formData.category,
        monthlyFee: parseFloat(formData.monthlyFee),
        paymentDay: parseInt(formData.paymentDay),
        memberLimit: parseInt(formData.memberLimit),
        reminderDays: parseInt(formData.reminderDays),
      })
      dispatch({ type: 'ADD_SUBSCRIPTION', payload: sub })
      setShowAddModal(false)
      resetForm()
      await refreshSplitData(groupId)
      await refreshReminders(groupId)
    } catch (err: any) {
      alert(err.message || '创建失败')
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupId || !editingSubscription) return

    try {
      const sub = await api.updateSubscription(groupId, editingSubscription.id, {
        name: formData.name,
        icon: formData.icon,
        category: formData.category,
        monthlyFee: parseFloat(formData.monthlyFee),
        paymentDay: parseInt(formData.paymentDay),
        memberLimit: parseInt(formData.memberLimit),
        reminderDays: parseInt(formData.reminderDays),
      })
      dispatch({ type: 'UPDATE_SUBSCRIPTION', payload: sub })
      setShowEditModal(false)
      setEditingSubscription(null)
      resetForm()
      await refreshSplitData(groupId)
      await refreshReminders(groupId)
    } catch (err: any) {
      alert(err.message || '更新失败')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      icon: '🎬',
      category: 'video',
      monthlyFee: '',
      paymentDay: '15',
      memberLimit: '5',
      reminderDays: '3',
    })
  }

  const chartData = state.splitData.map((item) => ({
    name: item.name,
    已付: Math.min(item.paid, item.shouldPay),
    未付: Math.max(0, item.shouldPay - item.paid),
    shouldPay: item.shouldPay,
  }))

  const maxBarValue = Math.max(...chartData.map(d => d.shouldPay), 1)

  const selectedSplit = state.splitData.find(s => s.memberId === selectedMemberForCalc)
  const paid = parseFloat(paidAmount) || 0
  const balance = selectedSplit ? paid - selectedSplit.shouldPay : 0

  const copyInviteCode = () => {
    navigator.clipboard.writeText(state.group!.inviteCode)
    alert('邀请码已复制到剪贴板')
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{state.group.name} 的仪表盘</h1>
          <div style={{ color: '#64748b', marginTop: 4 }}>
            {activeMemberCount} 位成员 · 本月总支出 ¥{totalMonthlyFee.toFixed(2)}
          </div>
        </div>
        <div className="group-info">
          <div className="invite-code" onClick={copyInviteCode} style={{ cursor: 'pointer' }} title="点击复制">
            邀请码: {state.group.inviteCode} 📋
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + 添加订阅
          </button>
        </div>
      </div>

      <div className="members-overview">
        {state.group.members.map((member) => (
          <div key={member.id} className="member-avatar" title={member.name}>
            <img src={member.avatar} alt={member.name} />
          </div>
        ))}
      </div>

      {state.group.subscriptions.length === 0 ? (
        <div className="empty-state glass">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">还没有添加任何订阅</div>
          <div style={{ marginBottom: 16 }}>点击上方"添加订阅"按钮开始管理您的共享订阅</div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + 添加第一个订阅
          </button>
        </div>
      ) : (
        <div className="subscription-grid">
          {state.group.subscriptions.map((sub) => {
            const activeCount = sub.members.filter(m => m.active).length
            const status = getStatusBadge(sub.status)
            
            return (
              <div
                key={sub.id}
                className="subscription-card"
                data-category={sub.category}
                onClick={() => handleCardClick(sub.id)}
              >
                <div className="card-actions">
                  <button
                    className="card-action-btn"
                    onClick={(e) => handleEdit(e, sub)}
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    className="card-action-btn delete"
                    onClick={(e) => handleDelete(e, sub.id)}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
                
                <div className="card-icon">{sub.icon}</div>
                <div className="card-name">{sub.name}</div>
                <div className="card-fee">
                  ¥{sub.monthlyFee.toFixed(2)}
                  <span className="card-fee-period"> / 月</span>
                </div>
                
                <div className={status.className}>{status.label}</div>
                
                <div className="card-info">
                  <div className="card-info-item">
                    <div className="card-info-label">付费日</div>
                    <div className="card-info-value">每月{sub.paymentDay}日</div>
                  </div>
                  <div className="card-info-item">
                    <div className="card-info-label">成员</div>
                    <div className="card-info-value">{activeCount}/{sub.memberLimit}</div>
                  </div>
                  <div className="card-info-item">
                    <div className="card-info-label">分类</div>
                    <div className="card-info-value">{categoryLabels[sub.category]}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {chartData.length > 0 && (
        <div className="split-chart-section glass">
          <h2 className="section-title">📊 本月费用分摊情况</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis type="number" domain={[0, maxBarValue]} />
                <YAxis dataKey="name" type="category" width={60} />
                <Tooltip
                  formatter={(value: number, name: string) => [`¥${value.toFixed(2)}`, name]}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="已付" stackId="a" radius={[4, 0, 0, 4]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-paid-${index}`} fill="#10b981" />
                  ))}
                </Bar>
                <Bar dataKey="未付" stackId="a" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-unpaid-${index}`} fill="url(#stripePattern)" />
                  ))}
                </Bar>
                <defs>
                  <pattern id="stripePattern" patternUnits="userSpaceOnUse" width="10" height="10">
                    <rect width="10" height="10" fill="#e2e8f0" />
                    <line x1="0" y1="0" x2="10" y2="10" stroke="#cbd5e1" strokeWidth="2" />
                    <line x1="-5" y1="5" x2="5" y2="-5" stroke="#cbd5e1" strokeWidth="2" />
                    <animateTransform
                      attributeName="patternTransform"
                      type="translate"
                      from="0 0"
                      to="20 0"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </pattern>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="settlement-calculator glass">
        <h2 className="section-title">🧮 结算计算器</h2>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">选择成员</label>
            <select
              className="form-input"
              value={selectedMemberForCalc}
              onChange={(e) => setSelectedMemberForCalc(e.target.value)}
            >
              <option value="">请选择成员</option>
              {state.group.members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">已付金额 (元)</label>
            <input
              type="number"
              className="form-input"
              placeholder="输入已付金额"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
            />
          </div>
        </div>

        {selectedSplit && (
          <div className="calculator-grid">
            <div className="calculator-item">
              <div className="calculator-label">本月应分摊</div>
              <div className="calculator-amount">¥{selectedSplit.shouldPay.toFixed(2)}</div>
            </div>
            <div className="calculator-item">
              <div className="calculator-label">实际已付</div>
              <div className="calculator-amount">¥{paid.toFixed(2)}</div>
            </div>
            <div className="calculator-item">
              <div className="calculator-label">差额</div>
              <div className={`calculator-amount ${balance >= 0 ? 'positive' : 'negative'}`}>
                {balance >= 0 ? '+' : ''}¥{balance.toFixed(2)}
                <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                  {balance > 0 ? '应退' : balance < 0 ? '应补' : '已结清'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="export-section">
        <button className="btn btn-secondary" onClick={() => {
          if (groupId) api.exportBills(groupId).catch(err => alert(err.message))
        }}>
          📤 导出所有账单数据
        </button>
      </div>

      {(showAddModal || showEditModal) && (
        <div className="modal-overlay" onClick={() => {
          setShowAddModal(false)
          setShowEditModal(false)
          setEditingSubscription(null)
          resetForm()
        }}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              {showAddModal ? '添加订阅服务' : '编辑订阅服务'}
            </h2>
            <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">服务名称</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="如：Netflix、Spotify"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">图标 (emoji)</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  {categoryEmojis[formData.category].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        border: formData.icon === emoji ? '2px solid #667eea' : '1px solid rgba(0,0,0,0.1)',
                        background: formData.icon === emoji ? 'rgba(102,126,234,0.1)' : 'white',
                        fontSize: 20,
                        cursor: 'pointer',
                        transition: 'all 300ms ease-out',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">分类</label>
                  <select
                    className="form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      category: e.target.value as SubscriptionCategory,
                      icon: categoryEmojis[e.target.value as SubscriptionCategory][0]
                    })}
                  >
                    <option value="video">🎬 视频</option>
                    <option value="music">🎵 音乐</option>
                    <option value="cloud">☁️ 云盘</option>
                    <option value="other">📦 其他</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">月费 (元)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="98"
                    value={formData.monthlyFee}
                    onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">每月付费日</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="form-input"
                    placeholder="15"
                    value={formData.paymentDay}
                    onChange={(e) => setFormData({ ...formData, paymentDay: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">成员限额</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="5"
                    value={formData.memberLimit}
                    onChange={(e) => setFormData({ ...formData, memberLimit: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">续费提醒提前天数</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  className="form-input"
                  placeholder="3"
                  value={formData.reminderDays}
                  onChange={(e) => setFormData({ ...formData, reminderDays: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddModal(false)
                    setShowEditModal(false)
                    setEditingSubscription(null)
                    resetForm()
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {showAddModal ? '添加' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
