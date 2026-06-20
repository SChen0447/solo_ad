import React, { useState } from 'react';
import PlantsPage from './pages/PlantsPage';
import CommunityPage from './pages/CommunityPage';
import ProfilePage from './pages/ProfilePage';

const tabs = [
  { key: 'plants', label: '植物', icon: '🌿' },
  { key: 'community', label: '社区', icon: '💬' },
  { key: 'profile', label: '我的', icon: '👤' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('plants');

  const renderPage = () => {
    switch (activeTab) {
      case 'plants': return <PlantsPage />;
      case 'community': return <CommunityPage />;
      case 'profile': return <ProfilePage />;
      default: return <PlantsPage />;
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F1F8E9' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {renderPage()}
      </div>
      <nav style={{
        height: 64,
        background: '#2E7D32',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.15)',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              padding: '6px 16px',
              position: 'relative',
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {activeTab === tab.key && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 24,
                height: 3,
                background: '#fff',
                borderRadius: 2,
              }} />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
