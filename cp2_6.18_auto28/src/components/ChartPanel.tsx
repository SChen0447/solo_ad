import { useRef, useEffect, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Pie, Line } from 'react-chartjs-2'
import type { Asset } from '../App'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

interface ChartPanelProps {
  assets: Asset[]
}

const categoryColors: Record<string, { bg: string; border: string }> = {
  现金: { bg: 'rgba(34, 197, 94, 0.7)', border: 'rgba(34, 197, 94, 1)' },
  股票: { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgba(59, 130, 246, 1)' },
  基金: { bg: 'rgba(139, 92, 246, 0.7)', border: 'rgba(139, 92, 246, 1)' },
  加密货币: { bg: 'rgba(249, 115, 22, 0.7)', border: 'rgba(249, 115, 22, 1)' },
}

const generateCustomColor = (index: number) => {
  const hue = (index * 67) % 360
  return {
    bg: `hsla(${hue}, 70%, 60%, 0.7)`,
    border: `hsla(${hue}, 70%, 60%, 1)`,
  }
}

export default function ChartPanel({ assets }: ChartPanelProps) {
  const pieChartRef = useRef<ChartJS<'pie'>>(null)
  const lineChartRef = useRef<ChartJS<'line'>>(null)

  const dates = useMemo(() => {
    return Array.from(new Set(assets.map((a) => a.date))).sort()
  }, [assets])

  const pieData = useMemo((): ChartData<'pie'> => {
    if (dates.length === 0) {
      return { labels: [], datasets: [] }
    }
    const latestDate = dates[dates.length - 1]
    const latestAssets = assets.filter((a) => a.date === latestDate)
    const categoryMap = new Map<string, number>()
    const customCategories: string[] = []

    latestAssets.forEach((a) => {
      const existing = categoryMap.get(a.category) || 0
      categoryMap.set(a.category, existing + a.value)
      if (!categoryColors[a.category] && !customCategories.includes(a.category)) {
        customCategories.push(a.category)
      }
    })

    const labels = Array.from(categoryMap.keys())
    const values = Array.from(categoryMap.values())
    const bgColors = labels.map((label, idx) => {
      if (categoryColors[label]) {
        return categoryColors[label].bg
      }
      const customIdx = customCategories.indexOf(label)
      return generateCustomColor(customIdx >= 0 ? customIdx : idx).bg
    })
    const borderColors = labels.map((label, idx) => {
      if (categoryColors[label]) {
        return categoryColors[label].border
      }
      const customIdx = customCategories.indexOf(label)
      return generateCustomColor(customIdx >= 0 ? customIdx : idx).border
    })

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 2,
          hoverOffset: 5,
        },
      ],
    }
  }, [assets, dates])

  const lineData = useMemo((): ChartData<'line'> => {
    const netWorths = dates.map((date) => {
      return assets
        .filter((a) => a.date === date)
        .reduce((sum, a) => sum + a.value, 0)
    })

    return {
      labels: dates,
      datasets: [
        {
          label: '资产净值',
          data: netWorths,
          borderColor: (context) => {
            const chart = context.chart
            const { ctx, chartArea } = chart
            if (!chartArea) {
              return '#3b82f6'
            }
            const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0)
            gradient.addColorStop(0, '#3b82f6')
            gradient.addColorStop(1, '#8b5cf6')
            return gradient
          },
          backgroundColor: (context) => {
            const chart = context.chart
            const { ctx, chartArea } = chart
            if (!chartArea) {
              return 'rgba(59, 130, 246, 0.1)'
            }
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)')
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0.05)')
            return gradient
          },
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#3b82f6',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
          tension: 0.3,
          fill: true,
          borderWidth: 3,
        },
      ],
    }
  }, [assets, dates])

  const pieOptions: ChartOptions<'pie'> = {
    responsive: false,
    maintainAspectRatio: false,
    animation: {
      duration: 200,
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#e0e0e0',
          padding: 16,
          font: {
            size: 12,
          },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(30, 30, 46, 0.95)',
        titleColor: '#e0e0e0',
        bodyColor: '#e0e0e0',
        borderColor: '#3a3a4e',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const value = context.parsed
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            const formattedValue = value.toLocaleString('zh-CN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
            return `${context.label}: ¥${formattedValue} (${percentage}%)`
          },
        },
      },
    },
  }

  const lineOptions: ChartOptions<'line'> = {
    responsive: false,
    maintainAspectRatio: false,
    animation: {
      duration: 200,
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#a0a0b0',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#a0a0b0',
          font: {
            size: 11,
          },
          callback: (tickValue) => {
            const value = typeof tickValue === 'number' ? tickValue : parseFloat(tickValue as string)
            if (value >= 10000) {
              return (value / 10000).toFixed(1) + '万'
            }
            return value.toLocaleString()
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(30, 30, 46, 0.95)',
        titleColor: '#e0e0e0',
        bodyColor: '#e0e0e0',
        borderColor: '#3a3a4e',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y ?? 0
            const formattedValue = value.toLocaleString('zh-CN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
            return `净值: ¥${formattedValue}`
          },
        },
      },
    },
  }

  useEffect(() => {
    if (pieChartRef.current) {
      pieChartRef.current.update()
    }
    if (lineChartRef.current) {
      lineChartRef.current.update()
    }
  }, [assets, pieData, lineData])

  return (
    <>
      <div className="chart-card pie-chart-card">
        <h3>资产配置比例</h3>
        <div className="pie-chart-container">
          {dates.length > 0 ? (
            <Pie ref={pieChartRef} data={pieData} options={pieOptions} />
          ) : (
            <div className="empty-state" style={{ padding: '100px 0' }}>
              暂无数据
            </div>
          )}
        </div>
      </div>

      <div className="chart-card line-chart-card">
        <h3>净值走势曲线</h3>
        <div className="line-chart-container">
          {dates.length > 0 ? (
            <Line ref={lineChartRef} data={lineData} options={lineOptions} />
          ) : (
            <div className="empty-state" style={{ padding: '80px 0' }}>
              暂无数据
            </div>
          )}
        </div>
      </div>
    </>
  )
}
