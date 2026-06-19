import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { Friend } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface LeaderboardProps {
  friends: Friend[];
  loading: boolean;
}

const REDUCTION_TIPS = [
  '尝试每周1-2天骑自行车通勤，既能减排又能锻炼身体！',
  '距离3公里以内的出行，建议选择步行或共享单车。',
  '拼车出行可以将人均碳排放降低50%以上。',
  '地铁是中长距离通勤的最佳低碳选择。',
  '电动车出行碳排放仅为私家车的4%，性价比极高。',
  '定期保养车辆可以降低10-15%的油耗和碳排放。',
  '提前规划路线，避免拥堵路段，减少怠速排放。',
];

function FriendDetailModal({
  friend,
  onClose,
}: {
  friend: Friend;
  onClose: () => void;
}) {
  const reductionPercent = friend.lastMonthEmission > 0
    ? ((friend.lastMonthEmission - friend.monthlyEmission) / friend.lastMonthEmission * 100)
    : 0;

  const tip = useMemo(() => {
    const index = Math.floor(Math.random() * REDUCTION_TIPS.length);
    return REDUCTION_TIPS[index];
  }, []);

  const chartData = useMemo(() => {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return {
      labels: days,
      datasets: [
        {
          label: '碳排放 (kg)',
          data: friend.weeklyData,
          backgroundColor: 'rgba(46, 125, 50, 0.7)',
          borderRadius: 6,
          hoverBackgroundColor: '#2E7D32',
        },
      ],
    };
  }, [friend.weeklyData]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 600,
      easing: 'easeOutCubic' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: { raw: number }) => `${context.raw.toFixed(2)} kg CO₂`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 12,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: (value: number | string) => `${value} kg`,
        },
      },
    },
  }), []);

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="friend-avatar" style={{ width: '56px', height: '56px' }}>
              <img src={friend.avatar} alt={friend.name} />
            </div>
            <div>
              <h3>{friend.name}</h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                本月排放 {friend.monthlyEmission.toFixed(1)} kg
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="form-label" style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
          📊 本周碳排分布
        </div>
        <div className="chart-container" style={{ height: '200px' }}>
          <Bar data={chartData} options={chartOptions} />
        </div>

        <div className="tip-card">
          <div className="tip-label">💡 减排小贴士</div>
          <div className="tip-content">{tip}</div>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: reductionPercent >= 0 ? 'rgba(102, 187, 106, 0.1)' : 'rgba(239, 83, 80, 0.1)',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>较上月</span>
          <span style={{
            fontWeight: '700',
            fontSize: '18px',
            color: reductionPercent >= 0 ? 'var(--success)' : 'var(--danger)',
          }}>
            {reductionPercent >= 0 ? '↓' : '↑'} {Math.abs(reductionPercent).toFixed(1)}%
            {reductionPercent >= 0 ? ' 减排' : ' 增排'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Leaderboard({ friends, loading }: LeaderboardProps) {
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  if (loading) {
    return (
      <div className="card">
        <h2 className="card-title">🏆 好友排行榜</h2>
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="card">
        <h2 className="card-title">🏆 好友排行榜</h2>
        <div className="empty-state">
          <div className="icon">👥</div>
          <p>暂无好友数据</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2 className="card-title">🏆 好友排行榜</h2>
        <div className="leaderboard-list">
          {friends.map((friend, index) => {
            const reductionPercent = friend.lastMonthEmission > 0
              ? ((friend.lastMonthEmission - friend.monthlyEmission) / friend.lastMonthEmission * 100)
              : 0;
            const isReduced = reductionPercent >= 0;

            return (
              <div
                key={friend.id}
                className="friend-card"
                onClick={() => setSelectedFriend(friend)}
              >
                <div className={`friend-rank ${index < 3 ? `top-${index + 1}` : ''}`}>
                  {index + 1}
                </div>
                <div className="friend-avatar">
                  <img src={friend.avatar} alt={friend.name} />
                </div>
                <div className="friend-info">
                  <div className="friend-name">{friend.name}</div>
                  <div className="friend-emission">
                    {friend.monthlyEmission.toFixed(1)} kg / 月
                  </div>
                </div>
                <div className={`friend-change ${isReduced ? 'down' : 'up'}`}>
                  {isReduced ? (
                    <>
                      <span className="arrow-down" />
                      {reductionPercent.toFixed(1)}%
                    </>
                  ) : (
                    <>
                      <span className="arrow-up" />
                      {Math.abs(reductionPercent).toFixed(1)}%
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedFriend && (
        <FriendDetailModal
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
        />
      )}
    </>
  );
}
