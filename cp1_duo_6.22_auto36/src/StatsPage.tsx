import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import api, { Stats, DailyReading } from './api';

interface StatsPageProps {
  refreshKey: number;
}

const AnimatedNumber: React.FC<{
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
}> = ({ value, duration = 300, formatter }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);
  const animationRef = useRef<number | null>(null);

  const defaultFormatter = useCallback((n: number) => Math.round(n).toString(), []);
  const formatFn = formatter || defaultFormatter;

  useEffect(() => {
    const startValue = prevValue.current;
    const endValue = value;
    const startTime = performance.now();

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(currentValue);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return <>{formatFn(displayValue)}</>;
};

const StatCard: React.FC<{
  title: string;
  value: number;
  suffix: string;
  icon: string;
  formatter?: (n: number) => string;
}> = ({ title, value, suffix, icon, formatter }) => {
  return (
    <div className="stat-card">
      <div style={statCardStyles.iconWrap}>{icon}</div>
      <div style={statCardStyles.content}>
        <p style={statCardStyles.title}>{title}</p>
        <div style={statCardStyles.valueRow}>
          <span style={statCardStyles.value}>
            <AnimatedNumber value={value} formatter={formatter} />
          </span>
          <span style={statCardStyles.suffix}>{suffix}</span>
        </div>
      </div>
    </div>
  );
};

interface ChartDataPoint {
  date: string;
  duration: number;
  books: { bookId: string; title: string }[];
  x: number;
  y: number;
  width: number;
  height: number;
}

const ReadingChart: React.FC<{ data: DailyReading[] }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const chartDataRef = useRef<ChartDataPoint[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 320 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: Math.max(rect.width, 300), height: 320 });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = { top: 40, right: 24, bottom: 50, left: 56 };
    const chartWidth = canvasSize.width - padding.left - padding.right;
    const chartHeight = canvasSize.height - padding.top - padding.bottom;

    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    ctx.fillStyle = '#1a1a2e';
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasSize.width, canvasSize.height, 12);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    }

    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      const maxDuration = Math.max(...data.map(d => d.duration), 1);
      const label = Math.round(((maxDuration * (4 - i)) / 4) / 60);
      ctx.fillStyle = '#a0a0c0';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${label}m`, padding.left - 8, y);
    }

    const barGap = 4;
    const barWidth = Math.max((chartWidth / data.length) - barGap, 4);
    const maxDuration = Math.max(...data.map(d => d.duration), 1);
    const chartData: ChartDataPoint[] = [];

    const interpolateColor = (ratio: number): string => {
      const green = { r: 46, g: 204, b: 113 };
      const blue = { r: 52, g: 152, b: 219 };
      const r = Math.round(green.r + (blue.r - green.r) * ratio);
      const g = Math.round(green.g + (blue.g - green.g) * ratio);
      const b = Math.round(green.b + (blue.b - green.b) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    };

    data.forEach((item, index) => {
      const x = padding.left + index * (barWidth + barGap) + barGap / 2;
      const heightRatio = item.duration / maxDuration;
      const height = Math.max(heightRatio * chartHeight, 2);
      const y = padding.top + chartHeight - height;
      const color = interpolateColor(heightRatio);

      chartData.push({
        ...item,
        x,
        y,
        width: barWidth,
        height,
      });

      ctx.fillStyle = color;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 3);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, barWidth, height);
      }

      if (hoveredIndex === index) {
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(x - 1, y - 1, barWidth + 2, height + 2, 4);
          ctx.stroke();
        } else {
          ctx.strokeRect(x - 1, y - 1, barWidth + 2, height + 2);
        }
      }
    });

    chartDataRef.current = chartData;

    ctx.fillStyle = '#a0a0c0';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    data.forEach((item, index) => {
      if (index % 5 === 0 || index === data.length - 1) {
        const x = padding.left + index * (barWidth + barGap) + barGap / 2 + barWidth / 2;
        const date = new Date(item.date);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;
        ctx.fillText(label, x, padding.top + chartHeight + 10);
      }
    });
  }, [data, canvasSize, hoveredIndex]);

  useEffect(() => {
    const startTime = performance.now();
    drawChart();
    const elapsed = performance.now() - startTime;
    if (elapsed > 50) {
      console.warn(`Canvas 渲染耗时: ${elapsed.toFixed(2)}ms，超过50ms阈值`);
    }
  }, [drawChart]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let foundIndex = -1;
    for (let i = 0; i < chartDataRef.current.length; i++) {
      const bar = chartDataRef.current[i];
      if (
        x >= bar.x - 2 &&
        x <= bar.x + bar.width + 2 &&
        y >= bar.y - 2 &&
        y <= bar.y + bar.height + 2
      ) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex >= 0) {
      setHoveredIndex(foundIndex);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredIndex(null);
    }
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}小时${m > 0 ? ` ${Math.round(m)}分钟` : ''}`;
    return `${Math.round(m)}分钟`;
  };

  return (
    <div ref={containerRef} className="chart-container">
      <div style={chartStyles.header}>
        <h3 style={chartStyles.title}>过去30天阅读时长</h3>
        <div style={chartStyles.legend}>
          <span style={chartStyles.legendItem}>
            <span style={{ ...chartStyles.legendColor, backgroundColor: '#2ecc71' }} />
            短时间
          </span>
          <span style={chartStyles.legendItem}>
            <span style={{ ...chartStyles.legendColor, backgroundColor: '#3498db' }} />
            长时间
          </span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={chartStyles.canvas}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
      />

      {hoveredIndex !== null && chartDataRef.current[hoveredIndex] && (
        <div
          style={{
            ...chartStyles.tooltip,
            left: Math.min(tooltipPos.x + 16, window.innerWidth - 260),
            top: tooltipPos.y - 10,
          }}
        >
          <div style={chartStyles.tooltipDate}>
            {new Date(chartDataRef.current[hoveredIndex].date).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
          </div>
          <div style={chartStyles.tooltipDuration}>
            ⏱️ {formatDuration(chartDataRef.current[hoveredIndex].duration)}
          </div>
          {chartDataRef.current[hoveredIndex].books.length > 0 && (
            <div style={chartStyles.tooltipBooks}>
              <div style={chartStyles.tooltipBooksLabel}>阅读的书籍：</div>
              <ul style={chartStyles.tooltipBooksList}>
                {chartDataRef.current[hoveredIndex].books.map((book, i) => (
                  <li key={i} style={chartStyles.tooltipBookItem}>
                    📖 {book.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatsPage: React.FC<StatsPageProps> = ({ refreshKey }) => {
  const [stats, setStats] = useState<Stats>({
    weeklyReadingTime: 0,
    monthlyPagesRead: 0,
    currentlyReadingCount: 0,
  });
  const [dailyReadings, setDailyReadings] = useState<DailyReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [s, d] = await Promise.all([
          api.getStats(),
          api.getDailyReadings(),
        ]);
        setStats(s);
        setDailyReadings(d);
      } catch (err) {
        console.error('加载统计数据失败:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [refreshKey]);

  const formatHours = useCallback((seconds: number): string => {
    const hours = seconds / 3600;
    return hours.toFixed(1);
  }, []);

  const totalReadingTime = useMemo(() => {
    return dailyReadings.reduce((acc, d) => acc + d.duration, 0);
  }, [dailyReadings]);

  const activeDays = useMemo(() => {
    return dailyReadings.filter(d => d.duration > 0).length;
  }, [dailyReadings]);

  if (loading) {
    return (
      <div style={styles.loadingState}>
        <div style={styles.loadingIcon}>⏳</div>
        <p style={styles.loadingText}>加载统计数据中...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>统计仪表盘</h1>
        <p style={styles.pageSubtitle}>追踪你的阅读习惯和进度</p>
      </div>

      <div style={styles.statsGrid}>
        <StatCard
          title="本周阅读总时长"
          value={stats.weeklyReadingTime}
          suffix="小时"
          icon="⏱️"
          formatter={formatHours}
        />
        <StatCard
          title="本月已读页数"
          value={stats.monthlyPagesRead}
          suffix="页"
          icon="📄"
        />
        <StatCard
          title="正在阅读"
          value={stats.currentlyReadingCount}
          suffix="本"
          icon="📚"
        />
      </div>

      <div style={styles.smallStatsRow}>
        <div className="small-stat-card">
          <span style={styles.smallStatIcon}>📅</span>
          <div>
            <p style={styles.smallStatValue}>{activeDays}</p>
            <p style={styles.smallStatLabel}>30天活跃天数</p>
          </div>
        </div>
        <div className="small-stat-card">
          <span style={styles.smallStatIcon}>🎯</span>
          <div>
            <p style={styles.smallStatValue}>{((activeDays / 30) * 100).toFixed(0)}%</p>
            <p style={styles.smallStatLabel}>30天阅读率</p>
          </div>
        </div>
        <div className="small-stat-card">
          <span style={styles.smallStatIcon}>💪</span>
          <div>
            <p style={styles.smallStatValue}>{formatHours(totalReadingTime)}h</p>
            <p style={styles.smallStatLabel}>30天总时长</p>
          </div>
        </div>
        <div className="small-stat-card">
          <span style={styles.smallStatIcon}>📖</span>
          <div>
            <p style={styles.smallStatValue}>
              {dailyReadings.reduce((acc, d) => acc + d.books.length, 0)}
            </p>
            <p style={styles.smallStatLabel}>30天阅读书籍次</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '28px' }}>
        <ReadingChart data={dailyReadings} />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '100%',
  },
  header: {
    marginBottom: '28px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#e0e0e0',
    marginBottom: '6px',
  },
  pageSubtitle: {
    color: '#a0a0c0',
    fontSize: '14px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  },
  smallStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  smallStatIcon: {
    fontSize: '28px',
  },
  smallStatValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#e0e0e0',
  },
  smallStatLabel: {
    fontSize: '12px',
    color: '#a0a0c0',
    marginTop: '2px',
  },
  loadingState: {
    textAlign: 'center',
    padding: '100px 20px',
  },
  loadingIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  loadingText: {
    color: '#a0a0c0',
    fontSize: '16px',
  },
};

const statCardStyles: Record<string, React.CSSProperties> = {
  iconWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    backgroundColor: 'rgba(233, 69, 96, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#a0a0c0',
    fontSize: '13px',
    marginBottom: '8px',
  },
  valueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    flexWrap: 'wrap',
  },
  value: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#e0e0e0',
    lineHeight: 1.1,
  },
  suffix: {
    fontSize: '14px',
    color: '#a0a0c0',
  },
};

const chartStyles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  legend: {
    display: 'flex',
    gap: '20px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#a0a0c0',
    fontSize: '12px',
  },
  legendColor: {
    width: '14px',
    height: '14px',
    borderRadius: '3px',
  },
  canvas: {
    width: '100%',
    height: '320px',
    cursor: 'crosshair',
    display: 'block',
  },
  tooltip: {
    position: 'fixed',
    backgroundColor: '#16213e',
    border: '1px solid #4a4a6e',
    borderRadius: '8px',
    padding: '12px 16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    pointerEvents: 'none',
    maxWidth: '240px',
  },
  tooltipDate: {
    color: '#e0e0e0',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid #2a2a4e',
  },
  tooltipDuration: {
    color: '#e94560',
    fontSize: '16px',
    fontWeight: 700,
    marginBottom: '8px',
  },
  tooltipBooks: {
    marginTop: '4px',
  },
  tooltipBooksLabel: {
    color: '#a0a0c0',
    fontSize: '11px',
    marginBottom: '4px',
  },
  tooltipBooksList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  tooltipBookItem: {
    color: '#e0e0e0',
    fontSize: '12px',
    padding: '2px 0',
  },
};

export default StatsPage;
