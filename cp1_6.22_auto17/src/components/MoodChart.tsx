import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { EmotionDataPoint } from '../types';

interface MoodChartProps {
  data: EmotionDataPoint[];
}

const MoodChart: React.FC<MoodChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      displayOrder: `第${point.chapterOrder}章`
    }));
  }, [data]);

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill={payload.color}
          stroke="#fff"
          strokeWidth={2}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
        />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={styles.tooltip}>
          <div style={{ ...styles.tooltipDot, backgroundColor: data.color }} />
          <div style={styles.tooltipContent}>
            <p style={styles.tooltipChapter}>{data.chapterTitle}</p>
            <p style={styles.tooltipMood}>
              心情: <span style={{ color: data.color }}>{data.moodName}</span>
            </p>
            <p style={styles.tooltipScore}>
              愉悦度: {data.happinessScore}/10
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={styles.container}>
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendColor, backgroundColor: '#ff7043' }} />
          <span style={styles.legendText}>高愉悦 (8-10分)</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendColor, backgroundColor: '#ffb74d' }} />
          <span style={styles.legendText}>中愉悦 (6-7分)</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendColor, backgroundColor: '#7986cb' }} />
          <span style={styles.legendText}>低愉悦 (4-5分)</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendColor, backgroundColor: '#757575' }} />
          <span style={styles.legendText}>低落 (1-3分)</span>
        </div>
      </div>
      
      <div style={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                {chartData.map((point, index) => (
                  <stop
                    key={index}
                    offset={`${data.length > 1 ? (index / (data.length - 1)) * 100 : 50}%`}
                    stopColor={point.color}
                  />
                ))}
              </linearGradient>
            </defs>
            
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f0f0f0"
              vertical={true}
              horizontal={true}
            />
            
            <XAxis
              dataKey="displayOrder"
              tick={{ fill: '#666', fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
              tickLine={{ stroke: '#e0e0e0' }}
            />
            
            <YAxis
              domain={[0, 10]}
              tick={{ fill: '#666', fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
              tickLine={{ stroke: '#e0e0e0' }}
              tickFormatter={(value) => value.toString()}
            />
            
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#e0e0e0', strokeDasharray: '5 5' }}
            />
            
            <Line
              type="monotone"
              dataKey="happinessScore"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={{ r: 10, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%'
  },
  legend: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '16px',
    justifyContent: 'center'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: '50%'
  },
  legendText: {
    fontSize: '12px',
    color: '#666'
  },
  chartWrapper: {
    width: '100%'
  },
  tooltip: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    backgroundColor: '#fff',
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
    border: '1px solid #f0f0f0'
  },
  tooltipDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    marginTop: '4px',
    flexShrink: 0
  },
  tooltipContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  tooltipChapter: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    margin: 0
  },
  tooltipMood: {
    fontSize: '13px',
    color: '#666',
    margin: 0
  },
  tooltipScore: {
    fontSize: '13px',
    color: '#666',
    margin: 0
  }
};

export default MoodChart;
