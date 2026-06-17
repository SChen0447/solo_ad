import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { extractChartData } from '../utils/dataUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

type ChartType = 'bar' | 'line' | 'pie';

interface ResultChartProps {
  data: Record<string, unknown>[];
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
}

const COLORS = [
  '#00adb5', '#0a9396', '#e76f51', '#f4a261', '#2a9d8f',
  '#264653', '#e9c46a', '#606c38', '#283618', '#dda15e',
];

export default function ResultChart({ data, chartType, onChartTypeChange }: ResultChartProps) {
  const [transitioning, setTransitioning] = useState(false);
  const { labels, values } = useMemo(() => extractChartData(data), [data]);

  const handleTypeChange = (type: ChartType) => {
    if (type === chartType) return;
    setTransitioning(true);
    setTimeout(() => {
      onChartTypeChange(type);
      setTimeout(() => setTransitioning(false), 50);
    }, 200);
  };

  const chartData = useMemo(() => {
    if (chartType === 'pie') {
      return {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: COLORS.slice(0, values.length),
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      };
    }
    return {
      labels,
      datasets: [
        {
          label: '数值',
          data: values,
          backgroundColor: chartType === 'bar' ? 'rgba(0, 173, 181, 0.6)' : 'transparent',
          borderColor: '#00adb5',
          borderWidth: 2,
          borderRadius: chartType === 'bar' ? 4 : 0,
          pointBackgroundColor: '#00adb5',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: chartType === 'line' ? 4 : 0,
          tension: 0.3,
          fill: chartType === 'line' ? { target: 'origin', above: 'rgba(0,173,181,0.08)' } : false,
        },
      ],
    };
  }, [labels, values, chartType]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: transitioning ? 400 : 600,
      },
      plugins: {
        legend: {
          display: chartType === 'pie',
          position: 'bottom' as const,
          labels: {
            padding: 12,
            font: { size: 11 },
            color: '#666',
          },
        },
        title: {
          display: false,
        },
      },
      scales:
        chartType === 'pie'
          ? undefined
          : {
              x: {
                ticks: { font: { size: 11 }, color: '#999' },
                grid: { display: false },
              },
              y: {
                ticks: { font: { size: 11 }, color: '#999' },
                grid: { color: 'rgba(0,0,0,0.05)' },
              },
            },
    }),
    [chartType, transitioning]
  );

  const chartTypes: { key: ChartType; label: string }[] = [
    { key: 'bar', label: '柱状图' },
    { key: 'line', label: '折线图' },
    { key: 'pie', label: '饼图' },
  ];

  if (labels.length === 0) {
    return (
      <div style={{ padding: 20, color: '#999', textAlign: 'center', fontSize: 13 }}>
        暂无图表数据
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 8,
          background: '#f5f7fa',
          borderRadius: 8,
          padding: 3,
        }}
      >
        {chartTypes.map(t => (
          <button
            key={t.key}
            onClick={() => handleTypeChange(t.key)}
            style={{
              flex: 1,
              padding: '4px 0',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.3s',
              background: chartType === t.key ? '#00adb5' : 'transparent',
              color: chartType === t.key ? '#fff' : '#666',
              fontWeight: chartType === t.key ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 220,
          position: 'relative',
          transition: 'opacity 0.4s, transform 0.4s',
          opacity: transitioning ? 0.3 : 1,
          transform: transitioning ? 'scale(0.97)' : 'scale(1)',
        }}
      >
        {chartType === 'bar' && <Bar data={chartData} options={options} />}
        {chartType === 'line' && <Line data={chartData} options={options} />}
        {chartType === 'pie' && <Pie data={chartData} options={options} />}
      </div>
    </div>
  );
}
