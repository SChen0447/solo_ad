import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrderStore } from '../../store'
import { statusColors, statusLabels } from '../../types'
import { formatRelativeTime } from '../../utils/time'
import type { Order } from '../../types'
import './orderList.css'

interface OrderListProps {
  onNewOrder: () => void
}

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const statusColor = statusColors[order.status]
  const statusLabel = statusLabels[order.status]
  const relativeTime = formatRelativeTime(order.createdAt)

  return (
    <div className="order-card" onClick={onClick} style={{ '--status-color': statusColor } as React.CSSProperties}>
      <div className="card-status-bar" />
      <div className="card-content">
        <div className="card-header">
          <h3 className="customer-name">{order.customerName}</h3>
          <span className="status-badge" style={{ backgroundColor: statusColor }}>
            {statusLabel}
          </span>
        </div>
        <div className="card-time">{relativeTime}</div>
        <div className="card-details">
          <div className="detail-item">
            <span className="detail-label">口味：</span>
            <span>{order.flavor}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">尺寸：</span>
            <span>{order.size}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">奶油：</span>
            <span>{order.creamType}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">图案：</span>
            <span>{order.pattern}</span>
          </div>
        </div>
        {order.decorationText && (
          <div className="card-decoration">
            <span className="detail-label">装饰：</span>
            <span className="decoration-text">"{order.decorationText}"</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrderList({ onNewOrder }: OrderListProps) {
  const navigate = useNavigate()
  const { orders, loading, fetchOrders } = useOrderStore()

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleCardClick = (orderId: string) => {
    navigate(`/orders/${orderId}`)
  }

  return (
    <div className="order-list-container">
      <div className="list-header">
        <h2>订单管理</h2>
        <button className="btn btn-primary" onClick={onNewOrder}>
          + 新建订单
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <div className="loading">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <p>暂无订单</p>
        </div>
      ) : (
        <div className="order-grid">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => handleCardClick(order.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
