import React, { useState, useEffect } from 'react';
import { DashboardStats } from '../types';
import { apiFetch } from './App';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({ todayCheckIns: 0, popularCourse: '-', totalMembers: 0, availableCoaches: 0 });

  useEffect(() => {
    const load = () => {
      apiFetch<DashboardStats>('/dashboard').then(setStats).catch(() => {});
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    { label: '今日签到', value: stats.todayCheckIns, color: '#3B82F6', icon: '✅' },
    { label: '热门课程', value: stats.popularCourse, color: '#22C55E', icon: '🔥', isText: true },
    { label: '会员总数', value: stats.totalMembers, color: '#8B5CF6', icon: '👥' },
    { label: '教练空闲', value: stats.availableCoaches, color: '#F59E0B', icon: '🧘' },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: '#F1F5F9' }}>仪表盘</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {cards.map(card => (
          <div key={card.label} style={{
            width: 280,
            height: 160,
            borderRadius: 16,
            background: '#1E293B',
            borderBottom: `4px solid ${card.color}`,
            boxShadow: '0 4px 12px #00000040',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#F1F5F9', lineHeight: 1 }}>
              {(card as any).isText ? card.value : card.value}
            </div>
            <div style={{ fontSize: 14, color: '#94A3B8', marginTop: 8 }}>{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
