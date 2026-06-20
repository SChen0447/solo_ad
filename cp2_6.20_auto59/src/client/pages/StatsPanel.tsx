import { useState, useEffect, useRef } from 'react';
import { Package, TrendingDown, Music2, AlertCircle } from 'lucide-react';

interface LowStockItem {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  stockQuantity: number;
  maxStock: number;
  coverUrl: string;
  stockPercent: number;
}

interface StatsData {
  yearPerformances: {
    total: number;
    completed: number;
    byMonth: { month: string; count: number }[];
  };
  totalEquipment: number;
  lowStockItems: LowStockItem[];
}

interface StatsPanelProps {
  standalone?: boolean;
  highlight?: boolean;
}

export default function StatsPanel({ standalone = false, highlight = false }: StatsPanelProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
      setIsLoading(false);
    } catch (err) {
      console.error('获取统计数据失败', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 5000);
    return () => clearInterval(timer);
  }, []);

  const year = new Date().getFullYear();

  if (isLoading && !stats) {
    return (
      <div
        style={{
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          height: standalone ? '200px' : '120px',
          background: standalone ? 'var(--bg-card)' : 'transparent',
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: standalone ? '20px' : '14px',
        transition: 'all 0.3s ease',
        transform: highlight ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      <StatCard title={`${year}年度演出`} icon={Music2} iconColor="#45B7D1">
        {stats && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'center', padding: '8px 0 4px' }}>
            <AnimatedDonut
              value={stats.yearPerformances.completed}
              max={Math.max(stats.yearPerformances.total, 1)}
              size={standalone ? 100 : 80}
              color="#45B7D1"
              bgColor="rgba(255,255,255,0.08)"
              strokeWidth={standalone ? 8 : 6}
              label={`${stats.yearPerformances.completed}/${stats.yearPerformances.total}`}
              subLabel="已完成"
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                已完成 / 总场次
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>
                {stats.yearPerformances.completed}
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', marginLeft: '4px', fontWeight: 400 }}>
                  / {stats.yearPerformances.total} 场
                </span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                完成率 <span style={{ color: '#45B7D1', fontWeight: 600 }}>
                  {stats.yearPerformances.total > 0
                    ? Math.round((stats.yearPerformances.completed / stats.yearPerformances.total) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        )}
      </StatCard>

      <StatCard title="设备总数" icon={Package} iconColor="#96CEB4">
        {stats && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: standalone ? '58px' : '48px',
                height: standalone ? '58px' : '48px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(150,206,180,0.25), rgba(150,206,180,0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Package size={standalone ? 28 : 24} color="#96CEB4" />
            </div>
            <div>
              <div style={{ fontSize: standalone ? '32px' : '28px', fontWeight: 800, color: '#fff' }}>
                {stats.totalEquipment}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                件设备（含多数量）
              </div>
            </div>
          </div>
        )}
      </StatCard>

      <StatCard
        title="低库存预警"
        icon={TrendingDown}
        iconColor="#FF6B6B"
        rightContent={
          stats && stats.lowStockItems.length > 0 ? (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '10px',
                background: 'rgba(255,107,107,0.15)',
                color: '#FF6B6B',
              }}
            >
              {stats.lowStockItems.length} 件
            </span>
          ) : null
        }
      >
        {stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '2px' }}>
            {stats.lowStockItems.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0' }}>
                库存状态良好 ✨
              </div>
            ) : (
              stats.lowStockItems.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#FF6B6B',
                      flexShrink: 0,
                      boxShadow: '0 0 6px rgba(255,107,107,0.8)',
                      animation: item.stockPercent < 5 ? 'blinkRed 1s ease-in-out infinite' : undefined,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#e0e0e0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      剩余 {item.stockQuantity} 件 · {item.stockPercent}%
                    </div>
                  </div>
                  <MiniStockBar percent={item.stockPercent} />
                </div>
              ))
            )}
          </div>
        )}
      </StatCard>

      <div style={{ textAlign: 'center', paddingTop: '4px' }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
          数据每 5 秒自动刷新
        </span>
      </div>
    </div>
  );
}

function StatCard({
  title,
  icon: Icon,
  iconColor,
  children,
  rightContent,
}: {
  title: string;
  icon: any;
  iconColor: string;
  children: React.ReactNode;
  rightContent?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'rgba(22, 33, 62, 0.6)',
        borderRadius: '12px',
        padding: '14px 14px 16px',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Icon size={16} color={iconColor} />
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{title}</h4>
        </div>
        {rightContent}
      </div>
      {children}
    </div>
  );
}

function AnimatedDonut({
  value,
  max,
  size = 80,
  color = '#45B7D1',
  bgColor = 'rgba(255,255,255,0.1)',
  strokeWidth = 6,
  label,
  subLabel,
}: {
  value: number;
  max: number;
  size?: number;
  color?: string;
  bgColor?: string;
  strokeWidth?: number;
  label?: string;
  subLabel?: string;
}) {
  const [displayedValue, setDisplayedValue] = useState(0);
  const prevValueRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const duration = 600;
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;
      setDisplayedValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endValue;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const percent = max > 0 ? Math.min(100, (displayedValue / max) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.1s linear',
            filter: `drop-shadow(0 0 4px ${color})`,
          }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        {label ? (
          <>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{label}</div>
            {subLabel && (
              <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '3px' }}>{subLabel}</div>
            )}
          </>
        ) : (
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
            {Math.round(percent)}%
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStockBar({ percent }: { percent: number }) {
  const [displayedPercent, setDisplayedPercent] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = 0;
    const end = percent;
    const duration = 500;
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedPercent(start + (end - start) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [percent]);

  const color = percent < 10 ? '#FF6B6B' : percent < 30 ? '#FFEAA7' : '#96CEB4';

  return (
    <div
      style={{
        width: '36px',
        height: '4px',
        borderRadius: '2px',
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: `${displayedPercent}%`,
          height: '100%',
          background: color,
          borderRadius: '2px',
          transition: 'background 0.3s',
        }}
      />
    </div>
  );
}
