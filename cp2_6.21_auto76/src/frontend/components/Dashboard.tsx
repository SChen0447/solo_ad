import { useEffect, useRef, useState } from 'react';
import type { WorkOrder, Order, TrendData } from '../../common/types';

interface DashboardProps {
  todayOrders: number;
  pendingWorkOrders: number;
  lowStockCount: number;
  pendingShipments: number;
  workOrders: WorkOrder[];
  orders: Order[];
  trends: TrendData[];
}

const statCards = [
  { label: '今日订单', key: 'todayOrders', gradient: 'linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%)', color: '#6366F1' },
  { label: '待开工单', key: 'pendingWorkOrders', gradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', color: '#F59E0B' },
  { label: '库存预警', key: 'lowStockCount', gradient: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)', color: '#EF4444' },
  { label: '待发货', key: 'pendingShipments', gradient: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)', color: '#3B82F6' },
];

const statusBadge: Record<string, { label: string; color: string; bg: string }> = {
  waiting: { label: '等待物料', color: '#92400E', bg: '#FEF3C7' },
  inProgress: { label: '进行中', color: '#065F46', bg: '#D1FAE5' },
  completed: { label: '已完成', color: '#374151', bg: '#E5E7EB' },
};

function TrendChart({ data }: { data: TrendData[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const maxValue = Math.max(...data.map((d) => Math.max(d.orders, d.completed))) * 1.2 || 10;
    const xStep = chartWidth / (data.length - 1);

    const getX = (index: number) => padding.left + index * xStep;
    const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    const drawArea = (values: number[], color: string) => {
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, color + '40');
      gradient.addColorStop(1, color + '00');

      ctx.beginPath();
      ctx.moveTo(getX(0), getY(values[0]));
      for (let i = 1; i < values.length; i++) {
        ctx.lineTo(getX(i), getY(values[i]));
      }
      ctx.lineTo(getX(data.length - 1), height - padding.bottom);
      ctx.lineTo(getX(0), height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    };

    const drawLine = (values: number[], color: string) => {
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(values[0]));
      for (let i = 1; i < values.length; i++) {
        ctx.lineTo(getX(i), getY(values[i]));
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    drawArea(data.map((d) => d.orders), '#6366F1');
    drawLine(data.map((d) => d.orders), '#6366F1');
    drawLine(data.map((d) => d.completed), '#10B981');

    const drawDots = (values: number[], color: string) => {
      values.forEach((value, i) => {
        ctx.beginPath();
        ctx.arc(getX(i), getY(value), 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    };

    drawDots(data.map((d) => d.orders), '#6366F1');
    drawDots(data.map((d) => d.completed), '#10B981');

    ctx.fillStyle = '#64748B';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    data.forEach((d, i) => {
      ctx.fillText(d.date, getX(i), height - 10);
    });

    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      const value = Math.round(maxValue - (maxValue / 4) * i);
      ctx.fillText(String(value), padding.left - 8, y + 4);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let closestIndex = -1;
      let closestDist = Infinity;

      for (let i = 0; i < data.length; i++) {
        const px = getX(i);
        const dist = Math.abs(x - px);
        if (dist < closestDist && dist < 20) {
          closestDist = dist;
          closestIndex = i;
        }
      }

      if (closestIndex >= 0) {
        const d = data[closestIndex];
        setTooltip({
          x: getX(closestIndex),
          y: 10,
          content: `${d.date}\n订单: ${d.orders}\n完工: ${d.completed}`,
        });
      } else {
        setTooltip(null);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', () => setTooltip(null));

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', () => setTooltip(null));
    };
  }, [data]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 200 }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: 200, background: '#F8FAFC', borderRadius: 8 }}
      />
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%)',
            background: '#1E293B',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 4,
            fontSize: 12,
            whiteSpace: 'pre-line',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {tooltip.content}
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, position: 'absolute', top: 8, right: 16, fontSize: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B' }}>
          <span style={{ width: 12, height: 3, background: '#6366F1', borderRadius: 2 }} />
          订单量
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B' }}>
          <span style={{ width: 12, height: 3, background: '#10B981', borderRadius: 2 }} />
          完工量
        </span>
      </div>
    </div>
  );
}

function WorkOrderModal({
  workOrder,
  order,
  onClose,
}: {
  workOrder: WorkOrder;
  order?: Order;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#00000070',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          width: 480,
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: 0, fontSize: 18, color: '#1E293B' }}>工单详情</h3>
        </div>
        <div style={{ padding: 20 }}>
          {order && (
            <div style={{ marginBottom: 16, padding: 12, background: '#F8FAFC', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>关联订单</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1E293B' }}>
                {order.customer} - {order.product}
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                数量: {order.quantity} | 金额: ¥{order.amount}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>优先级</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: workOrder.priority === 'high' ? '#EF4444' : '#64748B' }}>
                {workOrder.priority === 'high' ? '高优先级' : '普通优先级'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>状态</div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 500,
                  color: statusBadge[workOrder.status].color,
                  background: statusBadge[workOrder.status].bg,
                }}
              >
                {statusBadge[workOrder.status].label}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>开始时间</div>
              <div style={{ fontSize: 13, color: '#1E293B' }}>
                {new Date(workOrder.startTime).toLocaleString('zh-CN')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>预计完成</div>
              <div style={{ fontSize: 13, color: '#1E293B' }}>
                {new Date(workOrder.estimatedEndTime).toLocaleString('zh-CN')}
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1E293B', marginBottom: 8 }}>排程日志</div>
            <div style={{ background: '#F8FAFC', borderRadius: 8, padding: 12 }}>
              {workOrder.logs.map((log, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: '#64748B',
                    padding: '6px 0',
                    borderBottom: i < workOrder.logs.length - 1 ? '1px dashed #E2E8F0' : 'none',
                  }}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({
  todayOrders,
  pendingWorkOrders,
  lowStockCount,
  pendingShipments,
  workOrders,
  orders,
  trends,
}: DashboardProps) {
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  const stats = { todayOrders, pendingWorkOrders, lowStockCount, pendingShipments };

  const sortedWorkOrders = [...workOrders].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1E293B', margin: '0 0 20px 0' }}>生产概览</h2>

      <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        {statCards.map((card) => (
          <div
            key={card.key}
            style={{
              width: 200,
              height: 120,
              borderRadius: 12,
              background: card.gradient,
              padding: 16,
              boxShadow: '0 2px 6px #CBD5E1',
              boxSizing: 'border-box',
              transition: 'transform 0.2s ease-out',
              cursor: 'default',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <div style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{card.label}</div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: card.color,
                lineHeight: 1,
                marginTop: 12,
              }}
            >
              {stats[card.key as keyof typeof stats]}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 6px #CBD5E1',
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1E293B', margin: '0 0 16px 0' }}>
          7天趋势
        </h3>
        <TrendChart data={trends} />
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 6px #CBD5E1',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1E293B', margin: '0 0 16px 0' }}>
          最近工单
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sortedWorkOrders.slice(0, 5).map((wo) => {
            const order = orders.find((o) => o.id === wo.orderId);
            const badge = statusBadge[wo.status];

            return (
              <div
                key={wo.id}
                onClick={() => setSelectedWO(wo)}
                style={{
                  height: 64,
                  borderRadius: 8,
                  background: '#1E293B',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#334155';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#1E293B';
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 4 }}>
                    工单 #{wo.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>
                    {order ? `${order.customer} - ${order.product}` : '未知订单'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500,
                      color: badge.color,
                      background: badge.bg,
                    }}
                  >
                    {badge.label}
                  </span>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    预计 {new Date(wo.estimatedEndTime).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>
            );
          })}
          {sortedWorkOrders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 13 }}>
              暂无工单
            </div>
          )}
        </div>
      </div>

      {selectedWO && (
        <WorkOrderModal
          workOrder={selectedWO}
          order={orders.find((o) => o.id === selectedWO.orderId)}
          onClose={() => setSelectedWO(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;
