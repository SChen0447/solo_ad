import React, { useState, useEffect, useRef } from 'react';

interface Customer {
  id: string;
  nickname: string;
  points: number;
  created_at: number;
}

interface DrinkStat {
  id: number;
  name: string;
  category: string;
  total_quantity: number | null;
  total_revenue: number | null;
}

interface SalesStats {
  total_orders: number;
  total_revenue: number;
  by_drink: DrinkStat[];
}

function Ranking() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ranking' | 'stats'>('ranking');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartDrawn = useRef(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'stats' && salesStats && canvasRef.current && !chartDrawn.current) {
      drawChart();
      chartDrawn.current = true;
    }
  }, [activeTab, salesStats]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rankingRes, statsRes] = await Promise.all([
        fetch('/api/ranking'),
        fetch('/api/stats/sales'),
      ]);

      if (rankingRes.ok) {
        const rankingData = await rankingRes.json();
        setCustomers(rankingData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setSalesStats(statsData);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !salesStats) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const topDrinks = salesStats.by_drink
      .filter((d) => d.total_quantity !== null)
      .slice(0, 6);

    if (topDrinks.length === 0) {
      ctx.fillStyle = '#A0522D';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无销售数据', width / 2, height / 2);
      return;
    }

    const maxValue = Math.max(...topDrinks.map((d) => d.total_quantity || 0));
    const barCount = topDrinks.length;
    const barWidth = (chartWidth - (barCount - 1) * 12) / barCount;

    ctx.strokeStyle = 'rgba(139, 69, 19, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#A0522D';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      const value = Math.round(maxValue - (maxValue / 4) * i);
      ctx.fillText(String(value), padding.left - 8, y + 4);
    }

    topDrinks.forEach((drink, index) => {
      const x = padding.left + index * (barWidth + 12);
      const value = drink.total_quantity || 0;
      const barHeight = (value / maxValue) * chartHeight;
      const y = padding.top + chartHeight - barHeight;

      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, '#8B4513');
      gradient.addColorStop(1, '#F5DEB3');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      const radius = 6;
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, y + barHeight);
      ctx.lineTo(x, y + barHeight);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#5D3A1A';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      const label = drink.name.length > 4 ? drink.name.slice(0, 4) + '..' : drink.name;
      ctx.fillText(label, x + barWidth / 2, height - padding.bottom + 20);
    });
  };

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
      case 2:
        return 'linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%)';
      case 3:
        return 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)';
      default:
        return '#F5DEB3';
    }
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="ranking-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
        <style>{`
          .ranking-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            gap: 16px;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #F5DEB3;
            border-top-color: #8B4513;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="ranking-page">
      <div className="page-header">
        <h2>排行榜</h2>
        <p>查看积分排行和销售统计</p>
      </div>

      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'ranking' ? 'active' : ''}`}
          onClick={() => setActiveTab('ranking')}
        >
          🏆 积分排行
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('stats');
            chartDrawn.current = false;
            setTimeout(drawChart, 50);
          }}
        >
          📊 销售统计
        </button>
      </div>

      {activeTab === 'ranking' && (
        <div className="ranking-list">
          {customers.map((customer, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;

            return (
              <div
                key={customer.id}
                className={`ranking-item ${isTop3 ? 'top3' : ''}`}
                style={{
                  animationDelay: `${index * 0.05}s`,
                  zIndex: customers.length - index,
                }}
              >
                <div
                  className="rank-badge"
                  style={{ background: getMedalColor(rank) }}
                >
                  {isTop3 ? (
                    <span className="medal-emoji">{getMedalEmoji(rank)}</span>
                  ) : (
                    <span className="rank-number">{rank}</span>
                  )}
                </div>
                <div className="customer-avatar" style={{ background: `hsl(${index * 40}, 60%, 70%)` }}>
                  {customer.nickname.charAt(0)}
                </div>
                <div className="customer-info">
                  <span className="customer-name">{customer.nickname}</span>
                  <span className="customer-id">ID: {customer.id}</span>
                </div>
                <div className="customer-points">
                  <span className="points-value">{customer.points}</span>
                  <span className="points-label">积分</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="stats-content">
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <span className="stat-value">{salesStats?.total_orders || 0}</span>
                <span className="stat-label">总订单数</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <span className="stat-value">
                  ¥{(salesStats?.total_revenue || 0).toFixed(2)}
                </span>
                <span className="stat-label">总销售额</span>
              </div>
            </div>
          </div>

          <div className="chart-section">
            <h3>饮品销量排行</h3>
            <div className="chart-container">
              <canvas ref={canvasRef} className="sales-chart"></canvas>
            </div>
          </div>

          <div className="drink-stats-list">
            <h3>饮品销售详情</h3>
            {salesStats?.by_drink.slice(0, 6).map((drink, index) => (
              <div key={drink.id} className="drink-stat-item">
                <span className="stat-rank">{index + 1}</span>
                <span className="stat-name">{drink.name}</span>
                <span className="stat-qty">{drink.total_quantity || 0} 杯</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .ranking-page {
          animation: fadeInUp 0.3s ease;
          padding-bottom: 20px;
        }

        .page-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .page-header h2 {
          color: #8B4513;
          font-size: 24px;
          margin-bottom: 6px;
        }

        .page-header p {
          color: #A0522D;
          font-size: 13px;
          opacity: 0.8;
        }

        .tab-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: rgba(255, 255, 255, 0.5);
          padding: 6px;
          border-radius: 12px;
        }

        .tab-btn {
          flex: 1;
          padding: 12px 16px;
          background: transparent;
          color: #A0522D;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .tab-btn.active {
          background: #8B4513;
          color: #FFF8E7;
          box-shadow: 0 2px 8px rgba(139, 69, 19, 0.3);
        }

        .ranking-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .ranking-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: #fff;
          border-radius: 12px;
          margin-bottom: -8px;
          box-shadow: 0 2px 8px rgba(139, 69, 19, 0.08);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          animation: fadeInUp 0.5s ease backwards;
        }

        .ranking-item.top3 {
          transform: translateY(-(3 - (parseInt(String(0))) * 4));
          box-shadow: 0 4px 16px rgba(139, 69, 19, 0.15);
          position: relative;
        }

        .ranking-item.top3:nth-child(1) {
          transform: translateY(-8px);
          box-shadow: 0 8px 24px rgba(255, 215, 0, 0.3);
        }

        .ranking-item.top3:nth-child(2) {
          transform: translateY(-4px);
          box-shadow: 0 6px 20px rgba(192, 192, 192, 0.3);
        }

        .ranking-item.top3:nth-child(3) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(205, 127, 50, 0.3);
        }

        .rank-badge {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .medal-emoji {
          font-size: 20px;
        }

        .rank-number {
          font-size: 14px;
          font-weight: 700;
          color: #8B4513;
        }

        .customer-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          flex-shrink: 0;
        }

        .customer-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .customer-name {
          font-size: 15px;
          font-weight: 600;
          color: #5D3A1A;
        }

        .customer-id {
          font-size: 11px;
          color: #A0522D;
          opacity: 0.6;
        }

        .customer-points {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .points-value {
          font-size: 20px;
          font-weight: 700;
          color: #8B4513;
        }

        .points-label {
          font-size: 11px;
          color: #A0522D;
          opacity: 0.7;
        }

        .stats-content {
          animation: fadeIn 0.3s ease;
        }

        .stats-cards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 2px 8px rgba(139, 69, 19, 0.08);
        }

        .stat-icon {
          font-size: 36px;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #8B4513;
        }

        .stat-label {
          font-size: 12px;
          color: #A0522D;
          opacity: 0.8;
        }

        .chart-section {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(139, 69, 19, 0.08);
        }

        .chart-section h3 {
          color: #8B4513;
          font-size: 16px;
          margin-bottom: 16px;
        }

        .chart-container {
          width: 100%;
          height: 200px;
        }

        .sales-chart {
          width: 100%;
          height: 100%;
        }

        .drink-stats-list {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(139, 69, 19, 0.08);
        }

        .drink-stats-list h3 {
          color: #8B4513;
          font-size: 16px;
          margin-bottom: 16px;
        }

        .drink-stat-item {
          display: flex;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(139, 69, 19, 0.08);
        }

        .drink-stat-item:last-child {
          border-bottom: none;
        }

        .stat-rank {
          width: 24px;
          height: 24px;
          background: #F5DEB3;
          color: #8B4513;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          margin-right: 12px;
        }

        .drink-stat-item:first-child .stat-rank {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: #fff;
        }

        .stat-name {
          flex: 1;
          font-size: 14px;
          color: #5D3A1A;
        }

        .stat-qty {
          font-size: 14px;
          font-weight: 600;
          color: #8B4513;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (min-width: 768px) {
          .ranking-list {
            max-width: 600px;
            margin: 0 auto;
          }

          .stats-content {
            max-width: 600px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  );
}

export default Ranking;
