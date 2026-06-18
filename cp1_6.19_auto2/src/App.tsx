import { useEffect, useCallback } from 'react';
import { useStore } from './store';
import BottleList from './components/BottleList';
import BottleDetail from './components/BottleDetail';
import Modal from './components/Modal';
import './index.css';

export default function App() {
  const {
    initializeData,
    refreshData,
    toggleModal,
    setIsMobile,
    isMobile,
    showDetail,
    selectedCardId
  } = useStore();

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  const handleThrowBottle = useCallback(() => {
    toggleModal(true);
  }, [toggleModal]);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-left">
          <div className="logo">
            <div className="bottle-icon">
              <div className="bottle-body" />
              <div className="bottle-neck" />
              <div className="bottle-cap" />
            </div>
            <span className="app-name">灵感漂流瓶</span>
          </div>
        </div>
        <div className="nav-right">
          <button className="throw-btn" onClick={handleThrowBottle}>
            🌊 扔瓶子
          </button>
        </div>
      </nav>

      <div className="main-content">
        <div
          className={`left-panel ${isMobile && showDetail ? 'hidden' : ''}`}
          style={{ width: isMobile ? '100%' : '280px' }}
        >
          <BottleList />
        </div>

        <div
          className={`right-panel ${
            isMobile
              ? showDetail
                ? 'drawer-visible'
                : 'drawer-hidden'
              : ''
          }`}
        >
          {(!isMobile || (isMobile && showDetail)) && selectedCardId && (
            <BottleDetail />
          )}
          {!isMobile && !selectedCardId && <BottleDetail />}
        </div>
      </div>

      <Modal />
    </div>
  );
}
