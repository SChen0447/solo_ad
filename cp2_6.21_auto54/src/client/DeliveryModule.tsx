import { useState, useMemo } from 'react';
import type { Order, DeliveryTask, DeliveryZone } from './types';
import { ZONE_COLORS, ZONE_LABELS, STATUS_LABELS } from './types';

interface DeliveryModuleProps {
  orders: Order[];
  deliveryTasks: DeliveryTask[];
  onReordered: () => void;
}

interface ZoneDeliveryData {
  zone: DeliveryZone;
  orders: Order[];
  tasks: DeliveryTask[];
  totalTime: number;
}

function DragIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#9CA3AF">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

function TruckIconSmall({ spinning }: { spinning: boolean }) {
  return (
    <span className={spinning ? 'truck-icon' : ''} style={{ display: 'inline-flex' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16,8 20,8 23,11 23,16 16,16 16,8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    </span>
  );
}

function MapPinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function DeliveryNode({
  order,
  task,
  index,
  total,
  zone,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
}: {
  order: Order;
  task: DeliveryTask;
  index: number;
  total: number;
  zone: DeliveryZone;
  onDragStart: (orderId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (targetOrderId: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}) {
  const [clicked, setClicked] = useState(false);
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const isDelivering = order.status === 'delivering';

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 150);
  };

  return (
    <div
      draggable
      onDragStart={() => onDragStart(order.id)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(order.id)}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      className={`card ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} ${clicked ? 'clicked' : ''}`}
      style={{
        marginBottom: 0,
        marginTop: isFirst ? 0 : 12,
        position: 'relative',
      }}
    >
      {!isFirst && (
        <div
          style={{
            position: 'absolute',
            left: 24,
            top: -13,
            width: 2,
            height: 13,
            background: ZONE_COLORS[zone],
          }}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div className="drag-handle" style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <DragIcon />
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: isDelivering ? '#F97316' : ZONE_COLORS[zone],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: isDelivering ? '#ffffff' : '#374151',
            }}
          >
            {index + 1}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isDelivering && <span style={{ color: '#F97316' }}><TruckIconSmall spinning /></span>}
              <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                {order.items.map((i) => i.productName).join('、')}
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#F97316' }}>
              ¥{order.totalAmount.toFixed(1)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <MapPinIcon />
            <span style={{ fontSize: 12, color: '#6B7280' }}>{order.address}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{order.contactName}</span>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: order.status === 'delivering' ? '#F97316' : '#10B981',
                  color: '#ffffff',
                  fontWeight: 500,
                }}
              >
                {STATUS_LABELS[order.status]}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>
                预计 {task.estimatedTime} 分钟
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ZoneSection({
  data,
  onReordered,
}: {
  data: ZoneDeliveryData;
  onReordered: (orderId: string, newPosition: number) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const sortedOrders = useMemo(() => {
    return [...data.orders].sort((a, b) => {
      const ta = data.tasks.find((t) => t.orderId === a.id);
      const tb = data.tasks.find((t) => t.orderId === b.id);
      return (ta?.deliveryOrder || 999) - (tb?.deliveryOrder || 999);
    });
  }, [data.orders, data.tasks]);

  const handleDragStart = (orderId: string) => {
    setDraggingId(orderId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (orderId: string) => {
    if (draggingId && draggingId !== orderId) {
      setDragOverId(orderId);
    }
  };

  const handleDrop = (targetOrderId: string) => {
    if (!draggingId || draggingId === targetOrderId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    const newPosition = sortedOrders.findIndex((o) => o.id === targetOrderId);
    onReordered(draggingId, newPosition);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          background: ZONE_COLORS[data.zone],
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#374151',
              fontSize: 14,
            }}
          >
            {data.zone}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
              {ZONE_LABELS[data.zone]}
            </div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              {data.orders.length} 个订单待配送
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#6B7280' }}>预计总耗时</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>{data.totalTime} 分钟</div>
        </div>
      </div>

      {sortedOrders.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: '#9CA3AF',
            fontSize: 13,
            background: '#F9FAFB',
            borderRadius: 12,
            border: '2px dashed #E5E7EB',
          }}
        >
          暂无待配送订单
        </div>
      ) : (
        sortedOrders.map((order, idx) => {
          const task = data.tasks.find((t) => t.orderId === order.id)!;
          return (
            <div key={order.id} onDragEnter={() => handleDragEnter(order.id)}>
              <DeliveryNode
                order={order}
                task={task}
                index={idx}
                total={sortedOrders.length}
                zone={data.zone}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                isDragging={draggingId === order.id}
                isDragOver={dragOverId === order.id}
              />
            </div>
          );
        })
      )}
    </div>
  );
}

export default function DeliveryModule({
  orders,
  deliveryTasks,
  onReordered,
}: DeliveryModuleProps) {
  const zonesData = useMemo((): ZoneDeliveryData[] => {
    const zones: DeliveryZone[] = ['A', 'B', 'C'];
    return zones.map((zone) => {
      const zoneOrders = orders.filter(
        (o) => o.zone === zone && (o.status === 'paid' || o.status === 'delivering')
      );
      const zoneTasks = deliveryTasks.filter((t) => t.zone === zone && t.status !== 'completed');
      const totalTime = zoneTasks.reduce((sum, t) => sum + t.estimatedTime, 0);
      return {
        zone,
        orders: zoneOrders,
        tasks: zoneTasks,
        totalTime,
      };
    });
  }, [orders, deliveryTasks]);

  const totalPending = zonesData.reduce((sum, z) => sum + z.orders.length, 0);
  const totalTime = zonesData.reduce((sum, z) => sum + z.totalTime, 0);

  const handleReorder = async (zone: DeliveryZone, orderId: string, newPosition: number) => {
    await fetch('/api/delivery/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone, orderId, newPosition }),
    });
    onReordered();
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>配送调度</h2>
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>
          共 <span style={{ color: '#F97316', fontWeight: 600 }}>{totalPending}</span> 个订单待配送，
          预计总耗时 <span style={{ color: '#F97316', fontWeight: 600 }}>{totalTime}</span> 分钟
        </p>
      </div>

      <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FFF7ED', borderRadius: 8, border: '1px solid #FED7AA' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#C2410C' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          拖动左侧圆点可调整同一区域内的配送顺序
        </div>
      </div>

      {zonesData.map((data) => (
        <ZoneSection
          key={data.zone}
          data={data}
          onReordered={(orderId, newPosition) => handleReorder(data.zone, orderId, newPosition)}
        />
      ))}
    </div>
  );
}
