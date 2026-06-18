import React from 'react';
import { Stats } from '../App';

const floatKeyframes = `
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(2px); }
  }
`;

interface StatCardProps {
  value: number;
  label: string;
}

function StatCard({ value, label }: StatCardProps) {
  return (
    <div
      style={{
        width: 220,
        height: 120,
        borderRadius: 16,
        background: 'linear-gradient(135deg, #e0f2fe, #ede9fe)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'float 4s ease-in-out infinite',
      }}
    >
      <span style={{ fontSize: 34, fontWeight: 700, color: '#1f2937' }}>{value}</span>
      <span style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{label}</span>
    </div>
  );
}

interface StatsPanelProps {
  stats: Stats;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <>
      <style>{floatKeyframes}</style>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
        <StatCard value={stats.totalProducts} label="总库存商品数" />
        <StatCard value={stats.pendingOrders} label="待处理订单数" />
        <StatCard value={stats.todayShipped} label="今日出库件数" />
      </div>
    </>
  );
}
