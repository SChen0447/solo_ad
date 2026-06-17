import React from 'react';
import { getGradientColor, getShortDate } from '../utils';

interface BarChartProps {
  data: { date: Date; count: number }[];
  maxHeight?: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, maxHeight = 120 }) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bar-chart">
      {data.map((item, index) => {
        const height = maxCount > 0 ? (item.count / maxCount) * maxHeight : 0;
        const color = getGradientColor(index, data.length);

        return (
          <div key={index} className="bar-container">
            <div
              className="bar"
              style={{
                height: `${Math.max(height, 4)}px`,
                backgroundColor: color
              }}
            >
              <span className="bar-value">{item.count}</span>
              <div className="tooltip">
                {getShortDate(item.date)}: {item.count} 条笔记
              </div>
            </div>
            <span className="bar-label">{getShortDate(item.date)}</span>
          </div>
        );
      })}
    </div>
  );
};

export default BarChart;
