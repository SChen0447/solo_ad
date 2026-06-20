import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { getTicketStats } from '../../services/ticketService'
import { TicketStats } from '../../types'
import { Skeleton } from '../通用/Skeleton'

const StatsBoard: React.FC = () => {
  const [stats, setStats] = useState<TicketStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTicketStats()
      setStats(data)
    } catch (err) {
      setError('加载统计数据失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const COLORS = {
    urgent: '#dc2626',
    high: '#ea580c',
    medium: '#2563eb',
    low: '#6b7280',
  }

  const getColor = (name: string) => {
    const colorMap: Record<string, string> = {
      '紧急': COLORS.urgent,
      '高': COLORS.high,
      '中': COLORS.medium,
      '低': COLORS.low,
    }
    return colorMap[name] || '#6b7280'
  }

  const formatPieData = (data: { name: string; value: number }[]) => {
    return data.map(item => ({
      ...item,
      fill: getColor(item.name),
    }))
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>数据统计</h1>
        <div style={styles.statsHeader}>
          <Skeleton width={120} height={32} borderRadius={4} />
          <Skeleton width={150} height={20} borderRadius={4} />
        </div>
        <div style={styles.chartsContainer}>
          <div style={styles.chartCard}>
            <Skeleton width="100%" height={300} borderRadius={16} />
          </div>
          <div style={styles.chartCard}>
            <Skeleton width="100%" height={300} borderRadius={16} />
          </div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>数据统计</h1>
        <div style={styles.errorMessage}>{error || '加载失败'}</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>数据统计</h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={styles.statsHeader}
      >
        <div>
          <span style={styles.totalCount}>{stats.total}</span>
          <span style={styles.totalLabel}>总工单数</span>
        </div>
        <div style={styles.pendingInfo}>
          待处理：<span style={styles.pendingCount}>{stats.pending}</span> 条
        </div>
      </motion.div>

      <div className="charts-container" style={styles.chartsContainer}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={styles.chartCard}
        >
          <h3 style={styles.chartTitle}>按分类统计</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={stats.byCategory}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              animationDuration={500}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#e5e7eb' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Bar
                dataKey="value"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                animationDuration={500}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={styles.chartCard}
        >
          <h3 style={styles.chartTitle}>优先级分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart animationDuration={500}>
              <Pie
                data={formatPieData(stats.byPriority)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                animationDuration={500}
              >
                {stats.byPriority.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Legend
                formatter={(value) => <span style={{ color: '#374151', fontSize: 12 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: 1024,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  statsHeader: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  totalCount: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
    marginRight: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  pendingInfo: {
    fontSize: 16,
    color: '#6b7280',
  },
  pendingCount: {
    fontWeight: 600,
    color: '#ea580c',
  },
  chartsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
  },
  chartCard: {
    width: '100%',
    height: 360,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px 0',
  },
  errorMessage: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    borderRadius: 8,
  },
}

export default StatsBoard
