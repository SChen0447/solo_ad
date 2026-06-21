import React, { useState, useEffect } from 'react';
import type { DashboardStats } from '../types';
import { api } from '../utils/storage';
import '../styles/Dashboard.css';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = stats
    ? [
        {
          icon: '📅',
          label: '今日预约',
          value: stats.todayAppointments,
          valueSuffix: '个',
          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          growth: stats.todayAppointmentsGrowth,
        },
        {
          icon: '💰',
          label: '本周收入',
          value: stats.weekRevenue,
          valuePrefix: '¥',
          gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          growth: stats.weekRevenueGrowth,
        },
        {
          icon: '🔔',
          label: '待处理服务',
          value: stats.pendingCount,
          valueSuffix: '个',
          gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          growth: stats.pendingCountGrowth,
        },
        {
          icon: '👥',
          label: '客户总数',
          value: stats.totalCustomers,
          valueSuffix: '位',
          gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          growth: stats.totalCustomersGrowth,
        },
      ]
    : [];

  const formatGrowth = (growth: number): string => {
    const abs = Math.abs(growth).toFixed(1);
    return `${abs}%`;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">数据概览</h2>
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card card">
            <div
              className="stat-icon"
              style={{ background: stat.gradient }}
            >
              <span className="stat-icon-emoji">{stat.icon}</span>
            </div>
            <div className="stat-value">
              {stat.valuePrefix || ''}
              {stat.value}
              {stat.valueSuffix || ''}
            </div>
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-growth ${stat.growth >= 0 ? 'positive' : 'negative'}`}>
              <span className="stat-growth-arrow">
                {stat.growth >= 0 ? '↑' : '↓'}
              </span>
              <span className="stat-growth-value">
                {formatGrowth(stat.growth)}
              </span>
              <span className="stat-growth-label">较上周</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
