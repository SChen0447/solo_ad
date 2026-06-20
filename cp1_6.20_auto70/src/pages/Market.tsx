import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMarket, getWatchlist, addWatchlist, removeWatchlist, StockQuote } from '../api';
import StockRow from '../components/StockRow';
import websocket from '../websocket';

function Market() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockQuote[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sortField, setSortField] = useState<'symbol' | 'change_percent'>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleUpdate = (data: any) => {
      setStocks(prev => {
        const newStocks = prev.map(item => {
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
        return newStocks;
      });
    };

    websocket.onMessage('stock_update', handleUpdate);
    return () => websocket.offMessage('stock_update', handleUpdate);
  }, []);

  const fetchData = async () => {
    try {
      const [marketData, watchlistData] = await Promise.all([
        getMarket(),
        getWatchlist()
      ]);
      setStocks(marketData);
      setWatchlist(watchlistData.map(s => s.symbol));
    } catch (err) {
      console.error('Failed to fetch market data:', err);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await getMarket(value);
        setSearchResults(results.slice(0, 5));
        setShowDropdown(true);
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300);
  };

  const handleSearchSelect = (symbol: string) => {
    setShowDropdown(false);
    setSearchQuery('');
    navigate(`/trade/${symbol}`);
  };

  const handleAddWatchlist = async (symbol: string) => {
    try {
      await addWatchlist(symbol);
      setWatchlist(prev => [...prev, symbol]);
    } catch (err: any) {
      alert(err.response?.data?.error || '添加失败');
    }
  };

  const handleRemoveWatchlist = async (symbol: string) => {
    try {
      await removeWatchlist(symbol);
      setWatchlist(prev => prev.filter(s => s !== symbol));
    } catch (err) {
      console.error('Remove failed:', err);
    }
  };

  const handleSort = (field: 'symbol' | 'change_percent') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedStocks = useMemo(() => {
    const sorted = [...stocks];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'symbol') {
        comparison = a.symbol.localeCompare(b.symbol);
      } else {
        comparison = a.change_percent - b.change_percent;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [stocks, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: 'symbol' | 'change_percent' }) => {
    if (sortField !== field) return <span className="sort-indicator">⇅</span>;
    return <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>市场行情</h2>

      <div className="search-box">
        <input
          type="text"
          placeholder="搜索股票代码或名称..."
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => searchQuery && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        />
        {showDropdown && searchResults.length > 0 && (
          <div className="search-dropdown">
            {searchResults.map(stock => (
              <div
                key={stock.symbol}
                className="search-item"
                onMouseDown={() => handleSearchSelect(stock.symbol)}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>{stock.symbol}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>{stock.name}</div>
                </div>
                <div className={stock.change_percent >= 0 ? 'price-green' : 'price-red'}>
                  {stock.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <table className="stock-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('symbol')}>
              股票 <SortIcon field="symbol" />
            </th>
            <th>最新价</th>
            <th onClick={() => handleSort('change_percent')}>
              涨跌幅 <SortIcon field="change_percent" />
            </th>
            <th>成交量</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {sortedStocks.map(stock => (
            <StockRow
              key={stock.symbol}
              stock={stock}
              onAddWatchlist={handleAddWatchlist}
              onRemoveWatchlist={handleRemoveWatchlist}
              isInWatchlist={watchlist.includes(stock.symbol)}
              showActions={true}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Market;
