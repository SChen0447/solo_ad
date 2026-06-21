import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
} from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';
import {
  getWeeklyData,
  getMonthlyData,
  isThisWeekMoreThanLast,
} from '../utils/calculations';

interface StatsDashboardProps {
  refreshKey: number;
}

const GRADIENT_COLORS = [
  '#BBDEFB',
  '#90CAF9',
  '#64B5F6',
  '#42A5F5',
  '#2196F3',
  '#1E88E5',
  '#1565C0',
];

export default function StatsDashboard({ refreshKey }: StatsDashboardProps) {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (isThisWeekMoreThanLast()) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [refreshKey]);

  const weeklyData = getWeeklyData();
  const monthlyData = getMonthlyData();

  const weeklyChartData = weeklyData.map((d, i) => ({
    name: d.day,
    minutes: d.minutes,
    fill: GRADIENT_COLORS[i % GRADIENT_COLORS.length],
  }));

  const monthlyChartData = monthlyData.map((d) => ({
    name: d.day,
    minutes: d.minutes,
  }));

  return (
    <div style={styles.card}>
      {showCelebration && <div style={styles.celebration}>🎉</div>}

      <div style={styles.header}>
        <BarChart3 size={20} color="#1E88E5" />
        <h2 style={styles.title}>阅读统计</h2>
      </div>

      <div style={styles.toggleContainer}>
        <button
          onClick={() => setView('week')}
          style={{
            ...styles.toggleBtn,
            ...(view === 'week' ? styles.toggleActive : {}),
          }}
        >
          <BarChart3 size={14} style={{ marginRight: 4 }} />
          本周
        </button>
        <button
          onClick={() => setView('month')}
          style={{
            ...styles.toggleBtn,
            ...(view === 'month' ? styles.toggleActive : {}),
          }}
        >
          <TrendingUp size={14} style={{ marginRight: 4 }} />
          本月
        </button>
      </div>

      <div style={styles.chartContainer}>
        {view === 'week' ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#666' }} />
              <YAxis tick={{ fontSize: 12, fill: '#666' }} unit="分" />
              <Tooltip
                formatter={(value: number) => [`${value} 分钟`, '阅读时长']}
                contentStyle={{
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  fontSize: 13,
                }}
              />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                {weeklyChartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#666' }} />
              <YAxis tick={{ fontSize: 12, fill: '#666' }} unit="分" />
              <Tooltip
                formatter={(value: number) => [`${value} 分钟`, '阅读时长']}
                contentStyle={{
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  fontSize: 13,
                }}
              />
              <Line
                type="monotone"
                dataKey="minutes"
                stroke="#1E88E5"
                strokeWidth={2}
                dot={{ fill: '#1E88E5', r: 3 }}
                activeDot={{ r: 5, fill: '#42A5F5' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1E88E5',
  },
  toggleContainer: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: 8,
    background: '#fff',
    color: '#666',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  toggleActive: {
    background: '#1E88E5',
    color: '#fff',
    borderColor: '#1E88E5',
  },
  chartContainer: {
    background: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
  },
  celebration: {
    position: 'absolute' as const,
    top: 12,
    left: 0,
    fontSize: 28,
    animation: 'slideInFade 3s ease forwards',
    zIndex: 10,
  },
};
