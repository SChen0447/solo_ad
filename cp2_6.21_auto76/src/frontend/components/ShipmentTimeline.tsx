import { useState } from 'react';
import type { Shipment } from '../../common/types';

interface ShipmentTimelineProps {
  shipments: Shipment[];
  onComplete: (shipmentId: string) => void;
}

function ShipmentItem({
  shipment,
  isToday,
  onComplete,
}: {
  shipment: Shipment;
  isToday: boolean;
  onComplete: () => void;
}) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [completed, setCompleted] = useState(shipment.completed);

  const handleCheck = () => {
    if (completed) return;
    setIsCompleting(true);
    setTimeout(() => {
      setCompleted(true);
      onComplete();
    }, 500);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        position: 'relative',
        paddingBottom: 24,
        opacity: completed ? 0 : 1,
        transform: completed ? 'translateX(100%)' : 'translateX(0)',
        transition: 'all 0.5s ease-out',
      }}
    >
      <div style={{ position: 'relative', width: 24, flexShrink: 0 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: completed ? '#10B981' : '#6366F1',
            position: 'absolute',
            top: 4,
            left: 6,
            boxShadow: completed ? '0 0 0 4px #D1FAE5' : '0 0 0 4px #E0E7FF',
            transition: 'all 0.3s',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 11,
            width: 2,
            bottom: 0,
            background: '#E2E8F0',
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          background: '#fff',
          borderRadius: 8,
          padding: 16,
          boxShadow: '0 2px 6px #CBD5E1',
          borderLeft: isToday ? '4px solid #3B82F6' : '4px solid transparent',
          transition: 'all 0.2s ease-out',
          position: 'relative',
        }}
      >
        {isToday && (
          <span
            style={{
              position: 'absolute',
              top: -8,
              right: 12,
              background: '#3B82F6',
              color: '#fff',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 10,
              fontWeight: 500,
            }}
          >
            今天
          </span>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
              {shipment.orderNumber}
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 4 }}>
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ verticalAlign: 'text-bottom', marginRight: 4 }}
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {shipment.address}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>
              预计发货: {new Date(shipment.shipDate).toLocaleDateString('zh-CN')}
            </div>
          </div>

          <label
            style={{
              position: 'relative',
              width: 22,
              height: 22,
              cursor: completed ? 'default' : 'pointer',
              flexShrink: 0,
            }}
          >
            <input
              type="checkbox"
              checked={completed || isCompleting}
              onChange={handleCheck}
              style={{ display: 'none' }}
            />
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                border: '2px solid #CBD5E1',
                background: completed || isCompleting ? '#10B981' : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {(completed || isCompleting) && (
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: isCompleting ? 'scale(1.2)' : 'scale(1)',
                    transition: 'transform 0.2s',
                  }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

function ShipmentTimeline({ shipments, onComplete }: ShipmentTimelineProps) {
  const activeShipments = shipments.filter((s) => !s.completed);

  const groupedByDate = activeShipments.reduce((acc, shipment) => {
    const date = new Date(shipment.shipDate).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(shipment);
    return acc;
  }, {} as Record<string, Shipment[]>);

  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const today = new Date().toDateString();

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1E293B', margin: '0 0 20px 0' }}>
        发货计划
      </h2>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 2px 6px #CBD5E1',
        }}
      >
        {sortedDates.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: '#94A3B8',
              fontSize: 14,
            }}
          >
            <svg
              width={48}
              height={48}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: '0 auto 12px', opacity: 0.5 }}
            >
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            暂无待发货订单
          </div>
        ) : (
          sortedDates.map((date) => {
            const dateShipments = groupedByDate[date];
            const isToday = date === today;

            return (
              <div key={date} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isToday ? '#3B82F6' : '#64748B',
                    marginBottom: 12,
                    paddingLeft: 32,
                  }}
                >
                  {new Date(date).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </div>
                {dateShipments.map((shipment) => (
                  <ShipmentItem
                    key={shipment.id}
                    shipment={shipment}
                    isToday={isToday}
                    onComplete={() => onComplete(shipment.id)}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default ShipmentTimeline;
