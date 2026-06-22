import React, { useState, useEffect, lazy, Suspense } from 'react';
import { apiClient, Track, Equipment } from '@/api/apiClient';

const PlaylistManager = lazy(() => import('@/modules/playlist/PlaylistManager'));
const VotePanel = lazy(() => import('@/modules/vote/VotePanel'));
const EquipmentGrid = lazy(() => import('@/modules/equipment/EquipmentGrid'));

type TabKey = 'playlist' | 'vote' | 'equipment';

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'playlist', label: '曲目编排', icon: '🎵' },
  { key: 'vote', label: '返场投票', icon: '🗳️' },
  { key: 'equipment', label: '设备库存', icon: '🎸' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('playlist');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  useEffect(() => {
    apiClient.playlist.getAll().then(setTracks).catch(console.error);
    apiClient.equipment.getAll().then(setEquipment).catch(console.error);
  }, []);

  const renderContent = () => {
    return (
      <Suspense
        fallback={
          <div className="loading">
            <div className="loading-spinner" />
            <span style={{ color: '#9CA3AF' }}>加载中...</span>
          </div>
        }
      >
        {activeTab === 'playlist' && (
          <PlaylistManager tracks={tracks} onTracksChange={setTracks} />
        )}
        {activeTab === 'vote' && (
          <VotePanel tracks={tracks} />
        )}
        {activeTab === 'equipment' && (
          <EquipmentGrid equipment={equipment} onEquipmentChange={setEquipment} />
        )}
      </Suspense>
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🎶</span>
            <span className="logo-text">LiveMusic</span>
          </div>
          <nav className="tab-nav">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`tab-item ${activeTab === tab.key ? 'active' : ''} ripple`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-content">
        {renderContent()}
      </main>

      <style>{`
        .app {
          min-height: 100vh;
          background: #1E1B4B;
          color: #E5E7EB;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .app-header {
          height: 64px;
          background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%);
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .header-inner {
          max-width: 1200px;
          margin: 0 auto;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-icon {
          font-size: 28px;
        }
        .logo-text {
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, #C084FC, #6366F1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .tab-nav {
          display: flex;
          gap: 4px;
          height: 100%;
          align-items: center;
        }
        @media (max-width: 768px) {
          .tab-nav {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .tab-nav::-webkit-scrollbar {
            display: none;
          }
        }
        .tab-item {
          width: 150px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          background: transparent;
          color: #9CA3AF;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 8px 8px 0 0;
          position: relative;
          transition: color 0.2s;
          flex-shrink: 0;
        }
        .tab-item:hover {
          color: #C084FC;
        }
        .tab-item.active {
          color: #E5E7EB;
        }
        .tab-item.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: #6366F1;
          border-radius: 1px;
        }
        .tab-icon {
          font-size: 16px;
        }
        .app-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
          min-height: calc(100vh - 64px);
        }
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          gap: 16px;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(99, 102, 241, 0.2);
          border-top-color: #6366F1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
