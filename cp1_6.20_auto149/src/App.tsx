import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import GardenMap from './garden/GardenMap';
import JournalTimeline from './journal/JournalTimeline';
import axios from 'axios';

const App = () => {
  const location = useLocation();
  const [userPoints, setUserPoints] = useState(100);
  const currentUserId = 1;

  useEffect(() => {
    fetchUserPoints();
  }, []);

  const fetchUserPoints = async () => {
    try {
      const response = await axios.get(`/api/points/${currentUserId}`);
      setUserPoints(response.data.points);
    } catch (error) {
      console.error('获取积分失败:', error);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5efe6' }}>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'linear-gradient(135deg, #2d5a37 0%, #4a7c59 100%)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🌱</span>
          <h1
            style={{
              color: '#fff',
              fontSize: '20px',
              fontWeight: 600,
            }}
          >
            社区花园共享管理系统
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              to="/"
              style={{
                color: location.pathname === '/' ? '#fff' : 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: location.pathname === '/' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                fontWeight: 500,
              }}
            >
              🏡 花园地图
            </Link>
            <Link
              to="/journal"
              style={{
                color: location.pathname === '/journal' ? '#fff' : 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: location.pathname === '/journal' ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                fontWeight: 500,
              }}
            >
              📖 种植日志
            </Link>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '6px 16px',
              borderRadius: '20px',
            }}
          >
            <span style={{ fontSize: '18px' }}>⭐</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={userPoints}
                initial={{ y: 0 }}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '16px',
                }}
              >
                {userPoints}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </nav>

      <main
        style={{
          paddingTop: '80px',
          minWidth: '360px',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingBottom: '40px',
          maxWidth: '1024px',
          margin: '0 auto',
        }}
      >
        <Routes>
          <Route
            path="/"
            element={
              <GardenMap
                userPoints={userPoints}
                setUserPoints={setUserPoints}
                currentUserId={currentUserId}
              />
            }
          />
          <Route
            path="/journal"
            element={
              <JournalTimeline
                userPoints={userPoints}
                setUserPoints={setUserPoints}
                currentUserId={currentUserId}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;
