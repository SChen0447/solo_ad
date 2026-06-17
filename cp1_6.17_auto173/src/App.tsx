import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './modules/store/Store';
import CatalogPanel from './modules/catalog/CatalogPanel';
import BouquetEditor from './modules/bouquet/BouquetEditor';
import BouquetPreview from './modules/preview/BouquetPreview';
import CheckoutPage from './modules/checkout/CheckoutPage';
import AdminOrdersPage from './modules/admin/AdminOrdersPage';
import './styles/main.css';

const AppContent: React.FC = () => {
  const { state, dispatch } = useStore();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [state.currentPage]);

  const renderPage = () => {
    switch (state.currentPage) {
      case 'editor':
        return (
          <div className="main-layout">
            <CatalogPanel />
            <BouquetEditor />
            <BouquetPreview flowers={state.bouquet} />
          </div>
        );
      case 'checkout':
        return <CheckoutPage />;
      case 'order-detail':
        return <div>订单详情页</div>;
      case 'admin':
        return <AdminOrdersPage />;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo" onClick={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: 'editor' })}>
            <span className="logo-icon">💐</span>
            <span className="logo-text">花语定制</span>
          </div>
          <nav className="header-nav">
            <button
              className={`nav-btn ${state.currentPage === 'editor' ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: 'editor' })}
            >
              开始搭配
            </button>
            <button
              className={`nav-btn ${state.currentPage === 'admin' ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: 'admin' })}
            >
              订单管理
            </button>
            <button
              className="cart-btn"
              onClick={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: 'checkout' })}
            >
              <span className="cart-icon">🛒</span>
              {state.bouquet.length > 0 && (
                <span className="cart-badge">{state.bouquet.length}</span>
              )}
            </button>
          </nav>
        </div>
      </header>

      <main className={`app-main ${isTransitioning ? 'fade-in' : ''}`}>
        {renderPage()}
      </main>

      <footer className="app-footer">
        <p>© 2024 花语定制 - 用心传递每一份美好</p>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;
