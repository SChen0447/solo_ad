import React, { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { api, DashboardData } from '../api'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface DashboardProps {
  onShowToast?: (message: string, type?: 'success' | 'error') => void
}

export const Dashboard: React.FC<DashboardProps> = ({ onShowToast }) => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const res = await api.getDashboard()
      setData(res.data)
    } catch (err) {
      onShowToast?.('加载仪表盘数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        <p>正在加载数据...</p>
      </div>
    )
  }

  if (!data) return null

  const chartData = {
    labels: data.trendDates,
    datasets: [
      {
        label: '借阅/购买次数',
        data: data.trendValues,
        borderColor: '#45B7D1',
        backgroundColor: 'rgba(69, 183, 209, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#45B7D1',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointStyle: 'rectRounded' as const,
        tension: 0.3,
        fill: true
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(44, 62, 80, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: '#E8E8E8',
          drawBorder: false,
          borderDash: [4, 4]
        },
        ticks: {
          color: '#888',
          font: { size: 12 }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: '#E8E8E8',
          drawBorder: false,
          borderDash: [4, 4]
        },
        ticks: {
          color: '#888',
          font: { size: 12 },
          precision: 0
        }
      }
    }
  }

  const maxCount = Math.max(...data.categoryStats.map(s => s.count), 1)

  return (
    <div>
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#E8F8F5', color: '#2ECC71' }}>
            📚
          </div>
          <div className="stat-label">今日新增图书</div>
          <div className="stat-value" style={{ color: '#2ECC71' }}>{data.todayNewBooks}</div>
          <div className="stat-sub">本</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EBF5FB', color: '#3498DB' }}>
            🏷️
          </div>
          <div className="stat-label">总库存量</div>
          <div className="stat-value" style={{ color: '#3498DB' }}>{data.totalInventory}</div>
          <div className="stat-sub">本书籍</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF9E7', color: '#F39C12' }}>
            📖
          </div>
          <div className="stat-label">累计借阅</div>
          <div className="stat-value" style={{ color: '#F39C12' }}>{data.totalBorrowCount}</div>
          <div className="stat-sub">次记录</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="chart-card">
          <h3>近7日借阅趋势</h3>
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="category-card">
          <h3>分类库存分布</h3>
          <div className="category-list">
            {data.categoryStats.map(stat => (
              <div key={stat.name} className="category-row">
                <div className="category-dot" style={{ background: stat.color }} />
                <div className="category-name">{stat.name}</div>
                <div className="category-bar">
                  <div
                    className="category-fill"
                    style={{
                      width: `${(stat.count / maxCount) * 100}%`,
                      background: stat.color
                    }}
                  />
                </div>
                <div className="category-count">{stat.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
