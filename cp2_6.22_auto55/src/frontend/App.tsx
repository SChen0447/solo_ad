import { useState, useEffect } from 'react';
import OrderForm from './OrderForm';
import OrderList from './OrderList';
import InventoryBoard from './InventoryBoard';
import type { Order, RentalItem } from '@/types';
import './styles/App.css';

type Page = 'order' | 'list' | 'inventory';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('order');
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error('获取订单失败:', err);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('获取物品失败:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchItems();
  }, []);

  const handleOrderCreated = () => {
    fetchOrders();
    fetchItems();
  };

  const handleOrderUpdated = () => {
    fetchOrders();
    fetchItems();
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'order':
        return <OrderForm items={items} onOrderCreated={handleOrderCreated} />;
      case 'list':
        return <OrderList orders={orders} onOrderUpdated={handleOrderUpdated} />;
      case 'inventory':
        return <InventoryBoard items={items} onItemsUpdated={fetchItems} />;
      default:
        return null;
    }
  };

  const menuItems: { key: Page; label: string; icon: string }[] = [
    { key: 'order', label: '客户下单', icon: '📝' },
    { key: 'list', label: '订单审核', icon: '✅' },
    { key: 'inventory', label: '库存看板', icon: '📦' },
  ];

  return (
    <div className="app-container">
      <button
        className="hamburger-btn"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>

      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>租赁管理系统</h2>
        </div>
        <ul className="menu-list">
          {menuItems.map((item) => (
            <li key={item.key}>
              <button
                className={`menu-item ${currentPage === item.key ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage(item.key);
                  setMenuOpen(false);
                }}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="main-content fade-in" key={currentPage}>
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
