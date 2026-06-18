import { useMemo } from 'react';
import {
  ChartData,
  ChartOptions,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { CSVData } from '../utils/csvParser';

export type ChartType = 'line' | 'bar' | 'pie';

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  xField: string;
  yField: string;
}

const THEME_COLORS = ['#4f46e5', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export function useChartData(
  data: CSVData | null,
  config: ChartConfig
): { chartData: any; options: any } {
  return useMemo(() => {
    if (!data || !config.xField || !config.yField) {
      return {
        chartData: { labels: [], datasets: [] },
        options: {}
      };
    }

    const xIndex = data.columns.indexOf(config.xField);
    const yIndex = data.columns.indexOf(config.yField);

    if (xIndex === -1 || yIndex === -1) {
      return {
        chartData: { labels: [], datasets: [] },
        options: {}
      };
    }

    const labels = data.rows.map(row => row[xIndex]);
    const values = data.rows.map(row => Number(row[yIndex]) || 0);

    if (config.type === 'pie') {
      const backgroundColors = labels.map((_, i) => THEME_COLORS[i % THEME_COLORS.length]);
      const chartData: ChartData<'pie'> = {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: backgroundColors,
            borderColor: '#1e1e2e',
            borderWidth: 2
          }
        ]
      };
      const options: ChartOptions<'pie'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#e0e0e0',
              font: {
                family: 'Inter, sans-serif',
                size: 14
              }
            }
          },
          tooltip: {
            backgroundColor: '#2a2a3e',
            titleColor: '#e0e0e0',
            bodyColor: '#e0e0e0'
          }
        }
      };
      return { chartData, options };
    }

    const chartType = config.type as 'line' | 'bar';
    const chartData: ChartData<'line' | 'bar'> = {
      labels,
      datasets: [
        {
          label: config.yField,
          data: values,
          backgroundColor: config.type === 'bar' ? THEME_COLORS[0] : 'rgba(79, 70, 229, 0.2)',
          borderColor: THEME_COLORS[0],
          borderWidth: 2,
          fill: config.type === 'line',
          tension: 0.4,
          pointBackgroundColor: THEME_COLORS[0],
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };

    const options: ChartOptions<'line' | 'bar'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#e0e0e0',
            font: {
              family: 'Inter, sans-serif',
              size: 14
            }
          }
        },
        tooltip: {
          backgroundColor: '#2a2a3e',
          titleColor: '#e0e0e0',
          bodyColor: '#e0e0e0',
          borderColor: '#4f46e5',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#e0e0e0',
            font: {
              family: 'Inter, sans-serif',
              size: 14
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          ticks: {
            color: '#e0e0e0',
            font: {
              family: 'Inter, sans-serif',
              size: 14
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      }
    };

    return { chartData, options };
  }, [data, config]);
}
