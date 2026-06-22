import React, { useState, useEffect, useCallback, memo } from 'react';
import type { DashboardStats } from '../types';
import { api } from '../utils/api';
import './Dashboard.css';

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: string;
  isAnimating?: boolean;
}

const StatCard: React.FC<StatCardProps> = memo(
  ({ label, value, icon, color, isAnimating }) => {
    return (
      <div className="stat-card" style={{ borderTopColor: color }}>
        <div className="stat-icon">{icon}</div>
        <div className="stat-content">
          <p className="stat-value">
            <span className={isAnimating ? 'value-animate' : ''}>{value}</span>
          </p>
          <p className="stat-label">{label}</p>
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalGifts: 0,
    exchangedGifts: 0,
    inTransitGifts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [animatingKey, setAnimatingKey] = useState(0);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getStats();
      setStats(data);
      setAnimatingKey((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">综合看板</h1>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="stats-grid">
          <StatCard
            key={`total-${animatingKey}`}
            label="总礼物数"
            value={stats.totalGifts}
            icon="🎁"
            color="#D4A373"
            isAnimating
          />
          <StatCard
            key={`exchanged-${animatingKey}`}
            label="已成功交换"
            value={stats.exchangedGifts}
            icon="🤝"
            color="#8B5CF6"
            isAnimating
          />
          <StatCard
            key={`transit-${animatingKey}`}
            label="运输中"
            value={stats.inTransitGifts}
            icon="📦"
            color="#3B82F6"
            isAnimating
          />
        </div>
      )}

      <div className="dashboard-welcome">
        <h2>欢迎来到漂流礼物</h2>
        <p>在这里，你可以登记你的礼物，与来自不同城市的朋友交换心意</p>
        <div className="feature-list">
          <div className="feature-item">
            <span className="feature-icon">📝</span>
            <div>
              <h3>礼物登记</h3>
              <p>记录你想要交换的礼物，支持多种类别分类</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <div>
              <h3>智能匹配</h3>
              <p>根据类别、城市、价值智能推荐交换对象</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🚚</span>
            <div>
              <h3>物流追踪</h3>
              <p>实时跟踪物流状态，记录每一次交换</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
