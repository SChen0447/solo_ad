import { useEffect, useRef, memo } from 'react';
import type { Service, ServiceStatus, FilterState } from '../types';

interface ServiceCardProps {
  service: Service;
  filters: FilterState;
  onClick: (serviceId: string) => void;
  onToggleSimulation: (serviceId: string) => void;
}

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; bg: string; pulse: string }> = {
  healthy: { label: '正常', color: '#10b981', bg: 'rgba(16,185,129,0.12)', pulse: 'pulse-green' },
  degraded: { label: '降级', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', pulse: 'pulse-yellow' },
  error: { label: '异常', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', pulse: 'pulse-red' },
};

function MiniLineChart({ data, color }: { data: { count: number }[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const pad = 4;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      if (data.length < 2) return;
      const counts = data.map((d) => d.count);
      const max = Math.max(...counts, 1);
      const min = Math.min(...counts, 0);
      const range = max - min || 1;
      const stepX = (W - pad * 2) / (counts.length - 1);

      const grad = ctx.createLinearGradient(0, pad, 0, H - pad);
      grad.addColorStop(0, color + '55');
      grad.addColorStop(1, color + '00');

      ctx.beginPath();
      ctx.moveTo(pad, H - pad);
      counts.forEach((c, i) => {
        const x = pad + i * stepX;
        const y = H - pad - ((c - min) / range) * (H - pad * 2);
        ctx.lineTo(x, y);
      });
      ctx.lineTo(pad + (counts.length - 1) * stepX, H - pad);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      counts.forEach((c, i) => {
        const x = pad + i * stepX;
        const y = H - pad - ((c - min) / range) * (H - pad * 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animRef.current);
  }, [data, color]);

  return <canvas ref={canvasRef} className="mini-chart" />;
}

function ServiceCardImpl({ service, filters, onClick, onToggleSimulation }: ServiceCardProps) {
  const cfg = STATUS_CONFIG[service.simulatedOff ? 'error' : service.status];
  const displayStatus = service.simulatedOff ? 'error' : service.status;
  const totalRequests = service.metrics.requestVolume.reduce((s, r) => s + r.count, 0);

  const matchesFilter =
    (filters.serviceType === 'all' || filters.serviceType === service.type) &&
    (filters.status === 'all' || filters.status === displayStatus);

  if (!matchesFilter) return null;

  return (
    <div
      className={`service-card fade-in ${service.simulatedOff ? 'card-off' : ''}`}
      onClick={() => onClick(service.id)}
    >
      <div className="card-header">
        <div className="card-title-row">
          <h3 className="card-title">{service.name}</h3>
          <button
            className={`toggle-btn ${service.simulatedOff ? 'toggle-off' : 'toggle-on'}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSimulation(service.id);
            }}
            title={service.simulatedOff ? '模拟开启服务' : '模拟关闭服务'}
          >
            <span className="toggle-slider" />
          </button>
        </div>
        <span className={`status-badge ${cfg.pulse}`} style={{ backgroundColor: cfg.bg, color: cfg.color }}>
          <span className="status-dot" style={{ backgroundColor: cfg.color }} />
          {service.simulatedOff ? '已模拟关闭' : cfg.label}
        </span>
      </div>

      <p className="card-desc">{service.description}</p>

      <div className="card-metrics">
        <div className="metric-item">
          <span className="metric-label">端口</span>
          <span className="metric-value">:{service.port}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">副本</span>
          <span className="metric-value">{service.replicas}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">5min请求</span>
          <span className="metric-value">{totalRequests.toLocaleString()}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">平均延迟</span>
          <span className="metric-value">{service.metrics.avgLatency}ms</span>
        </div>
      </div>

      <div className="card-chart-wrap">
        <div className="chart-label">最近5分钟请求量趋势</div>
        <MiniLineChart data={service.metrics.requestVolume} color={cfg.color} />
      </div>

      <div className="card-footer">
        <span className="error-rate" style={{ color: service.metrics.errorRate > 5 ? '#ef4444' : '#10b981' }}>
          错误率: {service.metrics.errorRate}%
        </span>
        <span className="conn-count">连接: {service.metrics.activeConnections}</span>
      </div>
    </div>
  );
}

export const ServiceCard = memo(ServiceCardImpl);
