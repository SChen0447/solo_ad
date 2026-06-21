import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DailySummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

function NutritionDashboard() {
  const [summary, setSummary] = useState<DailySummary[]>([]);
  const [activeNutrient, setActiveNutrient] = useState<string>('all');
  const refreshKey = useRef(0);

  const fetchNutritionData = async () => {
    try {
      const res = await fetch('/api/nutrition/summary?days=7');
      const data = await res.json();
      setSummary(data.summary || []);
    } catch (error) {
      console.error('获取营养数据失败:', error);
    }
  };

  useEffect(() => {
    fetchNutritionData();
    const interval = setInterval(fetchNutritionData, 5000);
    return () => clearInterval(interval);
  }, [refreshKey.current]);

  const generateDateLabels = () => {
    const labels = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      labels.push(`${month}/${day}`);
    }
    return labels;
  };

  const getFullData = () => {
    const labels = generateDateLabels();
    const today = new Date();
    const dateMap = new Map<string, DailySummary>();

    summary.forEach(item => {
      const dateStr = item.date;
      dateMap.set(dateStr, item);
    });

    const caloriesData: number[] = [];
    const proteinData: number[] = [];
    const carbsData: number[] = [];
    const fatData: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayData = dateMap.get(dateStr);
      caloriesData.push(dayData ? Math.round(dayData.total_calories) : 0);
      proteinData.push(dayData ? Math.round(dayData.total_protein) : 0);
      carbsData.push(dayData ? Math.round(dayData.total_carbs) : 0);
      fatData.push(dayData ? Math.round(dayData.total_fat) : 0);
    }

    return { labels, caloriesData, proteinData, carbsData, fatData };
  };

  const { labels, caloriesData, proteinData, carbsData, fatData } = getFullData();

  const createGradient = (ctx: CanvasRenderingContext2D, color: string) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '05');
    return gradient;
  };

  const allDatasets = [
    {
      label: '热量 (千卡)',
      data: caloriesData,
      borderColor: '#F5A623',
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        return createGradient(ctx, '#F5A623');
      },
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#F5A623',
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
    },
    {
      label: '蛋白质 (g)',
      data: proteinData,
      borderColor: '#E74C3C',
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        return createGradient(ctx, '#E74C3C');
      },
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#E74C3C',
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
    },
    {
      label: '碳水 (g)',
      data: carbsData,
      borderColor: '#3498DB',
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        return createGradient(ctx, '#3498DB');
      },
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#3498DB',
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
    },
    {
      label: '脂肪 (g)',
      data: fatData,
      borderColor: '#9B59B6',
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        return createGradient(ctx, '#9B59B6');
      },
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#9B59B6',
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
    },
  ];

  const getSingleDataset = (key: string) => {
    const map: Record<string, { data: number[]; color: string; label: string }> = {
      calories: { data: caloriesData, color: '#F5A623', label: '热量 (千卡)' },
      protein: { data: proteinData, color: '#E74C3C', label: '蛋白质 (g)' },
      carbs: { data: carbsData, color: '#3498DB', label: '碳水 (g)' },
      fat: { data: fatData, color: '#9B59B6', label: '脂肪 (g)' },
    };
    const item = map[key];
    return [{
      label: item.label,
      data: item.data,
      borderColor: item.color,
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        return createGradient(ctx, item.color);
      },
      tension: 0.4,
      fill: true,
      pointRadius: 5,
      pointHoverRadius: 7,
      pointBackgroundColor: item.color,
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
    }];
  };

  const chartData = {
    labels,
    datasets: activeNutrient === 'all' ? allDatasets : getSingleDataset(activeNutrient),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: activeNutrient === 'all',
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
          },
          color: '#666666',
          usePointStyle: true,
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(50, 50, 50, 0.9)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: '#999999',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: '#999999',
          font: {
            size: 11,
          },
        },
        beginAtZero: true,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const nutrientTabs = [
    { key: 'all', label: '全部' },
    { key: 'calories', label: '热量', color: '#F5A623' },
    { key: 'protein', label: '蛋白质', color: '#E74C3C' },
    { key: 'carbs', label: '碳水', color: '#3498DB' },
    { key: 'fat', label: '脂肪', color: '#9B59B6' },
  ];

  const totalToday = {
    calories: caloriesData[caloriesData.length - 1] || 0,
    protein: proteinData[proteinData.length - 1] || 0,
    carbs: carbsData[carbsData.length - 1] || 0,
    fat: fatData[fatData.length - 1] || 0,
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📊 营养仪表盘</h2>
        <span style={styles.subtitle}>近7天摄入趋势</span>
      </div>

      <div style={styles.statsRow}>
        <div className="stat-card" style={styles.statCard}>
          <span style={{ ...styles.statIcon, backgroundColor: '#FFF3E0' }}>🔥</span>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{totalToday.calories}</span>
            <span style={styles.statLabel}>千卡 (今日)</span>
          </div>
        </div>
        <div className="stat-card" style={styles.statCard}>
          <span style={{ ...styles.statIcon, backgroundColor: '#FFEBEE' }}>🥩</span>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{totalToday.protein}g</span>
            <span style={styles.statLabel}>蛋白质</span>
          </div>
        </div>
        <div className="stat-card" style={styles.statCard}>
          <span style={{ ...styles.statIcon, backgroundColor: '#E3F2FD' }}>🍚</span>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{totalToday.carbs}g</span>
            <span style={styles.statLabel}>碳水</span>
          </div>
        </div>
        <div className="stat-card" style={styles.statCard}>
          <span style={{ ...styles.statIcon, backgroundColor: '#F3E5F5' }}>🥑</span>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{totalToday.fat}g</span>
            <span style={styles.statLabel}>脂肪</span>
          </div>
        </div>
      </div>

      <div style={styles.chartTabs}>
        {nutrientTabs.map(tab => (
          <button
            className="btn-scale tab-btn"
            key={tab.key}
            style={{
              ...styles.chartTab,
              ...(activeNutrient === tab.key
                ? {
                    backgroundColor: (tab as any).color || '#F5A623',
                    color: '#FFFFFF',
                  }
                : {}),
            }}
            onClick={() => setActiveNutrient(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={styles.chartContainer}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: '15px',
    border: '1px solid #E0E0E0',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexShrink: 0,
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    fontSize: '13px',
    color: '#999999',
  },
  statsRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexShrink: 0,
  },
  statCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    backgroundColor: '#FAFAFA',
    borderRadius: '10px',
    border: '1px solid #F0F0F0',
  },
  statIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333333',
  },
  statLabel: {
    fontSize: '11px',
    color: '#999999',
  },
  chartTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    flexShrink: 0,
  },
  chartTab: {
    padding: '6px 14px',
    border: '1px solid #E0E0E0',
    borderRadius: '16px',
    backgroundColor: '#FFFFFF',
    color: '#666666',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  chartContainer: {
    flex: 1,
    position: 'relative',
    minHeight: '200px',
  },
};

export default NutritionDashboard;
