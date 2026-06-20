import React from 'react';

interface BarChartProps {
  data: {
    label: string;
    value: number;
    max: number;
  }[];
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  return (
    <div className="bar-chart">
      {data.map((item, index) => {
        const percentage = (item.value / item.max) * 100;
        return (
          <div key={index} className="bar-item">
            <span className="bar-label">{item.label}</span>
            <div className="-bar-track">
              <div
                className="bar-fill"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="bar-value">{item.value.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
};

export default BarChart;
