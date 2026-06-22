import { useState, useEffect, useMemo } from 'react'
import type { Product, Order } from './types'
import { statsApi } from './api'

interface SalesDashboardProps {
  products: Product[]
  orders: Order[]
  delay?: number
}

interface StatsSummary {
  todayRevenue: number
  monthOrders: number
  totalProducts: number
}

interface SalesTrendItem {
  date: string
  revenue: number
  orders: number
}

function SalesDashboard({ products, orders, delay = 0 }: SalesDashboardProps) {
  const [summary, setSummary] = useState<StatsSummary>({
    todayRevenue: 0,
    monthOrders: 0,
    totalProducts: 0,
  })
  const [salesTrend, setSalesTrend] = useState<SalesTrendItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [animationKey, setAnimationKey] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryData, trendData] = await Promise.all([
          statsApi.getSummary(),
          statsApi.getSalesTrend(),
        ])
        setSummary(summaryData)
        setSalesTrend(trendData)
        setAnimationKey(prev => prev + 1)
      } catch (error) {
        console.error('获取统计数据失败:', error)
      } finally {
        setIsLoaded(true)
      }
    }
    fetchData()
  }, [products, orders])

  const maxRevenue = useMemo(() => {
    if (salesTrend.length === 0) return 0
    return Math.max(...salesTrend.map(item => item.revenue), 100)
  }, [salesTrend])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const getDayOfWeek = (dateStr: string) => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return days[new Date(dateStr).getDay()]
  }

  const statCards = [
    {
      label: '今日销售额',
      value: `¥${summary.todayRevenue.toFixed(0)}`,
      gradient: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
      icon: '💰',
      delay: 0.1,
    },
    {
      label: '本月订单数',
      value: summary.monthOrders,
      gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
      icon: '📦',
      delay: 0.25,
    },
    {
      label: '总商品数',
      value: summary.totalProducts,
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',
      icon: '🏷️',
      delay: 0.4,
    },
  ]

  return (
    <div style={{ animation: `fadeInUp 0.5s ease-out ${delay}s both` }}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>销售看板</h2>
          <p style={subtitleStyle}>实时查看销售数据与趋势</p>
        </div>
      </div>

      <div style={statsGridStyle}>
        {statCards.map((card, index) => (
          <div
            key={card.label}
            style={{
              ...statCardStyle,
              background: card.gradient,
              animation: isLoaded
                ? `slideUp 0.5s ease-out ${card.delay}s both`
                : 'none',
            }}
          >
            <div style={statCardContentStyle}>
              <div style={statCardIconStyle}>{card.icon}</div>
              <div style={statCardValueStyle}>{card.value}</div>
              <div style={statCardLabelStyle}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={chartContainerStyle}>
        <h3 style={chartTitleStyle}>最近7天销售趋势</h3>
        <div style={chartStyle}>
          <div style={chartBarsStyle}>
            {salesTrend.map((item, index) => {
              const heightPercent = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0
              return (
                <div key={item.date} style={barColumnStyle}>
                  <div style={barTooltipStyle}>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>¥{item.revenue}</div>
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>{item.orders} 笔订单</div>
                  </div>
                  <div
                    key={`${animationKey}-${item.date}`}
                    className="chart-bar animate"
                    style={{
                      ...barStyle,
                      height: `${heightPercent}%`,
                      background: 'linear-gradient(180deg, #A855F7 0%, #6366F1 100%)',
                      animationDelay: `${0.5 + index * 0.08}s`,
                    }}
                  />
                  <div style={barLabelStyle}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>
                      {formatDate(item.date)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      {getDayOfWeek(item.date)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={bottomSectionStyle}>
        <div style={infoCardStyle}>
          <h4 style={infoCardTitleStyle}>热销商品 Top 5</h4>
          <div style={topProductsStyle}>
            {getTopProducts(orders, products).map((item, index) => (
              <div key={item.product.id} style={topProductItemStyle}>
                <span style={{
                  ...rankBadgeStyle,
                  background: index < 3 
                    ? 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)'
                    : '#E5E7EB',
                  color: index < 3 ? '#FFFFFF' : '#6B7280',
                }}>
                  {index + 1}
                </span>
                <img src={item.product.imageUrl} alt="" style={topProductImageStyle} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={topProductNameStyle}>{item.product.name}</div>
                  <div style={topProductSalesStyle}>销量: {item.sales} 件</div>
                </div>
                <div style={topProductRevenueStyle}>¥{item.revenue}</div>
              </div>
            ))}
            {getTopProducts(orders, products).length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF' }}>
                暂无销售数据
              </div>
            )}
          </div>
        </div>

        <div style={infoCardStyle}>
          <h4 style={infoCardTitleStyle}>订单状态分布</h4>
          <div style={statusDistributionStyle}>
            {getStatusDistribution(orders).map((item) => (
              <div key={item.status} style={statusItemStyle}>
                <div style={{
                  ...statusDotStyle,
                  backgroundColor: getStatusColor(item.status),
                }} />
                <span style={statusLabelStyle}>{getStatusLabel(item.status)}</span>
                <span style={statusCountStyle}>{item.count} 笔</span>
              </div>
            ))}
          </div>
          <div style={statusBarContainerStyle}>
            {getStatusDistribution(orders).map((item) => (
              <div
                key={item.status}
                style={{
                  ...statusBarSegmentStyle,
                  width: `${orders.length > 0 ? (item.count / orders.length) * 100 : 0}%`,
                  backgroundColor: getStatusColor(item.status),
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function getTopProducts(orders: Order[], products: Product[]) {
  const salesMap = new Map<string, { sales: number; revenue: number }>()
  
  orders.forEach(order => {
    const existing = salesMap.get(order.productId) || { sales: 0, revenue: 0 }
    salesMap.set(order.productId, {
      sales: existing.sales + order.quantity,
      revenue: existing.revenue + order.totalPrice,
    })
  })

  const result = products
    .map(product => ({
      product,
      sales: salesMap.get(product.id)?.sales || 0,
      revenue: salesMap.get(product.id)?.revenue || 0,
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5)

  return result
}

function getStatusDistribution(orders: Order[]) {
  const statuses: Order['status'][] = ['pending', 'paid', 'shipping', 'completed']
  return statuses.map(status => ({
    status,
    count: orders.filter(o => o.status === status).length,
  }))
}

function getStatusColor(status: Order['status']) {
  const colors: Record<Order['status'], string> = {
    pending: '#F59E0B',
    paid: '#3B82F6',
    shipping: '#8B5CF6',
    completed: '#10B981',
  }
  return colors[status]
}

function getStatusLabel(status: Order['status']) {
  const labels: Record<Order['status'], string> = {
    pending: '待支付',
    paid: '已支付',
    shipping: '发货中',
    completed: '已完成',
  }
  return labels[status]
}

const headerStyle: React.CSSProperties = {
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

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '24px',
  marginBottom: '24px',
}

const statCardStyle: React.CSSProperties = {
  height: '120px',
  borderRadius: '16px',
  padding: '20px',
  color: '#FFFFFF',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
  position: 'relative',
  overflow: 'hidden',
}

const statCardContentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  justifyContent: 'center',
  position: 'relative',
  zIndex: 1,
}

const statCardIconStyle: React.CSSProperties = {
  fontSize: '24px',
  marginBottom: '4px',
}

const statCardValueStyle: React.CSSProperties = {
  fontSize: '36px',
  fontWeight: 700,
  lineHeight: 1.2,
}

const statCardLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: 'rgba(255, 255, 255, 0.8)',
  marginTop: '4px',
}

const chartContainerStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  marginBottom: '24px',
}

const chartTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#111827',
  marginBottom: '24px',
}

const chartStyle: React.CSSProperties = {
  height: '280px',
  position: 'relative',
}

const chartBarsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-around',
  height: '100%',
  paddingBottom: '48px',
  gap: '12px',
}

const barColumnStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  height: '100%',
  position: 'relative',
  justifyContent: 'flex-end',
}

const barStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '48px',
  borderRadius: '8px 8px 0 0',
  transition: 'all 0.3s ease-out',
  cursor: 'pointer',
  minHeight: '4px',
}

const barTooltipStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-40px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#1F2937',
  color: '#FFFFFF',
  padding: '6px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  whiteSpace: 'nowrap',
  opacity: 0,
  pointerEvents: 'none',
  transition: 'opacity 0.2s ease-out',
  zIndex: 10,
}

const barLabelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '-44px',
  textAlign: 'center',
  width: '100%',
}

const bottomSectionStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr',
  gap: '24px',
}

const infoCardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
}

const infoCardTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#111827',
  marginBottom: '16px',
}

const topProductsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const topProductItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '8px',
  borderRadius: '10px',
  transition: 'background-color 0.2s ease-out',
}

const rankBadgeStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  fontWeight: 700,
  flexShrink: 0,
}

const topProductImageStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '8px',
  objectFit: 'cover',
  flexShrink: 0,
}

const topProductNameStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#1F2937',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const topProductSalesStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#6B7280',
  marginTop: '2px',
}

const topProductRevenueStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#10B981',
  flexShrink: 0,
}

const statusDistributionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  marginBottom: '16px',
}

const statusItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
}

const statusDotStyle: React.CSSProperties = {
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  flexShrink: 0,
}

const statusLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  flex: 1,
}

const statusCountStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#1F2937',
}

const statusBarContainerStyle: React.CSSProperties = {
  display: 'flex',
  height: '8px',
  borderRadius: '4px',
  overflow: 'hidden',
  background: '#F3F4F6',
}

const statusBarSegmentStyle: React.CSSProperties = {
  height: '100%',
  transition: 'width 0.5s ease-out',
}

export default SalesDashboard
