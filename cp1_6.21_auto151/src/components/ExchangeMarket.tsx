import { useState, useEffect, useCallback } from 'react';
import { api, type InventoryItem, type User, type ExchangeResponse } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';

interface MarketItem extends InventoryItem {
  username: string;
}

interface ExchangeMarketProps {
  currentUser: User | null;
}

type ExchangeStatus = 'idle' | 'pending' | 'success' | 'failed';

function ExchangeMarket({ currentUser }: ExchangeMarketProps) {
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [myInventory, setMyInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null);
  const [selectedOfferCrop, setSelectedOfferCrop] = useState<InventoryItem | null>(null);
  const [offerQuantity, setOfferQuantity] = useState(1);
  const [requestQuantity, setRequestQuantity] = useState(1);
  const [exchangeStatus, setExchangeStatus] = useState<ExchangeStatus>('idle');
  const [exchangeResult, setExchangeResult] = useState<ExchangeResponse | null>(null);
  const [pendingExchanges, setPendingExchanges] = useState<ExchangeResponse[]>([]);
  
  const { messages, clearMessages } = useWebSocket(currentUser?.id || null);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const [market, inventory, exchanges] = await Promise.all([
        api.getMarket(currentUser.id),
        api.getInventory(currentUser.id),
        api.getExchanges(currentUser.id),
      ]);
      setMarketItems(market as MarketItem[]);
      setMyInventory(inventory);
      setPendingExchanges(exchanges.filter(e => e.status === 'pending' && e.toUser.id === currentUser.id));
    } catch (error) {
      console.error('加载市场数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (messages.length > 0) {
      const latest = messages[messages.length - 1];
      
      if (latest.type === 'exchange_request') {
        setPendingExchanges(prev => [...prev, latest.data]);
        loadData();
      } else if (latest.type === 'exchange_accepted') {
        setExchangeResult(latest.data);
        setExchangeStatus('success');
        loadData();
      } else if (latest.type === 'exchange_rejected') {
        setExchangeResult(latest.data);
        setExchangeStatus('failed');
        loadData();
      }
      
      setTimeout(() => clearMessages(), 100);
    }
  }, [messages, clearMessages, loadData]);

  const handleOpenExchange = (item: MarketItem) => {
    setSelectedItem(item);
    setRequestQuantity(1);
    if (myInventory.length > 0) {
      setSelectedOfferCrop(myInventory[0]);
      setOfferQuantity(1);
    }
    setExchangeStatus('idle');
    setExchangeResult(null);
    setShowExchangeModal(true);
  };

  const handleSubmitExchange = async () => {
    if (!currentUser || !selectedItem || !selectedOfferCrop) return;

    setExchangeStatus('pending');
    try {
      const result = await api.requestExchange(
        currentUser.id,
        selectedItem.userId,
        selectedOfferCrop.cropId,
        offerQuantity,
        selectedItem.cropId,
        requestQuantity
      );
      setExchangeResult(result);
    } catch (error: any) {
      alert(error.message || '交换申请失败');
      setExchangeStatus('idle');
    }
  };

  const handleAcceptExchange = async (exchangeId: string) => {
    try {
      await api.acceptExchange(exchangeId);
      await loadData();
      setExchangeStatus('success');
      setTimeout(() => setExchangeStatus('idle'), 2000);
    } catch (error: any) {
      alert(error.message || '接受交换失败');
    }
  };

  const handleRejectExchange = async (exchangeId: string) => {
    try {
      await api.rejectExchange(exchangeId);
      await loadData();
    } catch (error: any) {
      alert(error.message || '拒绝交换失败');
    }
  };

  const handleCloseStatusModal = () => {
    setExchangeStatus('idle');
    setExchangeResult(null);
  };

  if (loading) {
    return (
      <div>
        <h2 className="page-title">🔄 交换市场</h2>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">🔄 交换市场</h2>

      {pendingExchanges.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--text-dark)' }}>
            📬 待处理的交换请求 ({pendingExchanges.length})
          </h3>
          <div className="market-grid">
            {pendingExchanges.map(exchange => (
              <div key={exchange.id} className="crop-card pulse">
                <div className="crop-card-header">
                  <div style={{ fontSize: '1.5rem' }}>
                    {exchange.offer.cropEmoji} ↔ {exchange.request.cropEmoji}
                  </div>
                  <span className="plot-status-badge status-claimed">待确认</span>
                </div>
                <div className="crop-card-body">
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-medium)' }}>
                    <strong>{exchange.fromUser.username}</strong> 想用
                  </p>
                  <p style={{ fontSize: '0.9rem', margin: '4px 0' }}>
                    {exchange.offer.cropEmoji} {exchange.offer.cropName} × {exchange.offer.quantity}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-medium)' }}>
                    换你的
                  </p>
                  <p style={{ fontSize: '0.9rem', margin: '4px 0' }}>
                    {exchange.request.cropEmoji} {exchange.request.cropName} × {exchange.request.quantity}
                  </p>
                </div>
                <div className="crop-card-footer">
                  <button 
                    className="btn btn-primary"
                    style={{ marginBottom: '6px' }}
                    onClick={() => handleAcceptExchange(exchange.id)}
                  >
                    ✓ 接受
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleRejectExchange(exchange.id)}
                  >
                    ✗ 拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--text-dark)' }}>
        🌾 可交换的作物
      </h3>
      
      {marketItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-emoji">🏪</div>
          <p>暂时没有可交换的作物</p>
          <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
            快去种植收获，再来交换吧！
          </p>
        </div>
      ) : (
        <div className="market-grid list-scroll">
          {marketItems.map(item => (
            <div key={item.id} className="crop-card">
              <div className="crop-card-header">
                <div className="crop-card-emoji">{item.cropEmoji}</div>
                <div className="crop-card-name">{item.cropName}</div>
              </div>
              <div className="crop-card-body">
                <div className="crop-quantity">{item.quantity}</div>
                <div className="crop-quantity-label">剩余数量</div>
              </div>
              <div className="crop-card-footer">
                <div className="crop-owner">拥有者：{item.username}</div>
                <button 
                  className="exchange-btn"
                  onClick={() => handleOpenExchange(item)}
                >
                  🤝 申请交换
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showExchangeModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowExchangeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">🤝 发起交换</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '2.5rem' }}>{selectedOfferCrop?.cropEmoji || '?'}</div>
                <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                  {selectedOfferCrop?.cropName || '选择作物'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                  <button 
                    onClick={() => setOfferQuantity(Math.max(1, offerQuantity - 1))}
                    style={{ 
                      width: '28px', height: '28px', borderRadius: '50%', 
                      border: 'none', background: '#E0E0E0', cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '1.2rem', fontWeight: '600', minWidth: '30px', textAlign: 'center' }}>
                    {offerQuantity}
                  </span>
                  <button 
                    onClick={() => setOfferQuantity(Math.min(selectedOfferCrop?.quantity || 1, offerQuantity + 1))}
                    style={{ 
                      width: '28px', height: '28px', borderRadius: '50%', 
                      border: 'none', background: 'var(--grass-green)', color: 'white',
                      cursor: 'pointer', fontSize: '1rem'
                    }}
                  >
                    +
                  </button>
                </div>
                {selectedOfferCrop && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-medium)', marginTop: '4px' }}>
                    我的库存: {selectedOfferCrop.quantity}
                  </p>
                )}
              </div>
              
              <div style={{ fontSize: '1.5rem' }}>→</div>
              
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '2.5rem' }}>{selectedItem.cropEmoji}</div>
                <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>{selectedItem.cropName}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                  <button 
                    onClick={() => setRequestQuantity(Math.max(1, requestQuantity - 1))}
                    style={{ 
                      width: '28px', height: '28px', borderRadius: '50%', 
                      border: 'none', background: '#E0E0E0', cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '1.2rem', fontWeight: '600', minWidth: '30px', textAlign: 'center' }}>
                    {requestQuantity}
                  </span>
                  <button 
                    onClick={() => setRequestQuantity(Math.min(selectedItem.quantity, requestQuantity + 1))}
                    style={{ 
                      width: '28px', height: '28px', borderRadius: '50%', 
                      border: 'none', background: 'var(--grass-green)', color: 'white',
                      cursor: 'pointer', fontSize: '1rem'
                    }}
                  >
                    +
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-medium)', marginTop: '4px' }}>
                  对方库存: {selectedItem.quantity}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-dark)' }}>
                选择你要交换出去的作物：
              </p>
              <div className="crop-selector" style={{ maxHeight: '150px' }}>
                {myInventory.length === 0 ? (
                  <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-medium)', padding: '20px' }}>
                    你还没有可交换的作物
                  </p>
                ) : (
                  myInventory.map(inv => (
                    <div
                      key={inv.id}
                      className={`crop-option ${selectedOfferCrop?.id === inv.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedOfferCrop(inv);
                        setOfferQuantity(Math.min(inv.quantity, 1));
                      }}
                    >
                      <span className="crop-option-emoji">{inv.cropEmoji}</span>
                      <span className="crop-option-name">{inv.cropName}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-medium)' }}>×{inv.quantity}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowExchangeModal(false)}
              >
                取消
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSubmitExchange}
                disabled={!selectedOfferCrop || exchangeStatus === 'pending'}
              >
                {exchangeStatus === 'pending' ? '发送中...' : '发送申请'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(exchangeStatus === 'pending' || exchangeStatus === 'success' || exchangeStatus === 'failed') && (
        <div className="exchange-status-modal" onClick={handleCloseStatusModal}>
          <div className="status-panel" onClick={(e) => e.stopPropagation()}>
            {exchangeStatus === 'pending' && (
              <>
                <div className="status-icon">⏳</div>
                <div className="status-text">等待对方确认</div>
                <div className="status-subtext">交换申请已发送，正在等待对方回应...</div>
              </>
            )}
            {exchangeStatus === 'success' && (
              <>
                <div className="status-icon">🎉</div>
                <div className="status-text">交换成功！</div>
                <div className="status-subtext">双方库存已更新</div>
                <button 
                  className="btn btn-primary"
                  style={{ marginTop: '20px' }}
                  onClick={handleCloseStatusModal}
                >
                  好的
                </button>
              </>
            )}
            {exchangeStatus === 'failed' && (
              <>
                <div className="status-icon">😔</div>
                <div className="status-text">交换失败</div>
                <div className="status-subtext">对方拒绝了你的交换请求</div>
                <button 
                  className="btn btn-secondary"
                  style={{ marginTop: '20px' }}
                  onClick={handleCloseStatusModal}
                >
                  知道了
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ExchangeMarket;
