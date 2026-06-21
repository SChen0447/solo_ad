import { Routes, Route } from 'react-router-dom';
import RestaurantListPage from './pages/RestaurantListPage';
import DishListPage from './pages/DishListPage';

function Navbar() {
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: '20px', fontWeight: 700, color: '#2d3748' }}>
        🍽️ 虚拟食堂
      </span>
    </nav>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: '84px', paddingBottom: '24px', background: '#f7fafc', minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<RestaurantListPage />} />
          <Route path="/restaurant/:id" element={<DishListPage />} />
        </Routes>
      </div>
    </>
  );
}
