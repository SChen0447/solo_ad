import { useState, useEffect, useRef } from 'react'
import { Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler,
} from 'chart.js'
import { moodApi } from '@/api'
import { MOOD_CONFIGS, getMoodConfig } from '@/types'
import type { MoodAggregate, MoodType, MoodDistribution } from '@/types'
import './style.css'

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
)

function AnalysisPanel() {
  const [aggregate, setAggregate] = useState<MoodAggregate | null>(null)
  const timerRef = useRef<number | null>(null)

  const fetchData = async () => {
    try {
      const data = await moodApi.getAggregate()
      setAggregate(data)
    } catch (e) {
      console.error('获取聚合数据失败', e)
    }
  }

  useEffect(() => {
    fetchData()
    timerRef.current = window.setInterval(fetchData, 2000)
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const doughnutData = {
    labels: aggregate?.distribution.map(d => getMoodConfig(d.mood).label) || [],
    datasets: [
      {
        data: aggregate?.distribution.map(d => d.count) || [],
        backgroundColor: aggregate?.distribution.map(d => getMoodConfig(d.mood).color) || [],
        borderColor: '#fff',
        borderWidth: 2,
        hoverOffset: 8,
        spacing: 2,
      },
    ],
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          padding: 12,
          font: {
            size: 11,
          },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 12,
        },
        bodyFont: {
          size: 12,
        },
        padding: 8,
        cornerRadius: 4,
        callbacks: {
          label: (context: any) => {
            const dist = aggregate?.distribution[context.dataIndex]
            if (!dist) return ''
            return `${dist.count}人 (${dist.percentage.toFixed(1)}%)`
          },
        },
      },
    },
  }

  const lineData = {
    labels: aggregate?.intensityHistory.map(d => d.time) || [],
    datasets: MOOD_CONFIGS.map(mood => ({
      label: mood.label,
      data: aggregate?.intensityHistory.map(d => d[mood.type as keyof typeof d] as number) || [],
      borderColor: mood.color,
      backgroundColor: mood.color + '20',
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: mood.color,
      pointBorderColor: '#fff',
      pointBorderWidth: 1.5,
      pointHoverRadius: 6,
      tension: 0.3,
      fill: false,
    })),
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 10,
          },
          color: '#95a5a6',
          maxRotation: 0,
          maxTicksLimit: 6,
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: '#f0f0f0',
        },
        ticks: {
          font: {
            size: 10,
          },
          color: '#95a5a6',
          callback: (value: number | string) => `${value}%`,
          stepSize: 25,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 12,
        },
        bodyFont: {
          size: 12,
          color: '#fff',
        },
        padding: 8,
        cornerRadius: 4,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`
          },
        },
      },
    },
  }

  return (
    <div className="analysis-panel-content">
      <div className="analysis-section">
        <h4 className="analysis-section-title">情绪分布</h4>
        <div className="chart-container">
          {aggregate ? (
            <Doughnut data={doughnutData} options={doughnutOptions} />
          ) : (
            <div className="chart-loading">加载中...</div>
          )}
        </div>
        <div className="total-count">
          共 <span className="total-number">{aggregate?.totalCount || 0}</span> 条记录
        </div>
      </div>

      <div className="analysis-section">
        <h4 className="analysis-section-title">情绪强度趋势</h4>
        <div className="line-chart-container">
          {aggregate ? (
            <Line data={lineData} options={lineOptions} />
          ) : (
            <div className="chart-loading">加载中...</div>
          )}
        </div>
      </div>

      <div className="analysis-section">
        <h4 className="analysis-section-title">情绪详情</h4>
        <div className="mood-details">
          {MOOD_CONFIGS.map(mood => {
            const dist = aggregate?.distribution.find(d => d.mood === mood.type)
            return (
              <div key={mood.type} className="mood-detail-item">
                <div className="mood-detail-color" style={{ backgroundColor: mood.color }} />
                <div className="mood-detail-info">
                  <span className="mood-detail-label">{mood.label}</span>
                  <span className="mood-detail-value">{dist?.count || 0}人</span>
                </div>
                <div className="mood-detail-bar">
                  <div
                    className="mood-detail-bar-fill"
                    style={{
                      width: `${dist?.percentage || 0}%`,
                      backgroundColor: mood.color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AnalysisPanel
