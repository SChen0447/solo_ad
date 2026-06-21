import { useState } from 'react'
import type { Shipment, Order } from '@/common/types'

interface ShipmentTimelineProps {
  shipments: Shipment[]
  orders: Order[]
  onRefresh: () => void
}

export default function ShipmentTimeline({ shipments, orders, onRefresh }: ShipmentTimelineProps) {
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())

  const today = new Date().toISOString().slice(0, 10)

  const pending = shipments
    .filter(s => !s.completed)
    .sort((a, b) => a.estimatedShipDate.localeCompare(b.estimatedShipDate))

  const findOrder = (orderId: string) => orders.find(o => o.id === orderId)

  const handleComplete = (shipment: Shipment) => {
    setCompletingIds(prev => new Set(prev).add(shipment.id))
    setTimeout(() => {
      fetch(`/api/shipments/${shipment.id}/complete`, { method: 'POST' })
        .then(() => onRefresh())
        .catch(() => onRefresh())
    }, 500)
  }

  if (pending.length === 0) {
    return <div style={{ textAlign: 'center', color: '#94A3B8', padding: '32px 0' }}>暂无待发货记录</div>
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      {pending.map((shipment, index) => {
        const order = findOrder(shipment.orderId)
        const isToday = shipment.estimatedShipDate === today
        const isCompleting = completingIds.has(shipment.id)
        const isLast = index === pending.length - 1

        return (
          <div
            key={shipment.id}
            style={{ display: 'flex', alignItems: 'flex-start', marginBottom: isLast ? 0 : 12, position: 'relative' }}
            className={isCompleting ? 'slide-out-right' : undefined}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 12 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: isCompleting ? '#10B981' : '#6366F1',
                  flexShrink: 0,
                }}
              />
              {!isLast && (
                <div style={{ width: 2, flexGrow: 1, minHeight: 40, background: '#E2E8F0' }} />
              )}
            </div>

            <div
              style={{
                marginLeft: 16,
                flex: 1,
                background: '#fff',
                borderRadius: 8,
                padding: 16,
                boxShadow: '#CBD5E1 0 2px 6px',
                borderLeft: isToday ? '4px solid #3B82F6' : '4px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>
                  #{shipment.orderId.slice(0, 8)}
                </span>
                <input
                  type="checkbox"
                  checked={isCompleting}
                  onChange={() => handleComplete(shipment)}
                  disabled={isCompleting}
                  style={{ width: 18, height: 18, cursor: isCompleting ? 'not-allowed' : 'pointer', accentColor: '#10B981' }}
                />
              </div>
              {order && (
                <div style={{ marginTop: 4, color: '#64748B', fontSize: 13 }}>
                  {order.customer} · {order.product}
                </div>
              )}
              <div style={{ marginTop: 4, color: '#64748B', fontSize: 13 }}>
                预计发货：{shipment.estimatedShipDate}
              </div>
              <div style={{ marginTop: 4, color: '#94A3B8', fontSize: 12 }}>
                📍 {shipment.address}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
