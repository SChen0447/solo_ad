import { useEffect, useState } from 'react';
import { ShoppingCart, Package, CheckCircle, DollarSign } from 'lucide-react';
import { useStore } from '@/store';

const statCards = [
  { key: 'total', label: '订单总数', icon: ShoppingCart },
  { key: 'pending', label: '待分拣数', icon: Package },
  { key: 'completed', label: '已完成数', icon: CheckCircle },
  { key: 'revenue', label: '团长收益', icon: DollarSign },
] as const;

export default function Dashboard() {
  const todayStats = useStore(state => state.todayStats);
  const fetchTodayStats = useStore(state => state.fetchTodayStats);
  const fetchOrders = useStore(state => state.fetchOrders);

  const [flipKey, setFlipKey] = useState(0);

  const total = todayStats?.total ?? 0;
  const completed = todayStats?.completed ?? 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  useEffect(() => {
    fetchTodayStats();
    fetchOrders();
  }, [fetchTodayStats, fetchOrders]);

  useEffect(() => {
    setFlipKey(prev => prev + 1);
  }, [percentage]);

  const formatRevenue = (val: number | undefined) => {
    const v = val ?? 0;
    return `¥${v.toFixed(2)}`;
  };

  const getDisplayValue = (key: string) => {
    if (!todayStats) return key === 'revenue' ? '¥0.00' : '0';
    if (key === 'revenue') return formatRevenue(todayStats.revenue);
    return String(todayStats[key as keyof typeof todayStats] ?? 0);
  };

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <>
      <style>{`
        @keyframes flip-anim {
          0% { transform: rotateX(0deg); }
          50% { transform: rotateX(90deg); }
          100% { transform: rotateX(0deg); }
        }
        .flip-number { animation: flip-anim 0.6s ease; }
        .stat-card-anim {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .stat-card-anim:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }
      `}</style>

      <div style={{ padding: 24 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
          marginBottom: 32,
        }}>
          {statCards.map(card => (
            <div
              key={card.key}
              className="stat-card-anim"
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                borderRadius: 16,
                padding: '20px 24px',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'default',
              }}
            >
              <card.icon size={28} style={{ opacity: 0.8, marginBottom: 12 }} />
              <div style={{
                fontSize: 28,
                fontWeight: 'bold',
                lineHeight: 1.2,
              }}>
                {getDisplayValue(card.key)}
              </div>
              <div style={{
                fontSize: 14,
                opacity: 0.85,
                marginTop: 4,
              }}>
                {card.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ position: 'relative', width: 220, height: 220 }}>
            <svg width="220" height="220" viewBox="0 0 220 220">
              <defs>
                <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
              </defs>
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke="#e8ecf1"
                strokeWidth="14"
              />
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke="url(#ringGradient)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 110 110)"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <span key={flipKey} className="flip-number" style={{
                fontSize: 36,
                fontWeight: 'bold',
                color: '#333',
                display: 'inline-block',
              }}>
                {percentage}%
              </span>
            </div>
          </div>
          <div style={{
            marginTop: 16,
            fontSize: 14,
            color: '#666',
          }}>
            已完成订单占比
          </div>
        </div>
      </div>
    </>
  );
}
