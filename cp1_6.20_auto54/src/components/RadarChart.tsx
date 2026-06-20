import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { StyleAnalysis } from '../types';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface RadarChartProps {
  styleAnalysis: StyleAnalysis;
}

const getRatingScore = (value: number, type: string): number => {
  if (type === 'complexity') {
    if (value <= 5) return 100;
    if (value <= 10) return 60;
    return 30;
  }
  if (type === 'comment_ratio') {
    if (value >= 20) return 100;
    if (value >= 10) return 60;
    return 30;
  }
  if (type === 'pep8') {
    if (value === 0) return 100;
    if (value <= 3) return 60;
    return 30;
  }
  if (type === 'lines') {
    if (value <= 100) return 100;
    if (value <= 300) return 60;
    return 30;
  }
  return 50;
};

const getRatingLabel = (score: number): string => {
  if (score >= 100) return '优秀';
  if (score >= 60) return '良好';
  return '需改进';
};

const RadarChart: React.FC<RadarChartProps> = ({ styleAnalysis }) => {
  const complexityScore = getRatingScore(styleAnalysis.cyclomatic_complexity, 'complexity');
  const commentScore = getRatingScore(styleAnalysis.comment_ratio, 'comment_ratio');
  const pep8Score = getRatingScore(styleAnalysis.pep8_violations, 'pep8');
  const linesScore = getRatingScore(styleAnalysis.total_lines, 'lines');
  const overallScore = Math.round((complexityScore + commentScore + pep8Score + linesScore) / 4);

  const data = {
    labels: [
      `圈复杂度\n${getRatingLabel(complexityScore)}`,
      `注释占比\n${getRatingLabel(commentScore)}`,
      `PEP8合规\n${getRatingLabel(pep8Score)}`,
      `代码长度\n${getRatingLabel(linesScore)}`,
      `综合评分\n${getRatingLabel(overallScore)}`,
    ],
    datasets: [
      {
        label: '代码质量评分',
        data: [complexityScore, commentScore, pep8Score, linesScore, overallScore],
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(139, 92, 246, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(99, 102, 241, 1)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          font: {
            size: 10,
          },
        },
        pointLabels: {
          font: {
            size: 12,
          },
          color: '#334155',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.3)',
        },
        angleLines: {
          color: 'rgba(148, 163, 184, 0.3)',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const labels = ['圈复杂度', '注释占比', 'PEP8违规', '代码行数', '综合评分'];
            const values = [
              `圈复杂度: ${styleAnalysis.cyclomatic_complexity}`,
              `注释占比: ${styleAnalysis.comment_ratio}%`,
              `PEP8违规: ${styleAnalysis.pep8_violations}处`,
              `代码行数: ${styleAnalysis.total_lines}行`,
              `综合评分: ${overallScore}分`,
            ];
            const index = labels.indexOf(label.split('\n')[0]);
            return values[index] || `${label}: ${value}分`;
          },
        },
      },
    },
  };

  return (
    <div className="radar-chart-container">
      <h3 className="chart-title">代码风格分析</h3>
      <div className="chart-wrapper">
        <Radar data={data} options={options} />
      </div>
      <div className="style-metrics">
        <div className="metric-item">
          <span className="metric-label">圈复杂度:</span>
          <span className={`metric-value ${getRatingLabel(complexityScore).toLowerCase()}`}>
            {styleAnalysis.cyclomatic_complexity}
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">代码行数:</span>
          <span className={`metric-value ${getRatingLabel(linesScore).toLowerCase()}`}>
            {styleAnalysis.total_lines}
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">注释占比:</span>
          <span className={`metric-value ${getRatingLabel(commentScore).toLowerCase()}`}>
            {styleAnalysis.comment_ratio}%
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">PEP8违规:</span>
          <span className={`metric-value ${getRatingLabel(pep8Score).toLowerCase()}`}>
            {styleAnalysis.pep8_violations}处
          </span>
        </div>
      </div>
    </div>
  );
};

export default RadarChart;
