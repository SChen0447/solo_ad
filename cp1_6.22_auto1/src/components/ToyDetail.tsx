import { useRef, useEffect, useState, useCallback } from 'react';
import { Toy, Cat, DailyStats, CatReaction, getDailyStats, getInteractionsByToyId, getToyUsageCount } from '../utils/database';

interface ToyDetailProps {
  toy: Toy;
  cat: Cat;
  onRecordInteraction: (toyId: number, data: {
    duration: number; reaction: CatReaction; damaged: boolean;
  }) => void;
  onDelete: () => void;
}

const typeLabels: Record<string, string> = {
  chase: '追逐型',
  scratch: '抓挠型',
  puzzle: '智力型',
};

const dangerLabels: Record<string, { icon: string; label: string }> = {
  safe: { icon: '😊', label: '安全' },
  supervise: { icon: '⚠️', label: '需监督' },
  avoid: { icon: '❌', label: '避免' },
};

const reactionEmojis: Record<CatReaction, string> = {
  excited: '😸',
  normal: '😺',
  ignore: '😾',
};

const reactionLabels: Record<CatReaction, string> = {
  excited: '很兴奋',
  normal: '一般',
  ignore: '不理睬',
};

interface ChartPoint {
  x: number;
  y: number;
  value: number;
  date: string;
}

function ToyDetail({ toy, cat, onRecordInteraction, onDelete }: ToyDetailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartPointsRef = useRef<ChartPoint[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: string; visible: boolean }>({
    x: 0, y: 0, value: '', visible: false
  });
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [duration, setDuration] = useState(10);
  const [reaction, setReaction] = useState<CatReaction>('normal');
  const [damaged, setDamaged] = useState(false);

  const loadData = useCallback(() => {
    const stats = getDailyStats(toy.id, 14);
    const records = getInteractionsByToyId(toy.id);
    setDailyStats(stats);
    setInteractions(records);
  }, [toy.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || dailyStats.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = 250;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const maxDuration = Math.max(...dailyStats.map(d => d.total_duration), 10);
    const yStep = Math.ceil(maxDuration / 5);
    const yMax = yStep * 5;

    ctx.strokeStyle = '#F0E6D8';
    ctx.lineWidth = 1;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + chartHeight - (chartHeight * (i * yStep) / yMax);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${i * yStep}分`, padding.left - 10, y);
    }

    const xStep = chartWidth / (dailyStats.length - 1 || 1);
    const points: { x: number; y: number; value: number; date: string }[] = [];

    dailyStats.forEach((d, i) => {
      const x = padding.left + i * xStep;
      const y = padding.top + chartHeight - (chartHeight * d.total_duration / yMax);
      points.push({ x, y, value: d.total_duration, date: d.date });
    });

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(255, 122, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 122, 0, 0.02)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding.bottom);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = '#FF7A00';
    ctx.lineWidth = 2.5;
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#FF7A00';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.fillStyle = '#999';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelStep = Math.max(1, Math.floor(dailyStats.length / 7));
    dailyStats.forEach((d, i) => {
      if (i % labelStep === 0 || i === dailyStats.length - 1) {
        const x = padding.left + i * xStep;
        const dateStr = d.date.slice(5);
        ctx.fillText(dateStr, x, height - padding.bottom + 10);
      }
    });

    chartPointsRef.current = points;
  }, [dailyStats]);

  useEffect(() => {
    drawChart();
    const handleResize = () => drawChart();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawChart]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const points = chartPointsRef.current;
    if (!canvas || points.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let closest: ChartPoint | null = null;
    let minDist = Infinity;

    for (const p of points) {
      const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
      if (dist < minDist && dist < 40) {
        minDist = dist;
        closest = p;
      }
    }

    if (closest) {
      setTooltip({
        x: closest.x,
        y: closest.y - 10,
        value: `${closest.date}\n${closest.value} 分钟`,
        visible: true,
      });
    } else {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  };

  const handleCanvasMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const handleSubmitRecord = () => {
    onRecordInteraction(toy.id, { duration, reaction, damaged });
    setShowRecordForm(false);
    loadData();
  };

  const usageCount = getToyUsageCount(toy.id);

  return (
    <div className="toy-detail">
      <div className="toy-detail-header">
        <div className="toy-detail-image">
          {toy.image ? (
            <img src={toy.image} alt={toy.name} />
          ) : (
            <div className="toy-placeholder large">
              {toy.type === 'chase' && '🏃'}
              {toy.type === 'scratch' && '🐾'}
              {toy.type === 'puzzle' && '🧩'}
            </div>
          )}
        </div>
        <div className="toy-detail-info">
          <h2 className="toy-detail-name">{toy.name}</h2>
          <div className="toy-detail-tags">
            <span className={`toy-type-tag ${toy.type}`}>
              {typeLabels[toy.type]}
            </span>
            <span className="danger-tag">
              {dangerLabels[toy.danger_level].icon} {dangerLabels[toy.danger_level].label}
            </span>
          </div>
          <div className="toy-detail-meta">
            <p>材质：{toy.material}</p>
            <p>累计使用：{usageCount} 次</p>
            {toy.description && <p>描述：{toy.description}</p>}
          </div>
          <div className="toy-detail-actions">
            <button className="primary-btn" onClick={() => setShowRecordForm(true)}>
              记录互动
            </button>
            <button className="danger-btn" onClick={onDelete}>
              删除玩具
            </button>
          </div>
        </div>
      </div>

      {showRecordForm && (
        <div className="record-form-card">
          <h3>记录互动</h3>
          <div className="form-group">
            <label>互动时长：{duration} 分钟</label>
            <input
              type="range"
              min="1"
              max="30"
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value))}
              className="duration-slider"
            />
          </div>
          <div className="form-group">
            <label>猫咪反应：</label>
            <div className="reaction-options">
              <button
                className={`reaction-btn ${reaction === 'excited' ? 'active' : ''}`}
                onClick={() => setReaction('excited')}
              >
                😸
                <span>很兴奋</span>
              </button>
              <button
                className={`reaction-btn ${reaction === 'normal' ? 'active' : ''}`}
                onClick={() => setReaction('normal')}
              >
                😺
                <span>一般</span>
              </button>
              <button
                className={`reaction-btn ${reaction === 'ignore' ? 'active' : ''}`}
                onClick={() => setReaction('ignore')}
              >
                😾
                <span>不理睬</span>
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={damaged}
                onChange={e => setDamaged(e.target.checked)}
              />
              产生损坏
            </label>
          </div>
          <div className="form-actions">
            <button className="secondary-btn" onClick={() => setShowRecordForm(false)}>
              取消
            </button>
            <button className="primary-btn" onClick={handleSubmitRecord}>
              提交记录
            </button>
          </div>
        </div>
      )}

      <div className="chart-section">
        <h3>近14天互动时长</h3>
        <div className="chart-container" ref={containerRef}>
          <canvas
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
          />
          {tooltip.visible && (
            <div
              className="chart-tooltip"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translate(-50%, -100%)',
              }}
            >
              {tooltip.value.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="interaction-history">
        <h3>互动历史记录</h3>
        {interactions.length === 0 ? (
          <p className="empty-text">暂无互动记录</p>
        ) : (
          <div className="interaction-list">
            {interactions.slice(0, 20).map(record => (
              <div key={record.id} className="interaction-item">
                <div className="interaction-reaction">
                  {reactionEmojis[record.reaction as CatReaction]}
                </div>
                <div className="interaction-info">
                  <p className="interaction-label">
                    {reactionLabels[record.reaction as CatReaction]}
                    {record.damaged ? ' · 有损坏' : ''}
                  </p>
                  <p className="interaction-time">
                    {new Date(record.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="interaction-duration">
                  {record.duration} 分钟
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ToyDetail;
