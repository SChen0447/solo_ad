import { useState, useEffect } from 'react';
import { getPortfolio, getWatchlist } from '../api';
import { Portfolio, StockQuote } from '../api';
import StockRow from '../components/StockRow';
import websocket from '../websocket';

function formatNumber(num: number): string {
  if (Math.abs(num) >= 100000000) {
    return (num / 100000000).toFixed(2) + '亿';
  } else if (Math.abs(num) >= 10000) {
    return (num / 10000).toFixed(2) + '万';
  }
  return num.toFixed(2);
}

function StatCard({ label, value, change, changePercent }: { label: string; value: number; change?: number; changePercent?: number }) {
  const isPositive = (change ?? 0) >= 0;

  return (
    <div className="glass-card stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        <span className="number-roll" key={value}>
          ¥{formatNumber(value)}
        </span>
      </div>
      {change !== undefined && changePercent !== undefined && (
        <div className={`stat-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [watchlist, setWatchlist] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleUpdate = (data: any) => {
      setWatchlist(prev => {
        return prev.map(item => {
          if (item.symbol === data.symbol) {
            return {
              ...item,
              price: data.price,
              change: data.change,
              change_percent: data.change_percent,
              volume: data.volume
            };
          }
          return item;
        });
      });
    };

    websocket.onMessage('stock_update', handleUpdate);
    return () => websocket.offMessage('stock_update', handleUpdate);
  }, []);

  const fetchData = async () => {
    try {
      const [portfolioData, watchlistData] = await Promise.all([
        getPortfolio(),
        getWatchlist()
      ]);
      setPortfolio(portfolioData);
      setWatchlist(watchlistData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>;
  }

  if (!portfolio) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>暂无数据</div>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>仪表盘</h2>

      <div className="dashboard-grid">
        <StatCard label="总资产" value={portfolio.total_assets} change={portfolio.total_profit} changePercent={portfolio.total_profit_percent} />
        <StatCard label="今日盈亏" value={Math.abs(portfolio.today_pl)} change={portfolio.today_pl} changePercent={portfolio.total_profit_percent * 0.1} />
        <StatCard label="持仓市值" value={portfolio.total_value} change={portfolio.total_profit * 0.8} changePercent={portfolio.total_profit_percent * 0.8} />
        <StatCard label="可用资金" value={portfolio.cash} />
      </div>

      <div className="watchlist-section">
        <div className="watchlist-header">
          <h3>自选股</h3>
          <span style={{ color: 'var(--text-gray)', fontSize: '14px' }}>共 {watchlist.length} 只</span>
        </div>
        {watchlist.length > 0 ? (
          <table className="stock-table">
            <thead>
              <tr>
                <th>股票</th>
                <th>最新价</th>
                <th>涨跌幅</th>
                <th>成交量</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map(stock => (
                <StockRow key={stock.symbol} stock={stock} />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-gray)' }}>
            暂无自选股，前往行情页面添加
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
