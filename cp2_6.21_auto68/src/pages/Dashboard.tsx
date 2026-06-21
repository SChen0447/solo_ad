import { useState, useRef, useEffect, useCallback } from 'react'
import type { Order, Material, WorkOrder, Shipment, Stats } from '@/common/types'

interface DashboardProps {
  orders: Order[]
  materials: Material[]
  workorders: WorkOrder[]
  shipments: Shipment[]
  stats: Stats | null
}

const STATUS_LABEL: Record<WorkOrder['status'], string> = {
  waiting_material: '等待物料',
  in_progress: '进行中',
  completed: '已完成',
}

const STATUS_COLOR: Record<WorkOrder['status'], string> = {
  waiting_material: '#F59E0B',
  in_progress: '#10B981',
  completed: '#6B7280',
}

const CARD_CONFIGS = [
  { key: 'todayOrders', label: '今日订单', icon: '📋', gradient: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)' },
  { key: 'pendingWorkOrders', label: '待开工工单', icon: '🔧', gradient: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)' },
  { key: 'lowStockCount', label: '库存预警', icon: '⚠️', gradient: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)', highlight: true },
  { key: 'pendingShipments', label: '待发货', icon: '📦', gradient: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)' },
] as const

export default function Dashboard({ orders, workorders, stats }: DashboardProps) {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: string; orders: number; completions: number } | null>(null)

  const associatedOrder = selectedWorkOrder
    ? orders.find(o => o.id === selectedWorkOrder.orderId)
    : null

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !stats) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const padL = 48
    const padR = 24
    const padT = 24
    const padB = 36
    const chartW = w - padL - padR
    const chartH = h - padT - padB

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#F8FAFC'
    ctx.fillRect(0, 0, w, h)

    const orderTrend = stats.orderTrend
    const completionTrend = stats.completionTrend
    const last7Days = stats.last7Days
    const allValues = [...orderTrend, ...completionTrend]
    const maxVal = Math.max(...allValues, 1)
    const yMax = Math.ceil(maxVal / 5) * 5 || 5

    const ySteps = 5
    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 1
    ctx.fillStyle = '#94A3B8'
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    for (let i = 0; i <= ySteps; i++) {
      const val = Math.round((yMax / ySteps) * i)
      const y = padT + chartH - (chartH / ySteps) * i
      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(padL + chartW, y)
      ctx.stroke()
      ctx.fillText(String(val), padL - 8, y)
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const points1: { x: number; y: number }[] = []
    const points2: { x: number; y: number }[] = []

    for (let i = 0; i < 7; i++) {
      const x = padL + (chartW / 6) * i
      const y1 = padT + chartH - (orderTrend[i] / yMax) * chartH
      const y2 = padT + chartH - (completionTrend[i] / yMax) * chartH
      points1.push({ x, y: y1 })
      points2.push({ x, y: y2 })
      ctx.fillStyle = '#94A3B8'
      ctx.fillText(last7Days[i], x, padT + chartH + 8)
    }

    const drawLine = (pts: { x: number; y: number }[], color: string, fillGrad?: [string, string]) => {
      if (pts.length < 2) return
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1]
        const curr = pts[i]
        const cpx = (prev.x + curr.x) / 2
        ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y)
      }
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.stroke()

      if (fillGrad) {
        ctx.lineTo(pts[pts.length - 1].x, padT + chartH)
        ctx.lineTo(pts[0].x, padT + chartH)
        ctx.closePath()
        const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH)
        grad.addColorStop(0, fillGrad[0])
        grad.addColorStop(1, fillGrad[1])
        ctx.fillStyle = grad
        ctx.fill()
      }

      pts.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
      })
    }

    drawLine(points2, '#3B82F6', ['rgba(59,130,246,0.15)', 'rgba(59,130,246,0)'])
    drawLine(points1, '#6366F1', ['rgba(99,102,241,0.15)', 'rgba(99,102,241,0)'])

    ctx.fillStyle = '#6366F1'
    ctx.fillRect(padL + chartW - 120, 8, 10, 10)
    ctx.fillStyle = '#334155'
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('订单量', padL + chartW - 106, 14)

    ctx.fillStyle = '#3B82F6'
    ctx.fillRect(padL + chartW - 52, 8, 10, 10)
    ctx.fillStyle = '#334155'
    ctx.fillText('完工量', padL + chartW - 38, 14)
  }, [stats])

  useEffect(() => {
    drawChart()
    const handleResize = () => drawChart()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawChart])

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!stats) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const padL = 48
    const padR = 24
    const chartW = rect.width - padL - padR

    for (let i = 0; i < 7; i++) {
      const px = padL + (chartW / 6) * i
      if (Math.abs(mx - px) < 20) {
        setTooltip({
          x: px,
          y: 40,
          day: stats.last7Days[i],
          orders: stats.orderTrend[i],
          completions: stats.completionTrend[i],
        })
        return
      }
    }
    setTooltip(null)
  }

  return (
    <div style={{ padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {CARD_CONFIGS.map(cfg => {
          const value = stats ? stats[cfg.key] : 0
          const isRed = cfg.highlight && value > 0
          return (
            <div
              key={cfg.key}
              style={{
                width: 200,
                height: 120,
                borderRadius: 12,
                background: cfg.gradient,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <span style={{ fontSize: 24, marginBottom: 4 }}>{cfg.icon}</span>
              <span style={{ fontSize: 48, fontWeight: 700, color: isRed ? '#DC2626' : '#1E293B', lineHeight: 1.1 }}>
                {value}
              </span>
              <span style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>{cfg.label}</span>
            </div>
          )
        })}
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1E293B', marginBottom: 12 }}>工单列表</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {workorders.map(wo => (
            <div
              key={wo.id}
              onClick={() => setSelectedWorkOrder(wo)}
              style={{
                height: 64,
                borderRadius: 8,
                background: '#1E293B',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                cursor: 'pointer',
                gap: 16,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#334155')}
              onMouseLeave={e => (e.currentTarget.style.background = '#1E293B')}
            >
              <span style={{ fontSize: 14, fontWeight: 500, minWidth: 80 }}>
                {wo.orderId.slice(0, 8)}
              </span>
              <span style={{ fontSize: 12, color: '#94A3B8', minWidth: 140 }}>
                开工: {wo.startTime}
              </span>
              <span style={{ fontSize: 12, color: '#94A3B8', minWidth: 140 }}>
                预计完工: {wo.estimatedEndTime}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 12,
                  padding: '2px 10px',
                  borderRadius: 12,
                  background: STATUS_COLOR[wo.status],
                  color: '#fff',
                  fontWeight: 500,
                }}
              >
                {STATUS_LABEL[wo.status]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {selectedWorkOrder && (
        <div
          onClick={() => setSelectedWorkOrder(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              minWidth: 420,
              maxWidth: 520,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1E293B', margin: 0 }}>工单详情</h4>
              <button
                onClick={() => setSelectedWorkOrder(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  color: '#94A3B8',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 14, color: '#334155', marginBottom: 8 }}>
              <span style={{ color: '#64748B' }}>工单ID：</span>
              {selectedWorkOrder.id}
            </div>
            <div style={{ fontSize: 14, color: '#334155', marginBottom: 8 }}>
              <span style={{ color: '#64748B' }}>关联订单：</span>
              {selectedWorkOrder.orderId}
            </div>
            <div style={{ fontSize: 14, color: '#334155', marginBottom: 8 }}>
              <span style={{ color: '#64748B' }}>状态：</span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: STATUS_COLOR[selectedWorkOrder.status],
                  color: '#fff',
                  fontSize: 12,
                }}
              >
                {STATUS_LABEL[selectedWorkOrder.status]}
              </span>
            </div>

            {associatedOrder && (
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: 8,
                  padding: 16,
                  margin: '12px 0',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', marginBottom: 8 }}>关联订单信息</div>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>客户：{associatedOrder.customer}</div>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>产品：{associatedOrder.product}</div>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>金额：¥{associatedOrder.amount}</div>
                <div style={{ fontSize: 13, color: '#475569' }}>截止日期：{associatedOrder.deadline}</div>
              </div>
            )}

            {selectedWorkOrder.logs.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', marginBottom: 8 }}>调度日志</div>
                {selectedWorkOrder.logs.map((log, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 13,
                      color: '#64748B',
                      padding: '4px 0',
                      borderBottom: i < selectedWorkOrder.logs.length - 1 ? '1px solid #F1F5F9' : 'none',
                    }}
                  >
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1E293B', marginBottom: 12 }}>趋势图</h3>
        <div style={{ position: 'relative', background: '#F8FAFC', borderRadius: 8, overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setTooltip(null)}
            style={{ width: '100%', height: 200, display: 'block' }}
          />
          {tooltip && (
            <div
              style={{
                position: 'absolute',
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translate(-50%, -100%)',
                background: '#1E293B',
                color: '#fff',
                borderRadius: 4,
                padding: '6px 10px',
                fontSize: 12,
                lineHeight: 1.6,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <div>{tooltip.day}</div>
              <div>订单量：{tooltip.orders}</div>
              <div>完工量：{tooltip.completions}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
