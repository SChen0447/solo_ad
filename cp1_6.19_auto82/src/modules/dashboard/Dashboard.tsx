import { useEffect } from 'react'
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
  Legend
} from 'recharts'
import { useStatsStore } from '../../store'
import './dashboard.css'

export default function Dashboard() {
  const { weeklyOrders, flavorDistribution, lowStockItems, loading, fetchStats } = useStatsStore()

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">统计看板</h2>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="dashboard-grid">
          <div className="card chart-card weekly-chart">
            <h3>本周订单趋势</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyOrders} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff9ff3" />
                      <stop offset="100%" stopColor="#f368e0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eaeef2" />
                  <XAxis dataKey="day" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #eaeef2',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}
                    formatter={(value: number) => [`${value} 单`, '订单数']}
                  />
                  <Bar dataKey="orders" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card chart-card flavor-chart">
            <h3>口味分布</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={flavorDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                    }
                    labelLine={false}
                  >
                    {flavorDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #eaeef2',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}
                    formatter={(value: number) => [`${value} 单`, '订单数']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card low-stock-card">
            <h3>低库存预警</h3>
            {lowStockItems.length === 0 ? (
              <div className="no-warning">
                <span className="check-icon">✓</span>
                <p>所有原料库存充足</p>
              </div>
            ) : (
              <div className="low-stock-list">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="low-stock-item">
                    <div className="stock-info">
                      <span className="stock-name">{item.name}</span>
                      <span className="stock-quantity">
                        {item.quantity} {item.unit} / 安全阈值 {item.safeThreshold} {item.unit}
                      </span>
                    </div>
                    <div className="stock-bar-container">
                      <div
                        className="stock-bar"
                        style={{
                          width: `${Math.min(100, (item.quantity / item.safeThreshold) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
