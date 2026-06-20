import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { adminApi } from '../services/api';
import type { AdminStats, Department } from '../types';
import './AdminDashboard.css';

const GRADIENT_COLORS = ['#3B82F6', '#6366F1', '#A855F7'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, deptData] = await Promise.all([
          adminApi.getStats(selectedDept || undefined),
          adminApi.getDepartments()
        ]);
        setStats(statsData);
        setDepartments(deptData);
      } catch (error) {
        console.error('Failed to fetch admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDept]);

  const difficultyData = stats
    ? [
        { name: '简单', value: stats.difficultyDistribution.easy, color: GRADIENT_COLORS[0] },
        { name: '中等', value: stats.difficultyDistribution.medium, color: GRADIENT_COLORS[1] },
        { name: '困难', value: stats.difficultyDistribution.hard, color: GRADIENT_COLORS[2] }
      ]
    : [];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="dashboard-header"
        >
          <h1 className="dashboard-title">管理员看板</h1>
          <div className="dept-filter">
            <label htmlFor="department">部门筛选：</label>
            <select
              id="department"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="dept-select"
            >
              <option value="">全部部门</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="stats-cards"
            >
              <div className="stat-card">
                <div className="stat-icon completion">✓</div>
                <div className="stat-info">
                  <span className="stat-label">测验完成率</span>
                  <motion.span
                    key={`completion-${selectedDept}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="stat-value"
                  >
                    {((stats?.completionRate || 0) * 100).toFixed(1)}%
                  </motion.span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon accuracy">📊</div>
                <div className="stat-info">
                  <span className="stat-label">平均正确率</span>
                  <motion.span
                    key={`accuracy-${selectedDept}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="stat-value"
                  >
                    {((stats?.avgAccuracy || 0) * 100).toFixed(1)}%
                  </motion.span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon total">📝</div>
                <div className="stat-info">
                  <span className="stat-label">答题总数</span>
                  <motion.span
                    key={`total-${selectedDept}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="stat-value"
                  >
                    {Object.values(stats?.difficultyDistribution || {}).reduce(
                      (a, b) => a + b,
                      0
                    )}
                    题
                  </motion.span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="chart-card"
            >
              <h2 className="chart-title">难度分布</h2>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={difficultyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      animationDuration={500}
                      animationEasing="ease-in-out"
                      barSize={60}
                    >
                      {difficultyData.map((entry, index) => (
                        <defs key={`def-${index}`}>
                          <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                            <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                          </linearGradient>
                        </defs>
                      ))}
                      {difficultyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#gradient-${index})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend">
                {difficultyData.map((item, index) => (
                  <div key={index} className="legend-item">
                    <span
                      className="legend-dot"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="legend-label">{item.name}</span>
                    <span className="legend-value">{item.value}题</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
