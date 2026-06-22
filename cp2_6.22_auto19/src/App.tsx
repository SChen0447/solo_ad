import React, { useState, lazy, Suspense } from 'react';
import './App.css';

const PlaylistManager = lazy(() => import('@/modules/playlist/PlaylistManager'));
const VotePanel = lazy(() => import('@/modules/vote/VotePanel'));
const EquipmentGrid = lazy(() => import('@/modules/equipment/EquipmentGrid'));

type TabType = 'playlist' | 'vote' | 'equipment';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('playlist');

  const tabs = [
    { key: 'playlist' as TabType, label: '曲目编排' },
    { key: 'vote' as TabType, label: '返场投票' },
    { key: 'equipment' as TabType, label: '设备库存' },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="app-logo">
            <span className="logo-icon">🎵</span>
            <span className="logo-text">Live Concert Manager</span>
          </div>
          <nav className="tab-nav">
            <div className="tab-list">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <main className="app-main">
        <div className="content-wrapper">
          <Suspense fallback={<div className="loading-suspense">加载中...</div>}>
            {activeTab === 'playlist' && <PlaylistManager />}
            {activeTab === 'vote' && <VotePanel />}
            {activeTab === 'equipment' && <EquipmentGrid />}
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default App;
