import { useState, useEffect } from 'react';
import axios from 'axios';
import AuctionList from './components/AuctionList';
import BiddingPanel from './components/BiddingPanel';
import ChartDashboard from './components/ChartDashboard';

export interface AuctionItem {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
  startingPrice: number;
  currentPrice: number;
  bidCount: number;
  remainingTime: number;
  currentBidder: string;
}

function App() {
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedItem = items.find((item) => item.id === selectedItemId) || null;

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await axios.get<AuctionItem[]>('/api/items');
        setItems(response.data);
        if (response.data.length > 0) {
          setSelectedItemId(response.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch items:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prevItems) =>
        prevItems.map((item) => ({
          ...item,
          remainingTime: Math.max(0, item.remainingTime - 1),
        }))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
  };

  const handleBidUpdate = (updatedItem: Partial<AuctionItem> & { id: string }) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === updatedItem.id ? { ...item, ...updatedItem } : item
      )
    );
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="spinner"></div>
          <span>正在加载拍卖品...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>实时竞拍平台</h1>
        <p>探索珍品 · 实时竞价 · 尽在掌握</p>
      </header>

      <div className="main-layout">
        <div>
          <AuctionList
            items={items}
            selectedItemId={selectedItemId}
            onSelectItem={handleSelectItem}
          />
        </div>

        <div className="bidding-panel">
          {selectedItem ? (
            <>
              <BiddingPanel
                item={selectedItem}
                onBidUpdate={handleBidUpdate}
              />
              <ChartDashboard itemId={selectedItem.id} />
            </>
          ) : (
            <div className="glass-card no-selection">
              <div className="no-selection-icon">🔨</div>
              <h2>请选择一件拍卖品</h2>
              <p>从左侧列表中选择您感兴趣的商品，开始参与竞价</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
