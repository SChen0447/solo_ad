import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { StockQuote } from '../api';

interface StockRowProps {
  stock: StockQuote;
  onAddWatchlist?: (symbol: string) => void;
  onRemoveWatchlist?: (symbol: string) => void;
  isInWatchlist?: boolean;
  showActions?: boolean;
}

function StockRow({ stock, onAddWatchlist, onRemoveWatchlist, isInWatchlist, showActions = false }: StockRowProps) {
  const navigate = useNavigate();
  const [flashing, setFlashing] = useState(false);
  const prevPriceRef = useRef(stock.price);

  useEffect(() => {
    if (prevPriceRef.current !== stock.price) {
      prevPriceRef.current = stock.price;
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), 500);
      return () => clearTimeout(timer);
    }
  }, [stock.price]);

  const handleClick = () => {
    navigate(`/trade/${stock.symbol}`);
  };

  const changeClass = stock.change_percent >= 0 ? 'price-green' : 'price-red';
  const rowClass = stock.change_percent >= 0 ? 'positive-row' : 'negative-row';

  return (
    <tr className={`${rowClass} ${flashing ? 'row-flash' : ''}`} style={{ cursor: 'pointer' }} onClick={handleClick}>
      <td>
        <div style={{ fontWeight: 'bold' }}>{stock.symbol}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-gray)' }}>{stock.name}</div>
      </td>
      <td className={changeClass} style={{ fontWeight: 'bold' }}>
        <span className="number-roll" key={stock.price}>{stock.price.toFixed(2)}</span>
      </td>
      <td className={changeClass}>
        {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
      </td>
      <td>{(stock.volume / 10000).toFixed(0)}万</td>
      {showActions && (
        <td>
          <div className="btn-group">
            {isInWatchlist ? (
              <button
                className="btn btn-sm btn-red"
                onClick={(e) => { e.stopPropagation(); onRemoveWatchlist?.(stock.symbol); }}
              >
                移除
              </button>
            ) : (
              <button
                className="btn btn-sm btn-primary"
                onClick={(e) => { e.stopPropagation(); onAddWatchlist?.(stock.symbol); }}
              >
                加自选
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

export default StockRow;
