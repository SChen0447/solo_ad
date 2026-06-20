import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPortfolio } from '../api';
import { Portfolio as PortfolioType } from '../api';
import websocket from '../websocket';

function Portfolio() {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<PortfolioType | null>(null);
  const [sortField, setSortField] = useState<'name' | 'profit_percent'>('profit_percent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleUpdate = (data: any) => {
      setPortfolio(prev => {
        if (!prev) return prev;
        const updatedHoldings = prev.holdings.map(h => {
          if (h.symbol === data.symbol) {
            const newMarketValue = h.quantity * data.price;
            const newProfit = newMarketValue - h.quantity * h.cost_basis;
            const newProfitPercent = h.quantity * h.cost_basis > 0
              ? (newProfit / (h.quantity * h.cost_basis)) * 100
              : 0;
            return {
              ...h,
              current_price: data.price,
              market_value: Math.round(newMarketValue * 100) / 100,
              profit: Math.round(newProfit * 100) / 100,
              profit_percent: Math.round(newProfitPercent * 100) / 100
            };
          }
          return h;
        });

        const totalValue = updatedHoldings.reduce((sum, h) => sum + h.market_value, 0);
        const totalProfit = updatedHoldings.reduce((sum, h) => sum + h.profit, 0);
        const totalCost = updatedHoldings.reduce((sum, h) => sum + h.quantity * h.cost_basis, 0);

        return {
          ...prev,
          holdings: updatedHoldings,
          total_value: Math.round(totalValue * 100) / 100,
          total_assets: Math.round((prev.cash + totalValue) * 100) / 100,
          total_profit: Math.round(totalProfit * 100) / 100,
          total_profit_percent: totalCost > 0 ? Math.round((totalProfit / totalCost) * 10000) / 100 : 0
        };
      });
    };

    websocket.onMessage('stock_update', handleUpdate);
    return () => websocket.offMessage('stock_update', handleUpdate);
  }, []);

  const fetchData = async () => {
    try {
      const data = await getPortfolio();
      setPortfolio(data);
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
    }
  };

  const handleSort = (field: 'name' | 'profit_percent') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedHoldings = useMemo(() => {
    if (!portfolio) return [];
    const sorted = [...portfolio.holdings];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a.profit_percent - b.profit_percent;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [portfolio, sortField, sortDirection]);

  const handleAddPosition = (symbol: string) => {
    navigate(`/trade/${symbol}`);
  };

  const handleReducePosition = (symbol: string) => {
    navigate(`/trade/${symbol}`);
  };

  const exportCSV = () => {
    if (!portfolio) return;

    const headers = ['股票代码', '股票名称', '持仓数量', '成本价', '现价', '市值', '浮动盈亏', '盈亏百分比'];
    const rows = sortedHoldings.map(h => [
      h.symbol,
      h.name,
      h.quantity,
      h.cost_basis.toFixed(2),
      h.current_price.toFixed(2),
      h.market_value.toFixed(2),
      h.profit.toFixed(2),
      (h.profit_percent >= 0 ? '+' : '') + h.profit_percent.toFixed(2) + '%'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `持仓_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const SortIcon = ({ field }: { field: 'name' | 'profit_percent' }) => {
    if (sortField !== field) return <span className="sort-indicator">⇅</span>;
    return <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  if (!portfolio) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>我的持仓</h2>
        <button className="btn btn-primary" onClick={exportCSV}>导出持仓</button>
      </div>

      {portfolio.holdings.length > 0 ? (
        <>
          <table className="stock-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')}>
                  股票名称 <SortIcon field="name" />
                </th>
                <th>持仓数量</th>
                <th>成本价</th>
                <th>现价</th>
                <th>市值</th>
                <th onClick={() => handleSort('profit_percent')}>
                  浮动盈亏 <SortIcon field="profit_percent" />
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedHoldings.map(holding => (
                <tr
                  key={holding.symbol}
                  style={{
                    backgroundColor: holding.profit >= 0
                      ? 'rgba(46, 204, 113, 0.05)'
                      : 'rgba(231, 76, 60, 0.05)'
                  }}
                >
                  <td>
                    <div style={{ fontWeight: 'bold' }}>{holding.symbol}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>{holding.name}</div>
                  </td>
                  <td>{holding.quantity}</td>
                  <td>{holding.cost_basis.toFixed(2)}</td>
                  <td className={holding.profit >= 0 ? 'price-green' : 'price-red'}>
                    {holding.current_price.toFixed(2)}
                  </td>
                  <td>{holding.market_value.toFixed(2)}</td>
                  <td className={holding.profit >= 0 ? 'price-green' : 'price-red'}>
                    <div>{holding.profit >= 0 ? '+' : ''}{holding.profit.toFixed(2)}</div>
                    <div style={{ fontSize: '12px' }}>
                      ({holding.profit_percent >= 0 ? '+' : ''}{holding.profit_percent.toFixed(2)}%)
                    </div>
                  </td>
                  <td>
                    <div className="btn-group">
                      <button
                        className="btn btn-sm btn-green"
                        onClick={() => handleAddPosition(holding.symbol)}
                      >
                        加仓
                      </button>
                      <button
                        className="btn btn-sm btn-red"
                        onClick={() => handleReducePosition(holding.symbol)}
                      >
                        减仓
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="portfolio-summary">
            <div className="summary-item">
              <div className="summary-label">总盈亏</div>
              <div className={`summary-value ${portfolio.total_profit >= 0 ? 'price-green' : 'price-red'}`}>
                {portfolio.total_profit >= 0 ? '+' : ''}¥{portfolio.total_profit.toFixed(2)}
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">总收益率</div>
              <div className={`summary-value ${portfolio.total_profit_percent >= 0 ? 'price-green' : 'price-red'}`}>
                {portfolio.total_profit_percent >= 0 ? '+' : ''}{portfolio.total_profit_percent.toFixed(2)}%
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-gray)' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📊</div>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>暂无持仓</div>
          <div style={{ fontSize: '14px' }}>前往行情页面选择股票开始交易吧！</div>
        </div>
      )}
    </div>
  );
}

export default Portfolio;
