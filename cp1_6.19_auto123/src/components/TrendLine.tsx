import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { CommuteRecord, TransportType } from '../types';
import { TRANSPORT_LABELS, TRANSPORT_COLORS } from '../mockApi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler
);

interface TrendLineProps {
  records: CommuteRecord[];
}

interface DailyData {
  date: string;
  dateLabel: string;
  total: number;
  breakdown: Record<TransportType, number>;
}

export default function TrendLine({ records }: TrendLineProps) {
  const { dailyData, average } = useMemo(() => {
    const days: DailyData[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
      const dateLabel = i === 0 ? '今天' : i === 1 ? '昨天' : `${date.getMonth() + 1}/${date.getDate()} ${dayOfWeek}`;

      const dayRecords = records.filter((r) => {
        const rDate = new Date(r.timestamp);
        const rStr = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`;
        return rStr === dateStr;
      });

      const breakdown: Record<TransportType, number> = {
        walk: 0,
        bicycle: 0,
        electric: 0,
        bus: 0,
        metro: 0,
        car: 0,
        carpool: 0,
      };

      let total = 0;
      dayRecords.forEach((r) => {
        breakdown[r.transport] += r.emission;
        total += r.emission;
      });

      days.push({
        date: dateStr,
        dateLabel,
        total,
        breakdown,
      });
    }

    const validDays = days.filter((d) => d.total > 0);
    const average = validDays.length > 0
      ? validDays.reduce((sum, d) => sum + d.total, 0) / validDays.length
      : 0;

    return { dailyData: days, average };
  }, [records]);

  const data = useMemo(() => {
    const labels = dailyData.map((d) => d.dateLabel);
    const dataPoints = dailyData.map((d) => d.total / 1000);
    const averageData = dailyData.map(() => average / 1000);

    return {
      labels,
      datasets: [
        {
          label: '日碳排放',
          data: dataPoints,
          borderColor: '#2E7D32',
          backgroundColor: 'rgba(46, 125, 50, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2E7D32',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 10,
          pointHoverBackgroundColor: '#FF8A65',
          pointHoverBorderWidth: 3,
        },
        {
          label: '周均排放',
          data: averageData,
          borderColor: '#FF8A65',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
        },
      ],
    };
  }, [dailyData, average]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 700,
      easing: 'easeOutCubic' as const,
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          padding: 16,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        padding: 14,
        cornerRadius: 8,
        callbacks: {
          afterBody: (tooltipItems: Array<{ dataIndex: number; datasetIndex: number }>) => {
            if (tooltipItems.length === 0) return '';
            const dataIndex = tooltipItems[0].dataIndex;
            const day = dailyData[dataIndex];
            const lines: string[] = ['', '细分数据:'];

            Object.entries(day.breakdown).forEach(([type, value]) => {
              if (value > 0) {
                const kg = (value / 1000).toFixed(2);
                lines.push(`${TRANSPORT_LABELS[type as TransportType]}: ${kg} kg`);
              }
            });

            return lines.join('\n');
          },
          label: (context: { dataset: { label?: string }; raw: number }) => {
            const label = context.dataset.label || '';
            return `${label}: ${context.raw.toFixed(2)} kg`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 12,
          },
          color: '#666',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 12,
          },
          color: '#666',
          callback: (value: number | string) => `${value} kg`,
        },
      },
    },
  }), [dailyData]);

  return (
    <div className="card">
      <h2 className="card-title">📈 7天趋势</h2>
      <div className="chart-container">
        <Line data={data} options={options} />
      </div>
      <div className="legend" style={{ marginTop: '12px' }}>
        {Object.entries(TRANSPORT_COLORS).map(([type, color]) => (
          <div key={type} className="legend-item">
            <span className="legend-color" style={{ backgroundColor: color }} />
            {TRANSPORT_LABELS[type as TransportType]}
          </div>
        ))}
      </div>
    </div>
  );
}
