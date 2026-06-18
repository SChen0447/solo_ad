import { useStore } from './store/useStore';
import { InventoryPage } from './pages/InventoryPage';
import { RecommendPage } from './pages/RecommendPage';

export default function App() {
  const { currentPage, setCurrentPage } = useStore();

  return (
    <div style={appStyle}>
      <nav style={navStyle}>
        <div style={logoStyle}>
          <span style={{ fontSize: 28 }}>🍳</span>
          <span style={logoTextStyle}>智能菜谱推荐</span>
        </div>
        <div style={navBtnsStyle}>
          <button
            onClick={() => setCurrentPage('inventory')}
            style={{
              ...navBtnStyle,
              background: currentPage === 'inventory' ? '#F59E0B' : 'transparent',
              color: currentPage === 'inventory' ? '#fff' : '#57534E',
            }}
          >
            🥬 食材库存
          </button>
          <button
            onClick={() => setCurrentPage('recommend')}
            style={{
              ...navBtnStyle,
              background: currentPage === 'recommend' ? '#F59E0B' : 'transparent',
              color: currentPage === 'recommend' ? '#fff' : '#57534E',
            }}
          >
            🍽️ 菜谱推荐
          </button>
        </div>
      </nav>

      <main style={mainStyle}>
        {currentPage === 'inventory' ? <InventoryPage /> : <RecommendPage />}
      </main>

      <footer style={footerStyle}>
        <span style={{ color: '#9CA3AF', fontSize: 12 }}>
          Smart Recipe Recommender © 2025
        </span>
      </footer>
    </div>
  );
}

const appStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#FFF7ED',
  display: 'flex',
  flexDirection: 'column',
};

const navStyle: React.CSSProperties = {
  background: '#fff',
  padding: '14px 28px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  flexWrap: 'wrap',
  gap: 12,
};

const logoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const logoTextStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: '#D97706',
  letterSpacing: -0.5,
};

const navBtnsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
};

const navBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 10,
  border: 'none',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  maxWidth: 1200,
  width: '100%',
  margin: '0 auto',
  boxSizing: 'border-box',
};

const footerStyle: React.CSSProperties = {
  padding: 20,
  textAlign: 'center',
  borderTop: '1px solid #FED7AA',
};
