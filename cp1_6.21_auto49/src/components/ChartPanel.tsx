import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
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
import { TrendDataPoint, TypeDistribution } from '../types';

const COLORS = ['#ff6b35', '#4299e1', '#48bb78'];

function ChartPanel() {
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [typeData, setTypeData] = useState<TypeDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendRes, typeRes] = await Promise.all([
          fetch('/api/statistics/trend'),
          fetch('/api/statistics/type-distribution'),
        ]);
        const [trend, type] = await Promise.all([trendRes.json(), typeRes.json()]);
        setTrendData(trend);
        setTypeData(type);
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (loading) {
    return (
      <div className="chart-panel">
        <div className="chart-card">
          <h3 className="chart-title">反馈趋势（近7天）</h3>
          <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
            加载中...
          </div>
        </div>
        <div className="chart-card">
          <h3 className="chart-title">类型分布</h3>
          <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
            加载中...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-panel">
      <div className="chart-card">
        <h3 className="chart-title">反馈趋势（近7天）</h3>
        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#718096', fontSize: 12 }} />
              <YAxis tick={{ fill: '#718096', fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                formatter={(value: number) => [`${value} 条`, '反馈数量']}
                labelFormatter={(label: string) => `日期: ${label}`}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#ff6b35"
                strokeWidth={3}
                dot={{ fill: '#ff6b35', r: 5 }}
                activeDot={{ r: 7 }}
                name="反馈数量"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="chart-card">
        <h3 className="chart-title">类型分布</h3>
        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="count"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {typeData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value} 条`, '数量']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default ChartPanel;
