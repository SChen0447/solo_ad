import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';

const CheckIn = lazy(() => import('./pages/CheckIn'));
const Menu = lazy(() => import('./pages/Menu'));
const Recommendation = lazy(() => import('./pages/Recommendation'));
const Ranking = lazy(() => import('./pages/Ranking'));

export interface Customer {
  id: string;
  nickname: string;
  points: number;
  created_at: number;
}

const MOCK_CUSTOMER_ID = 'CUST001';

function App() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const location = useLocation();

  useEffect(() => {
    const cachedCustomer = localStorage.getItem('cafe_customer');
    if (cachedCustomer) {
      setCustomer(JSON.parse(cachedCustomer));
    } else {
      fetchCustomer();
    }
  }, []);

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${MOCK_CUSTOMER_ID}`);
      if (response.ok) {
        const data = await response.json();
        setCustomer(data);
        localStorage.setItem('cafe_customer', JSON.stringify(data));
      }
    } catch (error) {
      console.error('获取顾客信息失败:', error);
    }
  };

  const updateCustomer = (newCustomer: Customer) => {
    setCustomer(newCustomer);
    localStorage.setItem('cafe_customer', JSON.stringify(newCustomer));
  };

  const navItems = [
    { path: '/', label: '签到', icon: '📱' },
    { path: '/menu', label: '菜单', icon: '☕' },
    { path: '/recommendation', label: '推荐', icon: '✨' },
    { path: '/ranking', label: '排行', icon: '🏆' },
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">☕</span>
            <span className="logo-text">暖光咖啡馆</span>
          </div>
          <div className="points-display">
            <span className="points-label">积分</span>
            <span className="points-value">{customer?.points || 0}</span>
          </div>
        </div>
        <nav className="top-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="main-content">
        <Suspense
          fallback={
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>加载中...</p>
            </div>
          }
        >
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <CheckIn
                  customer={customer}
                  customerId={MOCK_CUSTOMER_ID}
                  onPointsUpdate={updateCustomer}
                />
              }
            />
            <Route
              path="/menu"
              element={
                <Menu
                  customerId={MOCK_CUSTOMER_ID}
                  onPointsUpdate={updateCustomer}
                />
              }
            />
            <Route
              path="/recommendation"
              element={<Recommendation customerId={MOCK_CUSTOMER_ID} />}
            />
            <Route path="/ranking" element={<Ranking />} />
          </Routes>
        </Suspense>
      </main>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <style>{`
        .app-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          max-width: 480px;
          margin: 0 auto;
          background: linear-gradient(180deg, #FFF8E7 0%, #F5DEB3 100%);
          position: relative;
        }

        .app-header {
          background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
          color: #FFF8E7;
          padding: 16px 20px 0;
          box-shadow: 0 2px 12px rgba(139, 69, 19, 0.3);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-icon {
          font-size: 28px;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 600;
        }

        .points-display {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 248, 231, 0.2);
          padding: 6px 12px;
          border-radius: 20px;
        }

        .points-label {
          font-size: 12px;
          opacity: 0.9;
        }

        .points-value {
          font-size: 18px;
          font-weight: 700;
          color: #FFD700;
        }

        .top-nav {
          display: none;
          gap: 8px;
          padding-bottom: 12px;
        }

        .nav-link {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 8px;
          border-radius: 8px;
          text-decoration: none;
          color: rgba(255, 248, 231, 0.7);
          transition: all 0.2s ease;
        }

        .nav-link.active {
          background: rgba(255, 248, 231, 0.2);
          color: #FFF8E7;
        }

        .nav-icon {
          font-size: 20px;
          margin-bottom: 4px;
        }

        .nav-label {
          font-size: 12px;
        }

        .main-content {
          flex: 1;
          padding: 20px;
          padding-bottom: 80px;
          overflow-y: auto;
        }

        .loading-container {
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

        .loading-container p {
          color: #8B4513;
          font-size: 14px;
        }

        .bottom-nav {
          display: flex;
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 480px;
          background: #FFF8E7;
          border-top: 1px solid #F5DEB3;
          box-shadow: 0 -2px 12px rgba(139, 69, 19, 0.1);
          z-index: 100;
        }

        .bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 0;
          text-decoration: none;
          color: #A0522D;
          transition: all 0.2s ease;
        }

        .bottom-nav-item.active {
          color: #8B4513;
        }

        .bottom-nav-item.active .bottom-nav-icon {
          transform: scale(1.1);
        }

        .bottom-nav-icon {
          font-size: 22px;
          margin-bottom: 2px;
          transition: transform 0.2s ease;
        }

        .bottom-nav-label {
          font-size: 11px;
          font-weight: 500;
        }

        @media (min-width: 768px) {
          .app-container {
            max-width: 768px;
          }

          .top-nav {
            display: flex;
          }

          .bottom-nav {
            display: none;
          }

          .main-content {
            padding-bottom: 40px;
          }
        }

        @media (min-width: 1024px) {
          .app-container {
            max-width: 1200px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
