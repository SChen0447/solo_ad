import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export interface TrendDataPoint {
  time: string;
  score: number;
}

interface ChartProps {
  data: TrendDataPoint[];
}

const Chart: React.FC<ChartProps> = React.memo(({ data }) => {
  const gradientId = 'focusGradient';
  const lineColorFn = (value: number) => {
    if (value >= 80) return '#00ff88';
    if (value >= 40) return '#ffcc00';
    return '#ff3366';
  };

  const displayData = data.length === 0
    ? [{ time: '--:--', score: 0 }]
    : data;

  const latestScore = displayData[displayData.length - 1].score;
  const lineColor = lineColorFn(latestScore);

  return (
    <div style={styles.container} className="chart-card">
      <div style={styles.header}>
        <span style={styles.titleIcon}>📈</span>
        <span style={styles.titleText}>专注度趋势（5分钟）</span>
        <span style={styles.badge}>{data.length} 个数据点</span>
      </div>
      <div style={styles.chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={displayData}
            margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.55} />
                <stop offset="50%" stopColor={lineColor} stopOpacity={0.2} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,212,255,0.1)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(0,212,255,0.2)' }}
              interval={Math.max(0, Math.floor(displayData.length / 5) - 1)}
            />
            <YAxis
              domain={[0, 100]}
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(0,212,255,0.2)' }}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(15,20,30,0.95)',
                border: '1px solid rgba(0,212,255,0.4)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '12px',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}
              formatter={(value: number) => {
                const c = lineColorFn(value);
                return [<span style={{ color: c, fontWeight: 700 }}>{value} 分</span>, '专注度'];
              }}
              isAnimationActive={true}
              animationDuration={200}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke={lineColor}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              isAnimationActive={true}
              animationDuration={400}
              animationEasing="ease-out"
              dot={false}
              activeDot={{
                r: 5,
                fill: lineColor,
                stroke: '#fff',
                strokeWidth: 2
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

Chart.displayName = 'Chart';

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'linear-gradient(135deg, rgba(26,35,50,0.85), rgba(15,20,30,0.9))',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '16px 18px 14px',
    border: '1px solid rgba(0,212,255,0.2)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
    transition: 'box-shadow 300ms, border-color 300ms',
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  titleIcon: { fontSize: '17px' },
  titleText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    flex: 1
  },
  badge: {
    fontSize: '11px',
    color: 'rgba(0,212,255,0.9)',
    background: 'rgba(0,212,255,0.1)',
    padding: '2px 8px',
    borderRadius: '20px',
    border: '1px solid rgba(0,212,255,0.25)',
    fontWeight: '500'
  },
  chartWrap: {
    flex: 1,
    minHeight: '180px',
    width: '100%'
  }
};

export default Chart;
