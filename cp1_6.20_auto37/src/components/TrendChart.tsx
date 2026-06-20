import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { trendApi, type TrendData } from '../utils/api';

const timeRanges = [
  { label: '近7天', days: 7 },
  { label: '近30天', days: 30 },
  { label: '全部', days: 30 },
];

const TrendChart: React.FC = () => {
  const [data, setData] = useState<TrendData[]>([]);
  const [selectedRange, setSelectedRange] = useState(7);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const fetchTrends = useCallback(async (days: number) => {
    try {
      setLoading(true);
      setIsAnimating(true);
      const response = await trendApi.getTrends(days);
      if (response.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch trends:', error);
    } finally {
      setLoading(false);
      setTimeout(() => setIsAnimating(false), 500);
    }
  }, []);

  useEffect(() => {
    fetchTrends(selectedRange);
  }, [selectedRange, fetchTrends]);

  const handleRangeChange = (days: number) => {
    if (days !== selectedRange) {
      setSelectedRange(days);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-date">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="tooltip-item" style={{ color: entry.color }}>
              <span className="tooltip-dot" style={{ background: entry.color }}></span>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="trend-chart-container">
      <div className="chart-header">
        <h2 className="chart-title">情感趋势分析</h2>
        <div className="time-range-selector">
          {timeRanges.map((range) => (
            <button
              key={range.days}
              className={`range-btn ${selectedRange === range.days ? 'active' : ''}`}
              onClick={() => handleRangeChange(range.days)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="chart-loading">
          <div className="loading-spinner-small"></div>
          <span>加载中...</span>
        </div>
      ) : (
        <div className={`chart-wrapper ${isAnimating ? 'slide-transition' : ''}`}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={{ stroke: '#e5e7eb' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="positive"
                name="积极"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6, fill: '#10b981' }}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
              <Line
                type="monotone"
                dataKey="neutral"
                name="中性"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ fill: '#f59e0b', r: 4 }}
                activeDot={{ r: 6, fill: '#f59e0b' }}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
              <Line
                type="monotone"
                dataKey="negative"
                name="消极"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ fill: '#ef4444', r: 4 }}
                activeDot={{ r: 6, fill: '#ef4444' }}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="chart-stats">
        <div className="stat-item positive">
          <span className="stat-value">{data.reduce((sum, d) => sum + d.positive, 0)}</span>
          <span className="stat-label">积极反馈</span>
        </div>
        <div className="stat-item neutral">
          <span className="stat-value">{data.reduce((sum, d) => sum + d.neutral, 0)}</span>
          <span className="stat-label">中性反馈</span>
        </div>
        <div className="stat-item negative">
          <span className="stat-value">{data.reduce((sum, d) => sum + d.negative, 0)}</span>
          <span className="stat-label">消极反馈</span>
        </div>
      </div>
    </div>
  );
};

export default TrendChart;
