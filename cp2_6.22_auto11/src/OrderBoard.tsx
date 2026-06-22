import { useState, useMemo } from 'react'
import type { Order, Product } from './types'
import { orderApi } from './api'

interface OrderBoardProps {
  orders: Order[]
  products: Product[]
  onOrdersChange: () => void
  delay?: number
}

type FilterType = 'all' | Order['status']

const statusConfig: Record<Order['status'], { label: string; color: string; bgColor: string }> = {
  pending: { label: '待支付', color: '#FFFFFF', bgColor: '#F59E0B' },
  paid: { label: '已支付', color: '#FFFFFF', bgColor: '#3B82F6' },
  shipping: { label: '发货中', color: '#FFFFFF', bgColor: '#8B5CF6' },
  completed: { label: '已完成', color: '#FFFFFF', bgColor: '#10B981' },
}

const statusOrder: Order['status'][] = ['pending', 'paid', 'shipping', 'completed']

function OrderBoard({ orders, products, onOrdersChange, delay = 0 }: OrderBoardProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filteredOrders = useMemo(() => {
    let result = [...orders]

    if (filter !== 'all') {
      result = result.filter(o => o.status === filter)
    }

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }

    return result
  }, [orders, filter, sortBy])

  const handleStatusClick = async (order: Order) => {
    if (updatingId) return
    
    const currentIndex = statusOrder.indexOf(order.status)
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]
    
    setUpdatingId(order.id)
    try {
      await orderApi.updateStatus(order.id, nextStatus)
      onOrdersChange()
    } catch (err) {
      console.error('更新订单状态失败:', err)
      alert('更新状态失败，请重试')
    } finally {
      setUpdatingId(null)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filters: Array<{ key: FilterType; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待支付' },
    { key: 'paid', label: '已支付' },
    { key: 'shipping', label: '发货中' },
    { key: 'completed', label: '已完成' },
  ]

  const getOrderCount = (status: FilterType) => {
    if (status === 'all') return orders.length
    return orders.filter(o => o.status === status).length
  }

  return (
    <div style={{ animation: `fadeInUp 0.5s ease-out ${delay}s both` }}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>订单管理</h2>
          <p style={subtitleStyle}>共 {orders.length} 笔订单</p>
        </div>
      </div>

      <div style={toolbarStyle}>
        <div style={filterTabsStyle}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                ...filterTabStyle,
                ...(filter === f.key ? filterTabActiveStyle : {}),
              }}
            >
              {f.label}
              <span style={{
                ...filterBadgeStyle,
                ...(filter === f.key ? filterBadgeActiveStyle : {}),
              }}>
                {getOrderCount(f.key)}
              </span>
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
          style={sortSelectStyle}
        >
          <option value="newest">最新优先</option>
          <option value="oldest">最早优先</option>
        </select>
      </div>

      <div style={orderListStyle}>
        {filteredOrders.map((order, index) => (
          <div
            key={order.id}
            style={orderItemStyle}
          >
            <img
              src={order.productImage}
              alt={order.productName}
              style={orderImageStyle}
            />
            <div style={orderInfoStyle}>
              <div style={orderNameStyle}>{order.productName}</div>
              <div style={orderDetailStyle}>
                <span>数量: {order.quantity} 件</span>
                <span style={{ color: '#6B7280' }}> | </span>
                <span style={{ color: '#6B7280' }}>{formatTime(order.createdAt)}</span>
              </div>
            </div>
            <div style={orderRightStyle}>
              <div style={orderPriceStyle}>¥{order.totalPrice}</div>
              <button
                onClick={() => handleStatusClick(order)}
                disabled={updatingId === order.id}
                style={{
                  ...statusBadgeStyle,
                  backgroundColor: statusConfig[order.status].bgColor,
                  color: statusConfig[order.status].color,
                  transition: 'background-color 0.4s ease, transform 0.2s ease',
                }}
              >
                {updatingId === order.id ? '更新中...' : statusConfig[order.status].label}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div style={emptyStateStyle}>
          <span style={{ fontSize: '48px', marginBottom: '16px' }}>📋</span>
          <p style={{ color: '#6B7280', fontSize: '14px' }}>暂无订单</p>
        </div>
      )}
    </div>
  )
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  color: '#111827',
  marginBottom: '4px',
}

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280',
}

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
  gap: '16px',
  flexWrap: 'wrap',
}

const filterTabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
}

const filterTabStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 16px',
  background: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '10px',
  fontSize: '14px',
  color: '#6B7280',
  cursor: 'pointer',
  transition: 'all 0.2s ease-out',
}

const filterTabActiveStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  borderColor: 'transparent',
  color: '#FFFFFF',
  fontWeight: 600,
}

const filterBadgeStyle: React.CSSProperties = {
  padding: '2px 8px',
  fontSize: '12px',
  fontWeight: 600,
  background: '#F3F4F6',
  color: '#6B7280',
  borderRadius: '12px',
  transition: 'all 0.2s ease-out',
}

const filterBadgeActiveStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.25)',
  color: '#FFFFFF',
}

const sortSelectStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: '#FFFFFF',
  borderRadius: '10px',
  border: '1px solid #E5E7EB',
  fontSize: '14px',
  color: '#374151',
  cursor: 'pointer',
}

const orderListStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '16px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  overflow: 'hidden',
}

const orderItemStyle: React.CSSProperties = {
  height: '80px',
  display: 'flex',
  alignItems: 'center',
  padding: '0 20px',
  borderBottom: '1px solid #F3F4F6',
  transition: 'background-color 0.2s ease-out',
}

const orderImageStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '8px',
  objectFit: 'cover',
  marginRight: '16px',
}

const orderInfoStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
}

const orderNameStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#1F2937',
  marginBottom: '4px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const orderDetailStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6B7280',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
}

const orderRightStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  flexShrink: 0,
}

const orderPriceStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#1F2937',
  minWidth: '80px',
  textAlign: 'right',
}

const statusBadgeStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '12px',
  fontWeight: 600,
  borderRadius: '20px',
  cursor: 'pointer',
  border: 'none',
  transition: 'background-color 0.4s ease, transform 0.2s ease, color 0.4s ease',
}

const emptyStateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '64px 0',
}

export default OrderBoard
