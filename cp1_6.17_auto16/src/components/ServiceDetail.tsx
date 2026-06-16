import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import type { Service, RequestLog, LatencyDistribution, ServiceStatus, FilterState } from '../types';
import { getLatencyBucketLabel, LATENCY_BUCKET_COLORS } from '../utils/metricsGenerator';

interface ServiceDetailProps {
  service: Service;
  filters: FilterState;
  onBack: () => void;
  onToggleSimulation: (serviceId: string) => void;
}

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string }> = {
  healthy: { label: '正常', color: '#10b981' },
  degraded: { label: '降级', color: '#f59e0b' },
  error: { label: '异常', color: '#ef4444' },
};

const LATENCY_BUCKETS: Array<keyof LatencyDistribution> = [
  'under50ms',
  'between50And200ms',
  'between200And500ms',
  'over500ms',
];

function LatencyPieChart({
  distribution,
  highlightBucket,
  onBucketHover,
  onBucketLeave,
  onBucketClick,
}: {
  distribution: LatencyDistribution;
  highlightBucket: keyof LatencyDistribution | null;
  onBucketHover: (bucket: keyof LatencyDistribution) => void;
  onBucketLeave: () => void;
  onBucketClick: (bucket: keyof LatencyDistribution) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredBucket, setHoveredBucket] = useState<keyof LatencyDistribution | null>(null);
  const animFrameRef = useRef<number>(0);

  const data = useMemo(() => {
    const total = distribution.under50ms + distribution.between50And200ms + distribution.between200And500ms + distribution.over500ms;
    return LATENCY_BUCKETS.map((key) => ({
      key,
      value: distribution[key],
      color: LATENCY_BUCKET_COLORS[key],
      pct: total > 0 ? (distribution[key] / total) * 100 : 0,
    }));
  }, [distribution]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const mx = (e.clientX - rect.left);
      const my = (e.clientY - rect.top);
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const radius = Math.min(cx, cy) - 20;

      const dx = mx - cx;
      const dy = my - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius || dist < radius * 0.4) {
        if (hoveredBucket) {
          setHoveredBucket(null);
          onBucketLeave();
        }
        return;
      }

      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += Math.PI * 2;

      const total = data.reduce((s, d) => s + d.value, 0);
      let startAngle = -Math.PI / 2;
      for (const d of data) {
        const sweep = (d.value / total) * Math.PI * 2;
        const endAngle = startAngle + sweep;
        if (angle >= startAngle && angle < endAngle) {
          if (hoveredBucket !== d.key) {
            setHoveredBucket(d.key);
            onBucketHover(d.key);
          }
          return;
        }
        startAngle = endAngle;
      }
    },
    [data, hoveredBucket, onBucketHover, onBucketLeave]
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const radius = Math.min(cx, cy) - 20;

      const dx = mx - cx;
      const dy = my - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius || dist < radius * 0.4) return;

      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += Math.PI * 2;

      const total = data.reduce((s, d) => s + d.value, 0);
      let startAngle = -Math.PI / 2;
      for (const d of data) {
        const sweep = (d.value / total) * Math.PI * 2;
        const endAngle = startAngle + sweep;
        if (angle >= startAngle && angle < endAngle) {
          onBucketClick(d.key);
          return;
        }
        startAngle = endAngle;
      }
    },
    [data, onBucketClick]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const baseRadius = Math.min(cx, cy) - 20;

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      const total = data.reduce((s, d) => s + d.value, 0);
      let startAngle = -Math.PI / 2;
      const activeKey = highlightBucket || hoveredBucket;

      for (const d of data) {
        if (total === 0) break;
        const sweep = (d.value / total) * Math.PI * 2;
        if (sweep === 0) {
          startAngle += sweep;
          continue;
        }
        const endAngle = startAngle + sweep;
        const isActive = activeKey === d.key;
        const radius = isActive ? baseRadius + 8 : baseRadius;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = d.color;
        ctx.globalAlpha = isActive ? 1 : 0.85;
        ctx.fill();

        ctx.strokeStyle = '#1e1e2e';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;

        if (isActive && d.pct > 2) {
          const midAngle = startAngle + sweep / 2;
          const labelR = radius * 0.7;
          const lx = cx + Math.cos(midAngle) * labelR;
          const ly = cy + Math.sin(midAngle) * labelR;

          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 4;
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 13px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${d.pct.toFixed(1)}%`, lx, ly - 8);
          ctx.font = '11px system-ui';
          ctx.fillStyle = '#e4e4e7';
          ctx.fillText(`${d.value}`, lx, ly + 8);
          ctx.restore();
        }

        startAngle = endAngle;
      }

      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#2a2a3c';
      ctx.fill();
      ctx.strokeStyle = '#3f3f5c';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('总请求', cx, cy - 8);
      ctx.font = 'bold 18px system-ui';
      ctx.fillStyle = '#7c3aed';
      ctx.fillText(total.toString(), cx, cy + 12);
    };

    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(draw);

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', onBucketLeave);
    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', onBucketLeave);
      canvas.removeEventListener('click', handleClick);
    };
  }, [data, highlightBucket, hoveredBucket, handleMouseMove, handleClick, onBucketLeave]);

  return <canvas ref={canvasRef} className="pie-chart" />;
}

function getMethodColor(method: RequestLog['method']): string {
  switch (method) {
    case 'GET':
      return '#10b981';
    case 'POST':
      return '#3b82f6';
    case 'PUT':
      return '#f59e0b';
    case 'DELETE':
      return '#ef4444';
    case 'PATCH':
      return '#8b5cf6';
  }
}

function getStatusClass(code: number): string {
  if (code < 400) return 'status-ok';
  if (code < 500) return 'status-warn';
  return 'status-err';
}

export function ServiceDetail({ service, filters, onBack, onToggleSimulation }: ServiceDetailProps) {
  const [visibleCount, setVisibleCount] = useState(30);
  const [highlightBucket, setHighlightBucket] = useState<keyof LatencyDistribution | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const displayStatus = service.simulatedOff ? 'error' : service.status;
  const cfg = STATUS_CONFIG[displayStatus];

  const filteredRequests = useMemo(() => {
    let reqs = service.metrics.recentRequests;
    if (highlightBucket) {
      reqs = reqs.filter((r) => r.latencyBucket === highlightBucket);
    }
    return reqs;
  }, [service.metrics.recentRequests, highlightBucket]);

  const visibleRequests = useMemo(() => filteredRequests.slice(0, visibleCount), [filteredRequests, visibleCount]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
      setVisibleCount((c) => Math.min(c + 20, filteredRequests.length));
    }
  }, [filteredRequests.length]);

  useEffect(() => {
    setVisibleCount(30);
  }, [service.id, highlightBucket, filters.timeRange]);

  const handleBucketClick = useCallback((bucket: keyof LatencyDistribution) => {
    setHighlightBucket((prev) => (prev === bucket ? null : bucket));
  }, []);

  const handleRequestClick = useCallback((log: RequestLog) => {
    setHighlightBucket(log.latencyBucket);
  }, []);

  const totalRequests = service.metrics.requestVolume.reduce((s, r) => s + r.count, 0);

  return (
    <div className="service-detail fade-in">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          <span className="back-arrow">←</span>
          返回看板
        </button>
        <div className="detail-title-wrap">
          <h1 className="detail-title">{service.name}</h1>
          <span className="status-badge" style={{ backgroundColor: cfg.color + '22', color: cfg.color }}>
            <span className="status-dot" style={{ backgroundColor: cfg.color }} />
            {service.simulatedOff ? '已模拟关闭' : cfg.label}
          </span>
        </div>
        <div className="detail-actions">
          <button
            className={`toggle-btn large ${service.simulatedOff ? 'toggle-off' : 'toggle-on'}`}
            onClick={() => onToggleSimulation(service.id)}
          >
            <span className="toggle-slider" />
            <span className="toggle-label">{service.simulatedOff ? '模拟开启' : '模拟关闭'}</span>
          </button>
        </div>
      </div>

      <div className="detail-metrics-row">
        <div className="metric-card">
          <span className="mc-label">服务类型</span>
          <span className="mc-value">{service.type}</span>
        </div>
        <div className="metric-card">
          <span className="mc-label">端口</span>
          <span className="mc-value">:{service.port}</span>
        </div>
        <div className="metric-card">
          <span className="mc-label">副本数</span>
          <span className="mc-value">{service.replicas}</span>
        </div>
        <div className="metric-card">
          <span className="mc-label">5分钟请求</span>
          <span className="mc-value">{totalRequests.toLocaleString()}</span>
        </div>
        <div className="metric-card">
          <span className="mc-label">平均延迟</span>
          <span className="mc-value">{service.metrics.avgLatency}ms</span>
        </div>
        <div className="metric-card">
          <span className="mc-label">P95延迟</span>
          <span className="mc-value">{service.metrics.p95Latency}ms</span>
        </div>
        <div className="metric-card">
          <span className="mc-label">P99延迟</span>
          <span className="mc-value">{service.metrics.p99Latency}ms</span>
        </div>
        <div className="metric-card">
          <span className="mc-label">活跃连接</span>
          <span className="mc-value">{service.metrics.activeConnections}</span>
        </div>
      </div>

      <div className="detail-content">
        <div className="list-panel">
          <div className="panel-header">
            <h2 className="panel-title">
              历史请求
              <span className="panel-count">({filteredRequests.length})</span>
            </h2>
            {highlightBucket && (
              <button className="clear-filter-btn" onClick={() => setHighlightBucket(null)}>
                清除筛选 ×
              </button>
            )}
          </div>
          <div className="list-table-header">
            <span className="col-time">时间</span>
            <span className="col-method">方法</span>
            <span className="col-path">路径</span>
            <span className="col-status">状态</span>
            <span className="col-latency">延迟</span>
          </div>
          <div
            className="request-list"
            ref={listRef}
            onScroll={handleScroll}
          >
            {visibleRequests.length === 0 ? (
              <div className="empty-list">暂无请求记录</div>
            ) : (
              visibleRequests.map((log) => (
                <div
                  key={log.id}
                  className={`request-item ${highlightBucket === log.latencyBucket ? 'highlighted' : ''}`}
                  onClick={() => handleRequestClick(log)}
                >
                  <span className="col-time">{format(log.timestamp, 'HH:mm:ss.SSS')}</span>
                  <span className="col-method">
                    <span className="method-tag" style={{ backgroundColor: getMethodColor(log.method) + '22', color: getMethodColor(log.method) }}>
                      {log.method}
                    </span>
                  </span>
                  <span className="col-path" title={log.path}>{log.path}</span>
                  <span className="col-status">
                    <span className={`status-tag ${getStatusClass(log.statusCode)}`}>{log.statusCode}</span>
                  </span>
                  <span className="col-latency" style={{ color: LATENCY_BUCKET_COLORS[log.latencyBucket] }}>
                    {log.latency}ms
                  </span>
                </div>
              ))
            )}
            {visibleCount < filteredRequests.length && (
              <div className="load-more-indicator">滚动加载更多...</div>
            )}
          </div>
        </div>

        <div className="chart-panel">
          <div className="panel-header">
            <h2 className="panel-title">延迟分布</h2>
          </div>
          <div className="pie-wrap">
            <LatencyPieChart
              distribution={service.metrics.latencyDistribution}
              highlightBucket={highlightBucket}
              onBucketHover={(b) => {}}
              onBucketLeave={() => {}}
              onBucketClick={handleBucketClick}
            />
          </div>
          <div className="legend-list">
            {LATENCY_BUCKETS.map((key) => {
              const total = Object.values(service.metrics.latencyDistribution).reduce((s, v) => s + v, 0);
              const val = service.metrics.latencyDistribution[key];
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
              return (
                <button
                  key={key}
                  className={`legend-item ${highlightBucket === key ? 'legend-active' : ''}`}
                  onClick={() => handleBucketClick(key)}
                >
                  <span className="legend-color" style={{ backgroundColor: LATENCY_BUCKET_COLORS[key] }} />
                  <span className="legend-label">{getLatencyBucketLabel(key)}</span>
                  <span className="legend-value">{val} ({pct}%)</span>
                </button>
              );
            })}
          </div>
          <div className="tip-text">
            💡 点击扇区或图例筛选请求；点击列表项高亮对应延迟区间
          </div>
        </div>
      </div>
    </div>
  );
}
