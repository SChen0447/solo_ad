import React, { useEffect, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { Stats } from '../App';

interface StatsPanelProps {
  stats: Stats;
  onRefresh: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  '功能建议': '#4f46e5',
  'Bug报告': '#f97316',
  '其他': '#6b7280',
};

const STATUS_COLORS: Record<string, string> = {
  '待处理': '#f97316',
  '处理中': '#4f46e5',
  '已完成': '#10b981',
};

const ALL_CATEGORIES = ['功能建议', 'Bug报告', '其他'];
const ALL_STATUSES = ['待处理', '处理中', '已完成'];

function StatsPanel({ stats, onRefresh }: StatsPanelProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(onRefresh, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onRefresh]);

  const categoryData = ALL_CATEGORIES.map((cat) => {
    const found = stats.byCategory.find((c) => c.category === cat);
    return { name: cat, count: found ? found.count : 0 };
  });

  const statusData = ALL_STATUSES.map((status) => {
    const found = stats.byStatus.find((s) => s.status === status);
    return { name: status, value: found ? found.count : 0 };
  }).filter((d) => d.value > 0);

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <h3>按类别分布</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: 13,
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={600}>
                {categoryData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={CATEGORY_COLORS[entry.name] || '#6b7280'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="stat-card">
        <h3>按状态占比</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                animationDuration={600}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {statusData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[entry.name] || '#6b7280'}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: 13,
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default StatsPanel;
