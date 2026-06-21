import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import StockDashboard from './StockDashboard';
import SupplierPanel from './SupplierPanel';
import PurchaseOrder from './PurchaseOrder';
import IngredientDetail from './IngredientDetail';

export type PageType = 'stock' | 'suppliers' | 'orders';

interface AppContextType {
  refreshFlag: number;
  triggerRefresh: () => void;
  selectedIngredientId: string | null;
  setSelectedIngredientId: (id: string | null) => void;
  showIngredientDetail: (id: string) => void;
  currentPage: PageType;
  navigateTo: (page: PageType) => void;
}

const AppContext = createContext<AppContextType>(null!);
export const useApp = () => useContext(AppContext);

export default function App() {
  const [page, setPage] = useState<PageType>('stock');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);

  const triggerRefresh = useCallback(() => setRefreshFlag((f) => f + 1), []);

  const showIngredientDetail = useCallback((id: string) => {
    setSelectedIngredientId(id);
  }, []);

  const navigateTo = useCallback((p: PageType) => {
    setPage(p);
    setMobileMenuOpen(false);
  }, []);

  const ctxValue: AppContextType = {
    refreshFlag,
    triggerRefresh,
    selectedIngredientId,
    setSelectedIngredientId,
    showIngredientDetail,
    currentPage: page,
    navigateTo,
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems: Array<{ key: PageType; label: string; icon: string }> = [
    { key: 'stock', label: '库存管理', icon: '📦' },
    { key: 'suppliers', label: '供应商管理', icon: '🏪' },
    { key: 'orders', label: '采购单', icon: '📋' },
  ];

  return (
    <AppContext.Provider value={ctxValue}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav
          style={{
            height: 56,
            backgroundColor: 'white',
            borderBottom: '1px solid #E5E7EB',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            padding: '0 32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <span style={{ fontSize: 24 }}>☕</span>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#1F2937' }}>
              咖啡馆库存管家
            </span>
          </div>

          <div style={{ display: 'none', alignItems: 'center', gap: 4 }} className="desktop-nav">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setPage(item.key)}
                style={{
                  padding: '16px 20px',
                  backgroundColor: 'transparent',
                  color: page === item.key ? '#F97316' : '#6B7280',
                  fontWeight: page === item.key ? 600 : 500,
                  fontSize: 14,
                  borderBottom: page === item.key ? '2px solid #F97316' : '2px solid transparent',
                  marginBottom: '-1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            style={{
              display: 'none',
              fontSize: 22,
              padding: '8px 12px',
              background: 'transparent',
            }}
            className="hamburger-btn"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div
            style={{
              backgroundColor: 'white',
              borderBottom: '1px solid #E5E7EB',
              padding: '8px 16px',
            }}
            className="mobile-menu"
          >
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setPage(item.key);
                  setMobileMenuOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '12px 16px',
                  textAlign: 'left',
                  borderRadius: 8,
                  backgroundColor: page === item.key ? '#FFF7ED' : 'transparent',
                  color: page === item.key ? '#F97316' : '#374151',
                  fontWeight: page === item.key ? 600 : 400,
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        <main
          style={{
            flex: 1,
            padding: '24px 32px',
            maxWidth: 1280,
            width: '100%',
            margin: '0 auto',
          }}
        >
          {page === 'stock' && <StockDashboard />}
          {page === 'suppliers' && <SupplierPanel />}
          {page === 'orders' && <PurchaseOrder />}
        </main>

        <style>{`
          @media (max-width: 768px) {
            .desktop-nav { display: none !important; }
            .hamburger-btn { display: block !important; }
            main { padding: 16px !important; }
            nav { padding: 0 16px !important; }
          }
        `}</style>
      </div>

      {selectedIngredientId && (
        <IngredientDetail
          ingredientId={selectedIngredientId}
          onClose={() => setSelectedIngredientId(null)}
        />
      )}
    </AppContext.Provider>
  );
}
