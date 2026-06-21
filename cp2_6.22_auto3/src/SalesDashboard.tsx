import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, Package } from 'lucide-react';
import { api } from './api';
import type { SalesStats } from './types';

export default function SalesDashboard() {
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [chartAnim, setChartAnim] = useState(false);

  const loadStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const t1 = setTimeout(() => setLoaded(true), 80);
    const t2 = setTimeout(() => setChartAnim(true), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(loadStats, 3000);
    return () => clearInterval(id);
  }, []);

  const statCards = stats ? [
    {
      label: '今日销售额',
      value: `¥${stats.todaySales.toFixed(2)}`,
      icon: TrendingUp,
      gradient: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
    },
    {
      label: '本月订单数',
      value: String(stats.monthlyOrders),
      icon: ShoppingBag,
      gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    },
    {
      label: '总商品数',
      value: String(stats.totalProducts),
      icon: Package,
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',
    },
  ] : [];

  const maxAmount = stats ? Math.max(1, ...stats.dailySales.map((d) => d.amount)) : 1;

  return (
    <div style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.4s' }}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>销售看板</h1>
          <p style={styles.subtitle}>实时查看销售数据，掌握经营动态</p>
        </div>
      </div>

      <div style={styles.statsRow}>
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              style={{
                ...styles.statCard,
                background: card.gradient,
                opacity: loaded ? 1 : 0,
                transform: loaded ? 'translateY(0)' : 'translateY(30px)',
                transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + idx * 0.15}s`,
              }}
            >
              <div style={styles.statIconBg}>
                <Icon size={22} color="#FFFFFF" />
              </div>
              <div style={styles.statValue}>{card.value}</div>
              <div style={styles.statLabel}>{card.label}</div>
            </div>
          );
        })}
      </div>

      <div style={styles.chartCard}>
        <div style={styles.chartHeader}>
          <h2 style={styles.chartTitle}>最近7天销售趋势</h2>
          <span style={styles.chartSubtitle}>单位：人民币 (¥)</span>
        </div>
        <div style={styles.chartArea}>
          <div style={styles.chartGrid}>
            {[1, 0.75, 0.5, 0.25, 0].map((p) => (
              <div
                key={String(p)}
                style={{
                  ...styles.gridLine,
                  bottom: `${p * 100}%`,
                }}
              >
                <span style={styles.gridLabel}>¥{(maxAmount * p).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div style={styles.barsWrap}>
            {stats?.dailySales.map((d, idx) => {
              const heightPct = (d.amount / maxAmount) * 100;
              return (
                <div key={d.date} style={styles.barCol}>
                  <div style={styles.barValueLabel}>
                    {d.amount > 0 ? `¥${d.amount.toFixed(0)}` : ''}
                  </div>
                  <div style={styles.barTrack}>
                    <div
                      style={{
                        ...styles.barFill,
                        height: chartAnim ? `${heightPct}%` : '0%',
                        transition: `height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.05 * idx}s`,
                      }}
                    />
                  </div>
                  <div style={styles.barLabel}>{d.date}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {loading && !stats && (
        <div style={styles.empty}>加载中...</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsRow: {
    display: 'flex',
    gap: 20,
    marginBottom: 28,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 220,
    height: 120,
    borderRadius: 16,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  statIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 36,
    fontWeight: 800,
    color: '#FFFFFF',
    lineHeight: 1,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 500,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    border: '1px solid #E5E7EB',
    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  chartArea: {
    position: 'relative',
    height: 280,
    paddingLeft: 48,
  },
  chartGrid: {
    position: 'absolute',
    left: 48,
    right: 0,
    top: 0,
    bottom: 28,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTop: '1px dashed #F3F4F6',
  },
  gridLabel: {
    position: 'absolute',
    left: -48,
    top: -8,
    fontSize: 11,
    color: '#9CA3AF',
    width: 40,
    textAlign: 'right',
  },
  barsWrap: {
    position: 'absolute',
    left: 48,
    right: 0,
    top: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 28,
  },
  barCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    padding: '0 8px',
    maxWidth: 80,
  },
  barValueLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6366F1',
    marginBottom: 6,
    height: 14,
  },
  barTrack: {
    width: '100%',
    height: 'calc(100% - 50px)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  barFill: {
    width: 32,
    background: 'linear-gradient(180deg, #A855F7 0%, #6366F1 100%)',
    borderRadius: '8px 8px 4px 4px',
    minHeight: 0,
    boxShadow: '0 4px 10px rgba(99,102,241,0.25)',
  },
  barLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: 500,
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    color: '#6B7280',
  },
};
