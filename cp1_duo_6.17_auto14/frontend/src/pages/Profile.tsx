import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Radar, Bar } from 'react-chartjs-2';
import { userAPI } from '../utils/api';
import type { User, MonthlySpending, FlavorProfile, OriginStats } from '../types';
import './Profile.scss';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const avatarColors = [
  '#FFB74D',
  '#81C784',
  '#64B5F6',
  '#F06292',
  '#BA68C8',
  '#4DB6AC',
  '#FF8A65',
  '#A1887F',
];

function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [monthlySpending, setMonthlySpending] = useState<MonthlySpending[]>([]);
  const [flavorProfile, setFlavorProfile] = useState<FlavorProfile | null>(null);
  const [originStats, setOriginStats] = useState<OriginStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await userAPI.getProfile();
      setUser(profileData.user || mockUser);

      const statsData = await userAPI.getStats();
      setMonthlySpending(statsData.monthly_spending || mockMonthlySpending);
      setFlavorProfile(statsData.flavor_profile || mockFlavorProfile);
      setOriginStats(statsData.origin_stats || mockOriginStats);
    } catch (error) {
      console.error('Failed to load profile:', error);
      setUser(mockUser);
      setMonthlySpending(mockMonthlySpending);
      setFlavorProfile(mockFlavorProfile);
      setOriginStats(mockOriginStats);
    } finally {
      setLoading(false);
    }
  };

  const lineChartData = {
    labels: monthlySpending.map((m) => m.month),
    datasets: [
      {
        label: '月度消费',
        data: monthlySpending.map((m) => m.amount),
        fill: true,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(139, 195, 74, 0.4)');
          gradient.addColorStop(1, 'rgba(139, 195, 74, 0.05)');
          return gradient;
        },
        borderColor: '#8BC34A',
        borderWidth: 3,
        pointBackgroundColor: '#8BC34A',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(78, 52, 46, 0.9)',
        titleColor: '#FFF3E0',
        bodyColor: '#FFF3E0',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `¥${context.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#8D6E63',
          font: {
            size: 12,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(78, 52, 46, 0.08)',
        },
        ticks: {
          color: '#8D6E63',
          font: {
            size: 12,
          },
          callback: (value: any) => `¥${value}`,
        },
        beginAtZero: true,
      },
    },
  };

  const radarChartData = flavorProfile
    ? {
        labels: ['酸度', '苦度', '甜度', '醇厚度', '香气'],
        datasets: [
          {
            label: '风味偏好',
            data: [
              flavorProfile.acidity,
              flavorProfile.bitterness,
              flavorProfile.sweetness,
              flavorProfile.body,
              flavorProfile.aroma,
            ],
            backgroundColor: 'rgba(229, 57, 53, 0.2)',
            borderColor: '#E53935',
            borderWidth: 2,
            pointBackgroundColor: '#E53935',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
          },
        ],
      }
    : { labels: [], datasets: [] };

  const radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(78, 52, 46, 0.9)',
        titleColor: '#FFF3E0',
        bodyColor: '#FFF3E0',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          color: '#8D6E63',
          font: {
            size: 10,
          },
          backdropColor: 'transparent',
        },
        grid: {
          color: 'rgba(78, 52, 46, 0.1)',
        },
        angleLines: {
          color: 'rgba(78, 52, 46, 0.1)',
        },
        pointLabels: {
          color: '#5D4037',
          font: {
            size: 13,
            weight: 500,
          },
          callback: function (label: string, index: number) {
            const values = [
              flavorProfile?.acidity || 0,
              flavorProfile?.bitterness || 0,
              flavorProfile?.sweetness || 0,
              flavorProfile?.body || 0,
              flavorProfile?.aroma || 0,
            ];
            return `${label}\n${values[index]}%`;
          },
        },
      },
    },
  };

  const barChartData = {
    labels: originStats.map((o) => o.origin),
    datasets: [
      {
        label: '订阅次数',
        data: originStats.map((o) => o.count),
        backgroundColor: originStats.map((o) => o.color),
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(78, 52, 46, 0.9)',
        titleColor: '#FFF3E0',
        bodyColor: '#FFF3E0',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(78, 52, 46, 0.08)',
        },
        ticks: {
          color: '#8D6E63',
          font: {
            size: 12,
          },
          stepSize: 1,
        },
        beginAtZero: true,
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#5D4037',
          font: {
            size: 13,
            weight: 500,
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-skeleton">
          <div className="skeleton-profile-header">
            <div className="skeleton-avatar skeleton-avatar--large" />
            <div className="skeleton-profile-info">
              <div className="skeleton-line skeleton-line--title" />
              <div className="skeleton-line" />
            </div>
          </div>
          <div className="skeleton-card">
            <div className="skeleton-line skeleton-line--title" />
            <div className="skeleton-chart" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div
          className="profile-avatar"
          style={{ backgroundColor: user?.avatar_color || avatarColors[0] }}
        >
          {user?.nickname?.charAt(0) || '?'}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{user?.nickname || '咖啡爱好者'}</h1>
          <p className="profile-email">{user?.email || 'coffee@example.com'}</p>
        </div>
        <div className="profile-stats-summary">
          <div className="stat-item">
            <span className="stat-item__value">¥{user?.total_spent || 0}</span>
            <span className="stat-item__label">累计消费</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card chart-card--wide">
          <h3 className="chart-card__title">月度消费趋势</h3>
          <p className="chart-card__subtitle">过去6个月的订阅消费</p>
          <div className="chart-container chart-container--line">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-card__title">风味偏好</h3>
          <p className="chart-card__subtitle">基于你的品鉴笔记分析</p>
          <div className="chart-container chart-container--radar">
            <Radar data={radarChartData} options={radarChartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-card__title">最常购买产区</h3>
          <p className="chart-card__subtitle">你的订阅产地分布</p>
          <div className="chart-container chart-container--bar">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}

const mockUser: User = {
  id: 1,
  email: 'coffee@example.com',
  nickname: '咖啡控小明',
  avatar_color: '#FFB74D',
  subscription_plan: '高级订阅',
  total_spent: 1280,
};

const mockMonthlySpending: MonthlySpending[] = [
  { month: '1月', amount: 198 },
  { month: '2月', amount: 256 },
  { month: '3月', amount: 178 },
  { month: '4月', amount: 298 },
  { month: '5月', amount: 218 },
  { month: '6月', amount: 132 },
];

const mockFlavorProfile: FlavorProfile = {
  acidity: 75,
  bitterness: 45,
  sweetness: 68,
  body: 55,
  aroma: 82,
};

const mockOriginStats: OriginStats[] = [
  { origin: '埃塞俄比亚', count: 8, color: '#8BC34A' },
  { origin: '哥伦比亚', count: 5, color: '#4DB6AC' },
  { origin: '肯尼亚', count: 4, color: '#64B5F6' },
  { origin: '巴拿马', count: 3, color: '#BA68C8' },
  { origin: '巴西', count: 2, color: '#FFB74D' },
];

export default Profile;
