import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useOrderStore, useInventoryStore } from '../../store'
import { statusColors, statusLabels } from '../../types'
import { formatRelativeTime } from '../../utils/time'
import type { OrderStatus } from '../../types'
import './orderDetail.css'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { orders, fetchOrders, updateOrderStatus, updateOrderNotes } = useOrderStore()
  const { fetchInventory } = useInventoryStore()
  const order = orders.find((o) => o.id === id)
  const [notes, setNotes] = useState(order?.notes || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (orders.length === 0) {
      fetchOrders()
    }
  }, [orders.length, fetchOrders])

  useEffect(() => {
    if (order) {
      setNotes(order.notes)
    }
  }, [order])

  if (!order) {
    return (
      <div className="order-detail-container">
        <button className="btn btn-outline back-btn" onClick={() => navigate('/orders')}>
          ← 返回订单列表
        </button>
        <div className="loading">加载中...</div>
      </div>
    )
  }

  const statusColor = statusColors[order.status]
  const statusLabel = statusLabels[order.status]

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!id) return
    const result = await updateOrderStatus(id, newStatus)
    if (result) {
      if (newStatus === 'making') {
        fetchInventory()
      }
    }
  }

  const handleSaveNotes = async () => {
    if (!id) return
    setSaving(true)
    await updateOrderNotes(id, notes)
    setTimeout(() => setSaving(false), 500)
  }

  const canStartMaking = order.status === 'pending'
  const canComplete = order.status === 'making'
  const canCancel = order.status === 'pending' || order.status === 'making'

  return (
    <div className="order-detail-container">
      <button className="btn btn-outline back-btn" onClick={() => navigate('/orders')}>
        ← 返回订单列表
      </button>

      <div className="detail-layout">
        <div className="detail-left card">
          <div className="detail-header">
            <h2>订单详情</h2>
            <span className="status-badge" style={{ backgroundColor: statusColor }}>
              {statusLabel}
            </span>
          </div>

          <div className="detail-info">
            <div className="info-row">
              <span className="info-label">订单编号</span>
              <span className="info-value">{order.id}</span>
            </div>
            <div className="info-row">
              <span className="info-label">顾客昵称</span>
              <span className="info-value">{order.customerName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">提交时间</span>
              <span className="info-value">
                {new Date(order.createdAt).toLocaleString('zh-CN')}
                <span className="relative-time">({formatRelativeTime(order.createdAt)})</span>
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">蛋糕口味</span>
              <span className="info-value">{order.flavor}</span>
            </div>
            <div className="info-row">
              <span className="info-label">蛋糕尺寸</span>
              <span className="info-value">{order.size}</span>
            </div>
            <div className="info-row">
              <span className="info-label">奶油类型</span>
              <span className="info-value">{order.creamType}</span>
            </div>
            <div className="info-row">
              <span className="info-label">装饰文字</span>
              <span className="info-value">{order.decorationText || '无'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">图案偏好</span>
              <span className="info-value">{order.pattern}</span>
            </div>
          </div>

          {order.customImage && (
            <div className="detail-image-section">
              <h4>顾客上传图片</h4>
              <div className="detail-image-wrapper">
                <img src={order.customImage} alt="顾客参考图" className="detail-image" />
              </div>
            </div>
          )}
        </div>

        <div className="detail-right card">
          <h3>操作</h3>

          <div className="action-buttons">
            {canStartMaking && (
              <button
                className="btn btn-success action-btn"
                onClick={() => handleStatusChange('making')}
              >
                开始制作
              </button>
            )}
            {canComplete && (
              <button
                className="btn btn-gray action-btn"
                onClick={() => handleStatusChange('completed')}
              >
                完成
              </button>
            )}
            {canCancel && (
              <button
                className="btn btn-danger action-btn"
                onClick={() => handleStatusChange('cancelled')}
              >
                取消订单
              </button>
            )}
          </div>

          <div className="notes-section">
            <h4>内部备注</h4>
            <textarea
              className="form-textarea notes-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录内部备注信息..."
            />
            <button className="btn btn-secondary save-notes-btn" onClick={handleSaveNotes}>
              {saving ? '已保存 ✓' : '保存备注'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
