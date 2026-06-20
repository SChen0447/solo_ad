import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell
} from 'recharts';
import type { Vote, VoteOption } from '../types';

const COLORS = [
  '#00d2ff',
  '#a29bfe',
  '#6c5ce7',
  '#fd79a8',
  '#fab1a0',
  '#55efc4',
  '#ffeaa7',
  '#74b9ff',
  '#ff7675',
  '#81ecec'
];

interface ChartRealtimeProps {
  vote: Vote;
}

export const ChartRealtime: React.FC<ChartRealtimeProps> = ({ vote }) => {
  const chartData = useMemo(() => {
    return vote.options.map((option: VoteOption, index: number) => ({
      name: option.text.length > 10 ? option.text.slice(0, 10) + '...' : option.text,
      fullName: option.text,
      votes: option.votes,
      rating: option.rating || 0,
      percentage: vote.totalVotes > 0 ? Math.round((option.votes / vote.totalVotes) * 100) : 0,
      fill: COLORS[index % COLORS.length]
    }));
  }, [vote]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="tooltip-title">{data.fullName}</p>
          {vote.type === 'rating' ? (
            <p className="tooltip-value">评分: {data.rating.toFixed(1)}</p>
          ) : (
            <>
              <p className="tooltip-value">票数: {data.votes}</p>
              <p className="tooltip-percentage">占比: {data.percentage}%</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" horizontal={false} />
        <XAxis type="number" stroke="#6c6c8a" tick={{ fill: '#6c6c8a', fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#6c6c8a"
          tick={{ fill: '#a0a0c0', fontSize: 12 }}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 210, 255, 0.1)' }} />
        <Legend
          wrapperStyle={{ paddingTop: '10px' }}
          iconType="circle"
        />
        <Bar
          dataKey="votes"
          name="票数"
          radius={[0, 8, 8, 0]}
          animationDuration={800}
          animationEasing="ease-out"
          barSize={32}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={`url(#colorGradient-${index})`}
            />
          ))}
          <defs>
            {chartData.map((entry, index) => (
              <linearGradient
                key={`gradient-${index}`}
                id={`colorGradient-${index}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.6} />
                <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
              </linearGradient>
            ))}
          </defs>
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderStackedBarChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={[{ name: '投票结果', ...chartData.reduce((acc, item, idx) => {
          acc[`opt${idx}`] = item.votes;
          return acc;
        }, {} as Record<string, number>) }]}
        margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
        <XAxis dataKey="name" stroke="#6c6c8a" tick={{ fill: '#a0a0c0', fontSize: 12 }} />
        <YAxis stroke="#6c6c8a" tick={{ fill: '#6c6c8a', fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: '10px' }}
          iconType="circle"
          formatter={(value: string) => {
            const idx = parseInt(value.replace('opt', ''));
            return chartData[idx]?.fullName || value;
          }}
        />
        {chartData.map((entry, index) => (
          <Bar
            key={`stack-${index}`}
            dataKey={`opt${index}`}
            stackId="a"
            animationDuration={800}
            animationEasing="ease-out"
            radius={[4, 4, 0, 0]}
          >
            <defs>
              <linearGradient
                id={`stack-gradient-${index}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <Cell fill={`url(#stack-gradient-${index})`} />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderRadarChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart
        data={chartData}
        margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
      >
        <PolarGrid stroke="#2d2d44" />
        <PolarAngleAxis
          dataKey="name"
          tick={{ fill: '#a0a0c0', fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 5]}
          tick={{ fill: '#6c6c8a', fontSize: 10 }}
          stroke="#2d2d44"
        />
        <Radar
          name="评分"
          dataKey="rating"
          stroke="#00d2ff"
          fill="#00d2ff"
          fillOpacity={0.3}
          animationDuration={800}
          animationEasing="ease-out"
          strokeWidth={2}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );

  const renderChart = () => {
    switch (vote.type) {
      case 'single':
        return renderBarChart();
      case 'multiple':
        return renderStackedBarChart();
      case 'rating':
        return renderRadarChart();
      default:
        return renderBarChart();
    }
  };

  return (
    <div className="chart-container">
      {vote.totalVotes === 0 && vote.type !== 'rating' ? (
        <div className="no-data">
          <div className="no-data-icon">📊</div>
          <p>暂无投票数据</p>
          <p className="no-data-hint">投票开始后结果将实时显示在这里</p>
        </div>
      ) : (
        renderChart()
      )}
    </div>
  );
};

export default ChartRealtime;
