import React, { useState, useEffect, useCallback } from 'react';
import FeedbackForm from './components/FeedbackForm';
import FeedbackBoard from './components/FeedbackBoard';
import StatsPanel from './components/StatsPanel';

export interface Feedback {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
}

export interface Stats {
  byCategory: { category: string; count: number }[];
  byStatus: { status: string; count: number }[];
  total: number;
}

const API_BASE = '/api';

function App() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<Stats>({ byCategory: [], byStatus: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/feedback`);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data);
      }
    } catch (e) {
      console.error('Failed to fetch feedbacks:', e);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/feedback/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchFeedbacks(), fetchStats()]);
    setLoading(false);
  }, [fetchFeedbacks, fetchStats]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const pending = feedbacks.filter((f) => f.status === '待处理');
  const inProgress = feedbacks.filter((f) => f.status === '处理中');
  const done = feedbacks.filter((f) => f.status === '已完成');

  return (
    <div className="app">
      <header className="app-header">
        <h1>📋 用户反馈管理看板</h1>
        <div className="header-stats">
          <span>总计 {stats.total}</span>
          <span>待处理 {pending.length}</span>
          <span>处理中 {inProgress.length}</span>
          <span>已完成 {done.length}</span>
        </div>
      </header>

      <main className="app-body">
        <section className="form-section">
          <FeedbackForm onSubmitted={refreshAll} />
        </section>

        <section className="board-section">
          <h2 className="section-title">📌 反馈看板</h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
              加载中...
            </div>
          ) : (
            <FeedbackBoard
              pending={pending}
              inProgress={inProgress}
              done={done}
              onStatusChange={refreshAll}
              onDelete={refreshAll}
            />
          )}
        </section>

        <section className="stats-section">
          <h2 className="section-title">📊 统计分析</h2>
          <StatsPanel stats={stats} onRefresh={fetchStats} />
        </section>
      </main>
    </div>
  );
}

export default App;
