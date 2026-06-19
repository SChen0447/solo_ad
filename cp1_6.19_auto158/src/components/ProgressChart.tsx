import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { Kr } from '../types';

interface Props {
  kr: Kr;
}

interface ChartPoint {
  date: string;
  dateLabel: string;
  progress: number;
}

export default function ProgressChart({ kr }: Props) {
  const [animationKey, setAnimationKey] = useState(0);

  const data = useMemo(() => {
    const points: ChartPoint[] = [];
    const now = new Date();
    const last30Days: Date[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      last30Days.push(d);
    }

    const checkinMap = new Map<string, number>();
    kr.checkins.forEach((c) => {
      const dateKey = new Date(c.timestamp).toISOString().split('T')[0];
      checkinMap.set(dateKey, c.progressValue);
    });

    let lastProgress = kr.checkins.length > 0
      ? Math.min(...kr.checkins.map((c) => c.progressValue))
      : 0;

    last30Days.forEach((d) => {
      const dateKey = d.toISOString().split('T')[0];
      if (checkinMap.has(dateKey)) {
        lastProgress = checkinMap.get(dateKey)!;
      }
      points.push({
        date: dateKey,
        dateLabel: `${d.getMonth() + 1}/${d.getDate()}`,
        progress: lastProgress,
      });
    });

    const lastPoint = points[points.length - 1];
    if (lastPoint && lastPoint.progress !== kr.progress) {
      lastPoint.progress = kr.progress;
    }

    return points;
  }, [kr]);

  return (
    <div className="progress-chart-wrapper" key={animationKey}>
      <div className="chart-summary">
        <div className="summary-item">
          <span className="summary-label">起始进度</span>
          <span className="summary-value" style={{ color: '#ef5350' }}>
            {data[0]?.progress ?? 0}%
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">当前进度</span>
          <span className="summary-value" style={{ color: '#43a047' }}>
            {kr.progress}%
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">总变化</span>
          <span
            className="summary-value"
            style={{
              color: (data[data.length - 1]?.progress ?? 0) - (data[0]?.progress ?? 0) >= 0
                ? '#43a047'
                : '#ef5350',
            }}
          >
            {((data[data.length - 1]?.progress ?? 0) - (data[0]?.progress ?? 0)) >= 0 ? '+' : ''}
            {(data[data.length - 1]?.progress ?? 0) - (data[0]?.progress ?? 0)}%
          </span>
        </div>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ef5350" />
                <stop offset="50%" stopColor="#ffb74d" />
                <stop offset="100%" stopColor="#66bb6a" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: '#666' }}
              tickLine={false}
              axisLine={{ stroke: '#ddd' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#666' }}
              tickLine={false}
              axisLine={{ stroke: '#ddd' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #e0e0e0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value}%`, '完成进度']}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="progress"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              dot={{ r: 3, fill: '#1a237e' }}
              activeDot={{ r: 6, fill: '#1a237e', stroke: '#fff', strokeWidth: 2 }}
              animationDuration={500}
              animationEasing="ease-out"
              name="进度"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
