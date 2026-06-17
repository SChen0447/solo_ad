import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { ChartType, ChartDataPoint } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ResultChartProps {
  data: ChartDataPoint[];
  title: string;
  chartType: ChartType;
  onTypeChange: (type: ChartType) => void;
}

const CHART_COLORS = [
  'rgba(0, 173, 181, 0.8)',
  'rgba(10, 147, 150, 0.8)',
  'rgba(255, 193, 7, 0.8)',
  'rgba(76, 175, 80, 0.8)',
  'rgba(156, 39, 176, 0.8)',
  'rgba(244, 67, 54, 0.8)',
  'rgba(63, 81, 181, 0.8)',
  'rgba(255, 152, 0, 0.8)',
  'rgba(0, 150, 136, 0.8)',
  'rgba(33, 150, 243, 0.8)'
];

const CHART_BORDER_COLORS = [
  'rgba(0, 173, 181, 1)',
  'rgba(10, 147, 150, 1)',
  'rgba(255, 193, 7, 1)',
  'rgba(76, 175, 80, 1)',
  'rgba(156, 39, 176, 1)',
  'rgba(244, 67, 54, 1)',
  'rgba(63, 81, 181, 1)',
  'rgba(255, 152, 0, 1)',
  'rgba(0, 150, 136, 1)',
  'rgba(33, 150, 243, 1)'
];

const ResultChart: React.FC<ResultChartProps> = ({ data, title, chartType, onTypeChange }) => {
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    setIsSwitching(true);
    const timer = setTimeout(() => setIsSwitching(false), 200);
    return () => clearTimeout(timer);
  }, [chartType]);

  if (data.length === 0) {
    return (
      <div className="result-chart-container">
        <div className="chart-header">
          <span className="chart-title">{title}</span>
          <div className="chart-type-tabs">
            {(['bar', 'line', 'pie'] as ChartType[]).map(type => (
              <button
                key={type}
                className={`chart-type-tab ${chartType === type ? 'active' : ''}`}
                onClick={() => onTypeChange(type)}
              >
                {type === 'bar' ? '柱状图' : type === 'line' ? '折线图' : '饼图'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          color: '#888' 
        }}>
          无可视化数据
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        label: title,
        data: data.map(d => d.value),
        backgroundColor: chartType === 'pie' 
          ? data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length])
          : CHART_COLORS[0],
        borderColor: chartType === 'pie'
          ? data.map((_, i) => CHART_BORDER_COLORS[i % CHART_BORDER_COLORS.length])
          : CHART_BORDER_COLORS[0],
        borderWidth: chartType === 'line' ? 2 : 1,
        fill: chartType === 'line' ? false : undefined,
        tension: chartType === 'line' ? 0.4 : undefined
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: chartType === 'pie',
        position: 'bottom' as const,
        labels: {
          font: {
            size: 11
          },
          color: '#666'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 12
        }
      }
    },
    scales: chartType !== 'pie' ? {
      x: {
        ticks: {
          font: {
            size: 10
          },
          color: '#888',
          maxRotation: 45,
          minRotation: 0
        },
        grid: {
          display: false
        }
      },
      y: {
        ticks: {
          font: {
            size: 10
          },
          color: '#888'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        beginAtZero: true
      }
    } : undefined
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return <Bar data={chartData} options={options} />;
      case 'line':
        return <Line data={chartData} options={options} />;
      case 'pie':
        return <Pie data={chartData} options={options} />;
      default:
        return <Bar data={chartData} options={options} />;
    }
  };

  return (
    <div className="result-chart-container">
      <div className="chart-header">
        <span className="chart-title">{title}</span>
        <div className="chart-type-tabs">
          {(['bar', 'line', 'pie'] as ChartType[]).map(type => (
            <button
              key={type}
              className={`chart-type-tab ${chartType === type ? 'active' : ''}`}
              onClick={() => onTypeChange(type)}
            >
              {type === 'bar' ? '柱状图' : type === 'line' ? '折线图' : '饼图'}
            </button>
          ))}
        </div>
      </div>
      <div className={`chart-wrapper ${isSwitching ? 'switching' : ''}`}>
        {renderChart()}
      </div>
    </div>
  );
};

export default ResultChart;
