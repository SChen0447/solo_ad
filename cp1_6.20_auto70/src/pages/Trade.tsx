import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { getQuote, getKline, placeOrder } from '../api';
import { StockQuote } from '../api';
import websocket from '../websocket';

function Trade() {
  const { symbol } = useParams<{ symbol: string }>();
  const [stock, setStock] = useState<StockQuote | null>(null);
  const [klineData, setKlineData] = useState<number[][]>([]);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  useEffect(() => {
    if (symbol) {
      fetchData(symbol);
    }
  }, [symbol]);

  useEffect(() => {
    const handleUpdate = (data: any) => {
      if (data.symbol === symbol) {
        setStock(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            price: data.price,
            change: data.change,
            change_percent: data.change_percent,
            volume: data.volume
          };
        });
      }
    };

    websocket.onMessage('stock_update', handleUpdate);
    return () => websocket.offMessage('stock_update', handleUpdate);
  }, [symbol]);

  const fetchData = async (sym: string) => {
    try {
      const [quoteData, kline] = await Promise.all([
        getQuote(sym),
        getKline(sym)
      ]);
      setStock(quoteData);
      setKlineData(kline);
      setPrice(quoteData.price.toString());
    } catch (err) {
      console.error('Failed to fetch stock data:', err);
    }
  };

  const handleSubmit = async (type: 'buy' | 'sell') => {
    if (!stock || !price || !quantity) return;

    try {
      const result = await placeOrder({
        symbol: stock.symbol,
        type,
        price: parseFloat(price),
        quantity: parseInt(quantity)
      });
      setModalData(result);
      setShowModal(true);
      setQuantity('');
    } catch (err: any) {
      alert(err.response?.data?.error || '交易失败');
    }
  };

  const getOption = () => ({
    backgroundColor: '#1a1a2e',
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    grid: {
      left: '10%',
      right: '10%',
      top: '10%',
      bottom: '15%'
    },
    xAxis: {
      type: 'category',
      data: klineData.map(_ => ''),
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#a0a0b0' }
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#a0a0b0' },
      splitLine: { lineStyle: { color: '#2a2a3e' } }
    },
    dataZoom: [
      { type: 'inside', start: 50, end: 100 },
      { show: true, type: 'slider', bottom: '3%', start: 50, end: 100, height: 20 }
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        data: klineData.map(item => [item[1], item[2], item[4], item[3]]),
        itemStyle: {
          color: '#00d4aa',
          color0: '#e74c3c',
          borderColor: '#00d4aa',
          borderColor0: '#e74c3c'
        }
      }
    ]
  });

  if (!stock) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>;
  }

  const priceClass = stock.change_percent >= 0 ? 'price-green' : 'price-red';

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>股票交易</h2>

      <div className="price-display">
        <div className="symbol-name">{stock.symbol} {stock.name}</div>
        <div className={`current-price ${priceClass}`}>
          <span className="number-roll" key={stock.price}>
            {stock.price.toFixed(2)}
          </span>
        </div>
        <div className={priceClass}>
          {stock.change_percent >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%)
        </div>
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '30px', color: 'var(--text-gray)', fontSize: '14px' }}>
          <div>开盘: <span style={{ color: 'var(--text-white)' }}>{stock.open.toFixed(2)}</span></div>
          <div>最高: <span style={{ color: 'var(--text-white)' }}>{stock.high.toFixed(2)}</span></div>
          <div>最低: <span style={{ color: 'var(--text-white)' }}>{stock.low.toFixed(2)}</span></div>
          <div>昨收: <span style={{ color: 'var(--text-white)' }}>{stock.prev_close.toFixed(2)}</span></div>
          <div>成交量: <span style={{ color: 'var(--text-white)' }}>{(stock.volume / 10000).toFixed(0)}万</span></div>
        </div>
      </div>

      <div className="trade-layout">
        <div>
          <div className="kline-chart">
            <h3 style={{ color: 'var(--accent-gold)', marginBottom: '15px' }}>日K线</h3>
            <ReactECharts option={getOption()} style={{ height: '400px' }} notMerge={true} lazyUpdate={false} />
          </div>

          <div className="order-book">
            <div>
              <h4>卖盘</h4>
              {stock.order_book?.asks.slice().reverse().map((ask, i) => (
                <div key={i} className="order-book-row">
                  <span className="price-red">卖{5 - i}</span>
                  <span className="price-red">{ask.price.toFixed(2)}</span>
                  <span>{ask.quantity}</span>
                </div>
              ))}
            </div>
            <div>
              <h4>买盘</h4>
              {stock.order_book?.bids.map((bid, i) => (
                <div key={i} className="order-book-row">
                  <span className="price-green">买{i + 1}</span>
                  <span className="price-green">{bid.price.toFixed(2)}</span>
                  <span>{bid.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="trade-form">
            <h3>交易下单</h3>
            <div className="form-group">
              <label>价格</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="输入价格"
              />
            </div>
            <div className="form-group">
              <label>数量</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="输入数量"
              />
            </div>
            {price && quantity && (
              <div style={{ padding: '12px', background: 'rgba(243, 156, 18, 0.1)', borderRadius: '8px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-gray)' }}>预估金额</span>
                  <span style={{ fontWeight: 'bold' }}>¥{(parseFloat(price) * parseInt(quantity || '0')).toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="btn-group">
              <button
                className="btn btn-green"
                onClick={() => handleSubmit('buy')}
                disabled={!price || !quantity}
              >
                买入
              </button>
              <button
                className="btn btn-red"
                onClick={() => handleSubmit('sell')}
                disabled={!price || !quantity}
              >
                卖出
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && modalData && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-enter" onClick={e => e.stopPropagation()}>
            <h3>✓ 交易成功</h3>
            <p>
              成交价 <strong>{modalData.price.toFixed(2)}</strong>，
              数量 <strong>{modalData.quantity}</strong>，
              总额 <strong>¥{modalData.total.toFixed(2)}</strong>
            </p>
            <button className="btn btn-primary" onClick={() => setShowModal(false)}>确定</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Trade;
